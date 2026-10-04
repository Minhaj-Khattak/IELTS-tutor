import os

GEMINI_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-3.8-flash",
    "gemini-3.1-flash-lite",
]
GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"

QUESTION_TYPES_TASK2 = [
    "agree_disagree",
    "discuss_both",
    "problem_solution",
    "advantages_disadvantages",
    "two_part",
]

TOPICS_TASK2 = [
    "technology and society", "environment and climate change", "education systems",
    "health and medicine", "urbanisation", "work and employment", "globalisation",
    "media and social media", "family and children", "transportation",
    "government and policy", "crime and justice", "arts and culture",
    "science and innovation", "sport and leisure",
]

REAL_COUNTRIES = [
    "Australia", "Canada", "Germany", "Japan", "United Kingdom",
    "United States", "France", "New Zealand", "South Korea", "Sweden",
    "Italy", "Spain", "Brazil", "India", "Norway", "Netherlands",
]

allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    allowed_origins.append(frontend_url.rstrip("/"))
