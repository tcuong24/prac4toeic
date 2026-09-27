import os
import json
import re
import time
import requests
from pathlib import Path
from typing import Dict, Any, Optional, List
from dotenv import load_dotenv
from logger import logger
from prompt_template import build_prompt

# Tải .env từ thư mục gốc dự án prac4toeic
ROOT_DIR = Path(__file__).resolve().parents[2]
ENV_PATH = ROOT_DIR / ".env"
if ENV_PATH.exists():
    load_dotenv(ENV_PATH)
else:
    load_dotenv()

DEFAULT_MODEL_POOL = [
    "gemini-3.8-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-flash-latest",
    "gemini-3.6-flash",
]

class GeminiListeningParser:
    def __init__(self, api_key: Optional[str] = None, models: Optional[List[str]] = None):
        self.api_key = (api_key or os.getenv("GEMINI_API_KEY", "")).strip()
        env_model = os.getenv("GEMINI_MODEL", "").strip()

        if models:
            self.model_pool = models
        elif env_model and env_model in DEFAULT_MODEL_POOL:
            self.model_pool = [env_model] + [m for m in DEFAULT_MODEL_POOL if m != env_model]
        else:
            self.model_pool = DEFAULT_MODEL_POOL.copy()

        self.current_idx = 0

        logger.info(f"[GEMINI] Khởi tạo bộ bóc tách hội thoại với {len(self.model_pool)} models:")
        for idx, m in enumerate(self.model_pool, 1):
            logger.info(f"  {idx}. {m}")

        if not self.api_key:
            logger.error("[GEMINI ERROR] GEMINI_API_KEY chưa được thiết lập trong file .env!")

    def parse_chunk(self, raw_text_chunk: str, part_hint: Optional[int] = None) -> List[Dict[str, Any]]:
        """Gửi raw_text_chunk tới Gemini với cơ chế xoay tua model để lấy dialogue turns."""
        prompt = build_prompt(raw_text_chunk, part_hint)
        max_attempts = len(self.model_pool)

        for _ in range(max_attempts):
            model_name = self.model_pool[self.current_idx]
            self.current_idx = (self.current_idx + 1) % len(self.model_pool)

            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={self.api_key}"
            headers = {"Content-Type": "application/json"}
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0.1,
                    "topP": 0.95,
                    "maxOutputTokens": 4096,
                },
            }

            try:
                logger.info(f"[GEMINI] Đang phân tích chunk với model: {model_name}...")
                resp = requests.post(url, headers=headers, json=payload, timeout=45)

                if resp.status_code == 429:
                    logger.warning(f"[GEMINI 429] Model {model_name} chạm rate limit. Chuyển sang model tiếp theo...")
                    time.sleep(1)
                    continue
                elif resp.status_code == 503:
                    logger.warning(f"[GEMINI 503] Model {model_name} bận. Chuyển sang model tiếp theo...")
                    time.sleep(1)
                    continue
                elif resp.status_code != 200:
                    logger.error(f"[GEMINI ERROR] HTTP {resp.status_code} ({model_name}): {resp.text[:200]}")
                    continue

                data = resp.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                parsed = self._extract_json(text)
                if parsed:
                    logger.info(f"[GEMINI OK] Đã trích xuất thành công {len(parsed)} đoạn hội thoại.")
                    return parsed
                else:
                    logger.warning(f"[GEMINI WARN] Model {model_name} trả về text nhưng không parse được JSON. Đang thử model khác...")

            except Exception as e:
                logger.error(f"[GEMINI EXCEPTION] Lỗi khi gọi model {model_name}: {e}")
                time.sleep(1)

        logger.error("[GEMINI FAIL] Toàn bộ model trong pool đều không trích xuất được chunk này.")
        return []

    def _extract_json(self, text: str) -> Optional[List[Dict[str, Any]]]:
        """Lọc và parse JSON array từ text trả về của LLM."""
        clean = text.strip()

        # Loại bỏ markdown code blocks
        if clean.startswith("```"):
            clean = re.sub(r"^```[a-zA-Z0-9_-]*\n?", "", clean)
            clean = re.sub(r"\n?```$", "", clean)
            clean = clean.strip()

        # Tìm block mảng JSON [ ... ]
        json_match = re.search(r"\[\s*\{.*\}\s*\]", clean, re.DOTALL)
        if json_match:
            clean = json_match.group(0)

        try:
            res = json.loads(clean)
            if isinstance(res, list):
                # Validate tối thiểu từng item
                valid = []
                for item in res:
                    if isinstance(item, dict) and "turns" in item:
                        valid.append(item)
                return valid
            elif isinstance(res, dict) and "turns" in res:
                return [res]
        except json.JSONDecodeError as e:
            logger.error(f"[JSON DECODE ERROR] {e}. Text: {clean[:200]}...")

        return None
