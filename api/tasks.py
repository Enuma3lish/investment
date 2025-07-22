# api/tasks.py
from celery import shared_task
from twstock import Stock, BestFourPoint
import httpx
import os
from django.core.cache import cache
import logging
import asyncio

logger = logging.getLogger(__name__)

CLAUDE_URL = os.getenv("MCP_CLAUDE_URL", "http://mcp:5001/claude")
GEMINI_URL = os.getenv("MCP_GEMINI_URL", "http://mcp:5001/gemini")


async def _call(url: str, prompt: str):
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(url, json={"prompt": prompt})
        r.raise_for_status()
        return r.json()


async def _llm_batch(prompt: str):
    # 真正的 coroutine
    return await asyncio.gather(
        _call(CLAUDE_URL, prompt),
        _call(GEMINI_URL, prompt),
    )


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=5, max_retries=3)
def analyze_stock(self, stock_id: str):
    logger.info("Analyze stock %s", stock_id)

    stock = Stock(stock_id)
    bfp = BestFourPoint(stock)
    tw_result = {
        "best_four_point": bfp.best_four_point(),
        "price": stock.price[-1] if stock.price else None,
    }

    prompt = f"請分析台股 {stock_id}，並提出買賣建議。"

    # 這裡正確呼叫 asyncio
    claude_json, gemini_json = asyncio.run(_llm_batch(prompt))

    result = {"twstock": tw_result, "claude": claude_json, "gemini": gemini_json}
    cache.set(f"analyze:{stock_id}", result, 60 * 30)
    return result
