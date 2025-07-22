from django.urls import path
from .views import (
    RegisterView,
    LoginView,
    LogoutView,
    BuyStockView,
    SellStockView,
    HoldingsView,
    TradeHistoryView,
    AnalyzeStockView,
    AnalyzeResultView,
    StockPriceLookupView,
)

urlpatterns = [
    path("auth/register/", RegisterView.as_view()),
    path("auth/login/", LoginView.as_view()),
    path("auth/logout/", LogoutView.as_view()),
    path("trade/buy/", BuyStockView.as_view()),
    path("trade/sell/", SellStockView.as_view()),
    path("holdings/", HoldingsView.as_view()),
    path("history/", TradeHistoryView.as_view()),
    path("analyze/", AnalyzeStockView.as_view()),
    path("analyze/<str:task_id>/", AnalyzeResultView.as_view()),
    path("price/", StockPriceLookupView.as_view()),
]
