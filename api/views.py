from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from twstock import Stock
from django.core.cache import cache
from celery.result import AsyncResult
from decimal import Decimal
import json

from .serializers import (
    RegisterSerializer, LoginSerializer,
    HoldingSerializer, TradeHistorySerializer,
    BuySerializer, SellSerializer,
    AnalyzeSerializer, PriceLookupSerializer,
)

from .models import VirtualHolding, TradeHistory
from .utils.trading_cache import (
    add_user_holding,
    get_user_holdings,
    remove_user_holding,
)
from .utils.sync_holdings import sync_holdings_to_postgres, sync_holdings_to_redis
from .tasks import analyze_stock


# Default cash balance for new users
DEFAULT_CASH_BALANCE = 1000000.0  # 1,000,000 NTD


def get_user_cash_balance(user_id):
    """Get user's current cash balance"""
    cache_key = f"user_cash:{user_id}"
    balance = cache.get(cache_key)
    if balance is None:
        # Initialize with default balance for new users
        balance = DEFAULT_CASH_BALANCE
        cache.set(cache_key, balance, 60 * 60 * 24)  # Cache for 24 hours
    return float(balance)


def update_user_cash_balance(user_id, amount):
    """Update user's cash balance"""
    cache_key = f"user_cash:{user_id}"
    current_balance = get_user_cash_balance(user_id)
    new_balance = current_balance + amount
    cache.set(cache_key, new_balance, 60 * 60 * 24)
    return new_balance


def get_stock_price_info(stock_id):
    """Get detailed stock price information"""
    try:
        stock = Stock(stock_id)
        
        # Get current price data
        current_price = stock.price[-1] if stock.price else 0
        open_price = stock.open[-1] if stock.open else current_price
        high_price = stock.high[-1] if stock.high else current_price  
        low_price = stock.low[-1] if stock.low else current_price
        volume = stock.capacity[-1] if stock.capacity else 0
        
        # Calculate price change
        change = 0
        change_percent = 0
        if len(stock.price) >= 2:
            previous_price = stock.price[-2]
            change = current_price - previous_price
            change_percent = (change / previous_price) * 100 if previous_price > 0 else 0
            
        return {
            "stock_id": stock_id,
            "price": current_price,
            "open": open_price,
            "high": high_price,
            "low": low_price,
            "volume": volume,
            "change": change,
            "change_percent": change_percent,
            "status": "success"
        }
    except Exception as e:
        return {
            "stock_id": stock_id,
            "error": str(e),
            "status": "error"
        }


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        ser = RegisterSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        
        user = ser.save()
        # Initialize user with default cash balance
        get_user_cash_balance(user.id)  # This will set default balance
        
        return Response({"msg": "registered"}, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        ser = LoginSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        user = authenticate(
            username=ser.validated_data["username"],
            password=ser.validated_data["password"],
        )
        if not user:
            return Response({"detail": "Invalid credentials"}, status=401)
        
        refresh = RefreshToken.for_user(user)
        sync_holdings_to_redis(user)
        
        # Ensure user has cash balance initialized
        cash_balance = get_user_cash_balance(user.id)
        
        return Response({
            "refresh": str(refresh), 
            "access": str(refresh.access_token),
            "cash_balance": cash_balance
        })


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            token = RefreshToken(request.data.get("refresh"))
            token.blacklist()
        except Exception:
            pass
        return Response({"msg": "logged out"})


class BuyStockView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ser = BuySerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

        stock_id = ser.validated_data["stock_id"]
        price = float(ser.validated_data["buy_price"])
        quantity = int(ser.validated_data["quantity"])
        
        # Calculate total cost
        total_cost = price * quantity

        # Check if user has enough cash
        user_cash = get_user_cash_balance(request.user.id)
        if user_cash < total_cost:
            return Response({
                "detail": f"Insufficient funds. You have NT${user_cash:,.2f} but need NT${total_cost:,.2f}"
            }, status=400)

        try:
            # Validate stock exists
            Stock(stock_id)
        except Exception:
            return Response({"detail": "Invalid stock ID"}, status=400)

        # Execute trade
        add_user_holding(request.user.id, {
            "stock_id": stock_id,
            "buy_price": price,
            "quantity": quantity,
        })

        # Deduct cash from user balance
        new_balance = update_user_cash_balance(request.user.id, -total_cost)

        # Record trade history
        TradeHistory.objects.create(
            user=request.user,
            stock_id=stock_id,
            side=TradeHistory.BUY,
            price=price,
            quantity=quantity,
        )
        
        return Response({
            "msg": "bought",
            "total_cost": total_cost,
            "remaining_cash": new_balance,
        })
   

class SellStockView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ser = SellSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

        stock_id = ser.validated_data["stock_id"]
        price = float(ser.validated_data["sell_price"])
        quantity = int(ser.validated_data["quantity"])
        
        # Calculate total proceeds
        total_proceeds = price * quantity

        try:
            # Remove holding (this will validate user has enough shares)
            remove_user_holding(request.user.id, stock_id, quantity)
        except Exception as e:
            return Response({"detail": str(e)}, status=400)

        # Add cash to user balance
        new_balance = update_user_cash_balance(request.user.id, total_proceeds)

        # Record trade history
        TradeHistory.objects.create(
            user=request.user,
            stock_id=stock_id,
            side=TradeHistory.SELL,
            price=price,
            quantity=quantity,
        )
        
        return Response({
            "msg": "sold",
            "total_proceeds": total_proceeds,
            "new_cash_balance": new_balance,
        })


class HoldingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        holdings = get_user_holdings(request.user.id)
        cash_balance = get_user_cash_balance(request.user.id)
        
        return Response({
            "holdings": holdings,
            "cash_balance": cash_balance,
            "user_id": request.user.id
        })

    def post(self, request):
        sync_holdings_to_postgres(request.user)
        return Response({"msg": "synced"})


class TradeHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = TradeHistory.objects.filter(user=request.user).order_by("-ts")
        return Response(TradeHistorySerializer(qs, many=True).data)


class AnalyzeStockView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ser = AnalyzeSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=400)

        stock_id = ser.validated_data["stock_id"]
        prompt = ser.validated_data["prompt"]
        
        # Validate stock exists and get basic info
        try:
            Stock(stock_id)
        except Exception:
            return Response({"detail": "Invalid stock ID"}, status=400)
        
        # Start analysis task with both stock_id and custom prompt
        task = analyze_stock.delay(stock_id, prompt)
        return Response({
            "task_id": task.id,
            "stock_id": stock_id,
            "prompt": prompt,
            "status": "started"
        })


class AnalyzeResultView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, task_id):
        res = AsyncResult(task_id)
        if res.successful():
            result = res.result
            # Add additional metadata to the response
            return Response({
                "status": "done",
                "result": {
                    "symbol": result.get("stock_id", ""),
                    "prompt": result.get("prompt", ""),
                    "twstock_analysis": result.get("twstock", {}),
                    "claude_opinion": result.get("claude", {}).get("response", ""),
                    "gemini_opinion": result.get("gemini", {}).get("response", ""),
                    "raw_data": result
                }
            })
        elif res.failed():
            return Response({
                "status": "failed",
                "error": str(res.result) if res.result else "Analysis failed"
            })
        else:
            return Response({"status": "pending"})


class StockPriceLookupView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        ser = PriceLookupSerializer(data=request.query_params)
        if not ser.is_valid():
            return Response(ser.errors, status=400)

        stock_id = ser.validated_data["stock_id"]
        
        # Get comprehensive stock information
        stock_info = get_stock_price_info(stock_id)
        
        if stock_info["status"] == "error":
            return Response({"detail": stock_info["error"]}, status=400)
            
        return Response(stock_info)


class UserBalanceView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get user's current cash balance"""
        cash_balance = get_user_cash_balance(request.user.id)
        return Response({
            "cash_balance": cash_balance,
            "user_id": request.user.id
        })
        
    def post(self, request):
        """Reset user's cash balance (for testing/demo)"""
        if request.data.get("reset") == True:
            cache_key = f"user_cash:{request.user.id}"
            cache.set(cache_key, DEFAULT_CASH_BALANCE, 60 * 60 * 24)
            return Response({
                "msg": "Balance reset",
                "new_balance": DEFAULT_CASH_BALANCE
            })
        return Response({"detail": "Invalid request"}, status=400)