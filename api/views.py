from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from twstock import Stock
from django.core.cache import cache
from celery.result import AsyncResult
from .serializers import BuySerializer, SellSerializer, AnalyzeSerializer, PriceLookupSerializer

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


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        ser = RegisterSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        ser.save()
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
        return Response({"refresh": str(refresh), "access": str(refresh.access_token)})


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
        price = ser.validated_data["buy_price"]
        quantity = ser.validated_data["quantity"]

        try:
            Stock(stock_id)
        except Exception:
            return Response({"detail": "invalid stock_id"}, status=400)

        add_user_holding(request.user.id, {
            "stock_id": stock_id,
            "buy_price": price,
            "quantity": quantity,
        })

        TradeHistory.objects.create(
            user=request.user,
            stock_id=stock_id,
            side=TradeHistory.BUY,
            price=price,
            quantity=quantity,
        )
        return Response({"msg": "bought"})
   
class SellStockView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ser = SellSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

        stock_id = ser.validated_data["stock_id"]
        price = ser.validated_data["sell_price"]
        quantity = ser.validated_data["quantity"]

        remove_user_holding(request.user.id, stock_id, quantity)
        TradeHistory.objects.create(
            user=request.user,
            stock_id=stock_id,
            side=TradeHistory.SELL,
            price=price,
            quantity=quantity,
        )
        return Response({"msg": "sold"})

class HoldingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        holdings = get_user_holdings(request.user.id)
        return Response(holdings)

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
        task = analyze_stock.delay(stock_id)
        return Response({"task_id": task.id})


class AnalyzeResultView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, task_id):
        res = AsyncResult(task_id)
        if res.successful():
            return Response(res.result)
        return Response({"state": res.state})


class StockPriceLookupView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        ser = PriceLookupSerializer(data=request.query_params)
        if not ser.is_valid():
            return Response(ser.errors, status=400)

        stock_id = ser.validated_data["stock_id"]
        try:
            stock = Stock(stock_id)
        except Exception:
            return Response({"detail": "invalid stock_id"}, status=400)
        price = stock.price[-1] if stock.price else None
        return Response({"stock_id": stock_id, "price": price})