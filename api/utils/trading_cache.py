# api/utils/trading_cache.py
from django.core.cache import cache
from typing import Dict, List

CACHE_KEY_FMT = "holdings:{user_id}"

def _key(user_id: int) -> str:
    return CACHE_KEY_FMT.format(user_id=user_id)

def get_user_holdings(user_id: int) -> List[Dict]:
    return cache.get(_key(user_id), [])

def add_user_holding(user_id: int, holding: Dict):
    holdings = get_user_holdings(user_id)
    holdings.append(holding)
    cache.set(_key(user_id), holdings, None)

def remove_user_holding(user_id: int, stock_id: str, quantity: int):
    holdings = get_user_holdings(user_id)
    new_list = []
    to_remove = quantity
    for h in holdings:
        if h["stock_id"] == stock_id and to_remove > 0:
            if h["quantity"] <= to_remove:
                to_remove -= h["quantity"]
                continue
            else:
                h["quantity"] -= to_remove
                to_remove = 0
        new_list.append(h)
    cache.set(_key(user_id), new_list, None)
