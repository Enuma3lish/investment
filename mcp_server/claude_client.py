# mcp_server/claude_client.py
import os
from anthropic import Anthropic

client = Anthropic(
    api_key=os.getenv("CLAUDE_API_KEY")
)

def call_claude(prompt: str) -> str:
    response = client.messages.create(
        model="claude-3-5-sonnet-latest",
        max_tokens=1024,
        temperature=0.7,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.content[0].text
