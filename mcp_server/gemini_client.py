# mcp_server/gemini_client.py
import os
from google.generativeai import GenerativeModel
import google.generativeai as genai

# Fix: Use GOOGLE_API_KEY to match your .env file
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

model = GenerativeModel("gemini-2.0-flash")

def call_gemini(prompt: str) -> str:
    response = model.generate_content(prompt)
    return response.text