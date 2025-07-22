import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

@pytest.mark.django_db
def test_buy_sell_flow():
    client = APIClient()

    # register
    r = client.post("/api/auth/register/", {"username":"t","password":"p123456"}, format="json")
    assert r.status_code == 201

    # login
    r = client.post("/api/auth/login/", {"username":"t","password":"p123456"}, format="json")
    assert r.status_code == 200
    access = r.data["access"]
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

    # buy
    r = client.post("/api/trade/buy/", {"stock_id":"2330","buy_price":100,"quantity":1}, format="json")
    assert r.status_code == 200

    # holdings
    r = client.get("/api/holdings/")
    assert r.status_code == 200
    assert len(r.data) == 1

    # sell
    r = client.post("/api/trade/sell/", {"stock_id":"2330","sell_price":110,"quantity":1}, format="json")
    assert r.status_code == 200

    # history
    r = client.get("/api/history/")
    assert r.status_code == 200
    assert len(r.data) == 2  # buy + sell
