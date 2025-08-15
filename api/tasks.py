# api/tasks.py
from celery import shared_task
from twstock import Stock, BestFourPoint
import httpx
import os
from django.core.cache import cache
import logging
import asyncio
import json

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


def get_stock_info(stock_id: str):
    """Get comprehensive stock information"""
    try:
        stock = Stock(stock_id)
        bfp = BestFourPoint(stock)
        
        # Get price data
        current_price = stock.price[-1] if stock.price else None
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
        
        # Technical analysis
        best_four_point = bfp.best_four_point()
        buy_signal = any(best_four_point) if best_four_point else None
        sell_signal = False  # You can implement sell signal logic here
        
        return {
            "price": current_price,
            "open": open_price,
            "high": high_price,
            "low": low_price,
            "volume": volume,
            "change": change,
            "change_percent": change_percent,
            "buy": buy_signal,
            "sell": sell_signal,
            "best_four_point": best_four_point,
            "summary": best_four_point if best_four_point else []
        }
    except Exception as e:
        logger.error("Error fetching stock data for %s: %s", stock_id, str(e))
        return {
            "error": f"Unable to fetch data for stock {stock_id}",
            "price": None,
            "best_four_point": None
        }


def format_ai_response(raw_response, ai_name):
    """Format AI response to be more human-readable"""
    try:
        if isinstance(raw_response, dict):
            # Extract the actual response text
            response_text = raw_response.get('response', '') or raw_response.get('result', '') or str(raw_response)
        else:
            response_text = str(raw_response)
        
        # Clean up the response
        response_text = response_text.strip()
        
        # If it's still JSON-like, try to extract meaningful content
        if response_text.startswith('{') and response_text.endswith('}'):
            try:
                parsed = json.loads(response_text)
                response_text = parsed.get('response', '') or parsed.get('analysis', '') or str(parsed)
            except:
                pass
        
        # If response is empty or too short, provide a fallback
        if not response_text or len(response_text.strip()) < 10:
            response_text = f"{ai_name} analysis is currently unavailable. Please try again later."
        
        return response_text
    except Exception as e:
        logger.error(f"Error formatting {ai_name} response: {str(e)}")
        return f"{ai_name} analysis encountered an error. Please try again."


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=5, max_retries=3)
def analyze_stock(self, stock_id: str, custom_prompt: str = None):
    logger.info("Analyze stock %s with custom prompt: %s", stock_id, custom_prompt)

    # Get comprehensive stock information
    tw_result = get_stock_info(stock_id)
    
    # Build context-rich prompt for AI
    stock_context = f"""
股票代號: {stock_id}
當前股價: NT${tw_result.get('price', 'N/A')}
今日漲跌: {tw_result.get('change', 0):.2f} ({tw_result.get('change_percent', 0):.2f}%)
成交量: {tw_result.get('volume', 'N/A')}
技術指標: {'買進信號' if tw_result.get('buy') else '無明確信號'}
"""

    # Use custom prompt if provided, otherwise use default
    if custom_prompt:
        prompt = f"""請以專業投資顧問的角度分析台股 {stock_id}。

股票基本資訊:
{stock_context}

用戶特定問題: {custom_prompt}

請提供詳細、實用的投資建議，包括:
1. 對用戶問題的直接回答
2. 技術面分析
3. 風險評估
4. 具體建議

請用繁體中文回答，語氣專業但易懂。"""
    else:
        prompt = f"""請以專業投資顧問的角度分析台股 {stock_id}。

股票基本資訊:
{stock_context}

請提供完整的投資分析，包括:
1. 股票基本面分析
2. 技術面分析
3. 市場趨勢判斷
4. 風險評估
5. 買賣建議

請用繁體中文回答，語氣專業但易懂。"""

    try:
        # Call AI services
        claude_json, gemini_json = asyncio.run(_llm_batch(prompt))
        
        # Format responses to be human-readable
        claude_formatted = format_ai_response(claude_json, "Claude")
        gemini_formatted = format_ai_response(gemini_json, "Gemini")
        
    except Exception as e:
        logger.error("Error calling LLM services: %s", str(e))
        claude_formatted = "Claude 分析服務暫時無法使用，請稍後再試。"
        gemini_formatted = "Gemini 分析服務暫時無法使用，請稍後再試。"

    result = {
        "stock_id": stock_id,
        "prompt": custom_prompt or "綜合投資分析",
        "twstock": tw_result, 
        "claude": {
            "response": claude_formatted,
            "raw": claude_json if 'claude_json' in locals() else None
        }, 
        "gemini": {
            "response": gemini_formatted,
            "raw": gemini_json if 'gemini_json' in locals() else None
        },
        "timestamp": str(self.request.called_directly),
        "analysis_type": "custom" if custom_prompt else "default"
    }
    
    # Cache the result for 30 minutes
    cache_key = f"analyze:{stock_id}:{hash(custom_prompt or 'default')}"
    cache.set(cache_key, result, 60 * 30)
    
    logger.info("Analysis completed for stock %s", stock_id)
    return result