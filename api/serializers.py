# api/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import VirtualHolding, TradeHistory

# ---------- Auth ----------
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = get_user_model()
        fields = ("username", "password")

    def create(self, validated_data):
        return get_user_model().objects.create_user(**validated_data)


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

# ---------- Trading / Holdings ----------
class HoldingSerializer(serializers.ModelSerializer):
    class Meta:
        model = VirtualHolding
        fields = ("id", "stock_id", "buy_price", "quantity", "buy_time")


class TradeHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = TradeHistory
        fields = ("id", "stock_id", "side", "price", "quantity", "ts")


class BuySerializer(serializers.Serializer):
    stock_id = serializers.CharField()
    buy_price = serializers.FloatField(min_value=0.00001)
    quantity = serializers.IntegerField(min_value=1)


class SellSerializer(serializers.Serializer):
    stock_id = serializers.CharField()
    sell_price = serializers.FloatField(min_value=0.00001)
    quantity = serializers.IntegerField(min_value=1)


class AnalyzeSerializer(serializers.Serializer):
    stock_id = serializers.CharField(max_length=10)
    prompt = serializers.CharField(max_length=1000, required=True)
    
    def validate_stock_id(self, value):
        """Validate Taiwan stock ID format"""
        if not value.isdigit() or len(value) != 4:
            raise serializers.ValidationError("Stock ID must be a 4-digit number")
        return value
    
    def validate_prompt(self, value):
        """Validate prompt is not empty"""
        if not value.strip():
            raise serializers.ValidationError("Prompt cannot be empty")
        return value.strip()


class PriceLookupSerializer(serializers.Serializer):
    stock_id = serializers.CharField()