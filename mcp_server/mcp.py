# mcp_server/mcp.py
from fastapi import FastAPI, Request
from pydantic import BaseModel
from claude_client import call_claude
from gemini_client import call_gemini

app = FastAPI()

class PromptRequest(BaseModel):
    prompt: str

@app.post("/claude")
async def claude_handler(request: PromptRequest):
    result = call_claude(request.prompt)
    return {"result": result}

@app.post("/gemini")
async def gemini_handler(request: PromptRequest):
    result = call_gemini(request.prompt)
    return {"result": result}
