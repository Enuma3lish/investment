from django.db import models
from django.conf import settings


class VirtualHolding(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    stock_id = models.CharField(max_length=10)
    buy_price = models.FloatField()
    quantity = models.IntegerField()
    buy_time = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.stock_id} x {self.quantity}"


class TradeHistory(models.Model):
    BUY = "BUY"
    SELL = "SELL"
    SIDE_CHOICES = [(BUY, "BUY"), (SELL, "SELL")]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    stock_id = models.CharField(max_length=10)
    side = models.CharField(max_length=4, choices=SIDE_CHOICES)
    price = models.FloatField()
    quantity = models.IntegerField()
    ts = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username}:{self.side} {self.stock_id} {self.quantity}@{self.price}"