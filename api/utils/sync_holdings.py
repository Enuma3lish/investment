# Fix for /app/api/utils/sync_holdings.py

from django.core.cache import cache
from api.models import VirtualHolding
import json
import time

def sync_holdings_to_redis(user):
    """Sync user holdings from PostgreSQL to Redis cache"""
    try:
        # Get all holdings for the user from database
        holdings = VirtualHolding.objects.filter(user=user)
        
        # Convert to the format expected by Redis
        data = [
            {
                "stock_id": h.stock_id,
                "buy_price": h.buy_price,
                "quantity": h.quantity,
                # FIX: Format datetime properly instead of using localtime()
                "buy_time": h.buy_time.strftime('%Y-%m-%d %H:%M:%S')
                # Alternative: "buy_time": h.buy_time.isoformat()
            }
            for h in holdings
        ]
        
        # Store in Redis with user-specific key
        cache_key = f"user_holdings_{user.id}"
        cache.set(cache_key, json.dumps(data), timeout=None)  # No expiration
        
        print(f"✅ Synced {len(data)} holdings to Redis for user {user.username}")
        
    except Exception as e:
        print(f"❌ Error syncing holdings to Redis: {str(e)}")
        # Don't raise the exception to prevent login failure
        pass

def sync_holdings_to_postgres(user):
    """Sync user holdings from Redis cache to PostgreSQL"""
    try:
        cache_key = f"user_holdings_{user.id}"
        cached_data = cache.get(cache_key)
        
        if not cached_data:
            print(f"No cached holdings found for user {user.username}")
            return
        
        holdings_data = json.loads(cached_data)
        
        # Clear existing holdings for user
        VirtualHolding.objects.filter(user=user).delete()
        
        # Create new holdings from cache
        for holding in holdings_data:
            # Parse the datetime string back to datetime object
            from datetime import datetime
            buy_time = datetime.strptime(holding['buy_time'], '%Y-%m-%d %H:%M:%S')
            
            VirtualHolding.objects.create(
                user=user,
                stock_id=holding['stock_id'],
                buy_price=holding['buy_price'],
                quantity=holding['quantity'],
                buy_time=buy_time
            )
        
        print(f"✅ Synced {len(holdings_data)} holdings to PostgreSQL for user {user.username}")
        
    except Exception as e:
        print(f"❌ Error syncing holdings to PostgreSQL: {str(e)}")
        # Don't raise the exception
        pass