import os
import sys
import json
import re
import time
import requests
from typing import Dict, Any, Optional, List
from logger import logger

# Danh sách các model đang hoạt động tốt nhất trên Google Generative AI API
DEFAULT_MODEL_POOL = [
    "gemini-3.8-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-flash-latest",
    "gemini-3.6-flash"
]

class GeminiEnricher:
    def __init__(self, api_key: Optional[str] = None, models: Optional[List[str]] = None):
        self.api_key = (api_key or os.getenv("GEMINI_API_KEY", "")).strip()
        env_model = os.getenv("GEMINI_MODEL", "").strip()

        # Ưu tiên model trong .env lên đầu pool, sau đó đến các model dự phòng
        if models:
            self.model_pool = models
        elif env_model and env_model in DEFAULT_MODEL_POOL:
            self.model_pool = [env_model] + [m for m in DEFAULT_MODEL_POOL if m != env_model]
        else:
            self.model_pool = DEFAULT_MODEL_POOL.copy()

        self.current_idx = 0

        logger.info(f"[GEMINI ROTATION] Khoi tao he thong XOAY TUA voi {len(self.model_pool)} models:")
        for idx, m in enumerate(self.model_pool, 1):
            logger.info(f"  {idx}. {m}")

        if not self.api_key:
            logger.error("[GEMINI] GEMINI_API_KEY chua duoc thiet lap trong file .env!")

    def enrich(self, word: str, predefined_topic: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Dùng cơ chế Xoay tua Model (Round-Robin + Failover):
        - Mỗi từ dùng 1 model khác nhau để chia đều tải (tránh vượt 15 req/phút của từng model).
        - Nếu 1 model bất kỳ gặp 429 hoặc 503 -> Ngay lập tức nhảy sang model tiếp theo mà không cần chờ!
        """
        if not self.api_key:
            logger.error(f"[GEMINI] Khong the enrich tu '{word}': Thieu GEMINI_API_KEY")
            return None

        topic_instruction = (
            f"Từ này thuộc chủ đề cụ thể: '{predefined_topic}'. Hãy đảm bảo câu ví dụ sát với chủ đề này."
            if predefined_topic
            else "Hãy phân loại từ này vào 1 trong các chủ đề TOEIC thông dụng nhất (ví dụ: Contracts, Marketing, Office Operations, Personnel, Finance, Travel, Technology, Customer Service)."
        )

        prompt = f"""
Bạn là chuyên gia biên soạn giáo trình luyện thi TOEIC quốc tế.
Hãy tạo nội dung học từ vựng cho từ/cụm từ tiếng Anh: "{word}".

Yêu cầu cụ thể:
{topic_instruction}
1. phonetic: Phiên âm IPA chuẩn Mỹ của từ/cụm từ "{word}" (ví dụ: /nɪˈɡoʊ.ʃi.eɪt/, /əˈbaɪd baɪ/).
2. part_of_speech: Từ loại chính xác (noun / verb / adjective / adverb / phrasal verb).
3. meaning_vi: Nghĩa tiếng Việt ngắn gọn, thông dụng và sát nghĩa nhất trong đề thi TOEIC và môi trường doanh nghiệp.
4. example_en: 01 câu ví dụ đúng văn phong TOEIC (email công sở, thông báo nội bộ, cuộc họp, thỏa thuận đối tác, dịch vụ khách hàng). Độ dài từ 12-22 từ.
5. example_vi: Bản dịch tiếng Việt tự nhiên, chính xác của câu ví dụ trên.
6. suggested_topic: Tên chủ đề tiếng Anh ngắn gọn (ví dụ: "Contracts", "Marketing", "Office Operations", "Personnel", "Finance", "Travel").

CHỈ TRẢ VỀ DUY NHẤT 1 ĐỐI TƯỢNG JSON HỢP LỆ THEO ĐỊNH DẠNG:
{{
  "phonetic": "...",
  "part_of_speech": "...",
  "meaning_vi": "...",
  "example_en": "...",
  "example_vi": "...",
  "suggested_topic": "..."
}}
"""
        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }],
            "generationConfig": {
                "temperature": 0.2,
                "responseMimeType": "application/json"
            }
        }

        pool_size = len(self.model_pool)
        models_tried = 0
        resp = None

        # Thử xoay vòng qua các model trong pool
        while models_tried < pool_size:
            current_model = self.model_pool[self.current_idx]
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{current_model}:generateContent?key={self.api_key}"

            try:
                resp = requests.post(url, headers=headers, json=payload, timeout=15)
                if resp.status_code == 200:
                    # Thành công -> Chuyển sang model tiếp theo cho từ sau (Round-Robin chia đều tải)
                    self.current_idx = (self.current_idx + 1) % pool_size
                    break
                elif resp.status_code in (429, 503):
                    reason = "429 Rate Limit" if resp.status_code == 429 else "503 Overload"
                    # Chuyển ngay sang model kế tiếp trong danh sách xoay tua!
                    next_idx = (self.current_idx + 1) % pool_size
                    next_model = self.model_pool[next_idx]
                    logger.warning(f"[XOAY TUA] Model '{current_model}' gap [{reason}] -> Chuyen ngay sang '{next_model}'...")
                    self.current_idx = next_idx
                    models_tried += 1
                else:
                    logger.error(f"[GEMINI HTTP {resp.status_code}] Model '{current_model}' tra ve ma loi: {resp.text[:100]}")
                    self.current_idx = (self.current_idx + 1) % pool_size
                    models_tried += 1
            except Exception as e:
                logger.warning(f"[GEMINI NET_ERROR] Model '{current_model}' loi mang: {e}. Thu model ke tiep...")
                self.current_idx = (self.current_idx + 1) % pool_size
                models_tried += 1

        # Nếu toàn bộ các model trong pool đều bị 429 cùng lúc, đợi 15s rồi thử lại 1 lần cuối
        if not resp or resp.status_code != 200:
            logger.warning("[GEMINI POOL EXHAUSTED] Tat ca model deu tam het quota. Nghi 15s de he thong hoi phuc...")
            time.sleep(15)
            # Thử lại với model đầu tiên
            fallback_model = self.model_pool[0]
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{fallback_model}:generateContent?key={self.api_key}"
            try:
                resp = requests.post(url, headers=headers, json=payload, timeout=20)
            except Exception:
                resp = None

        if not resp or resp.status_code != 200:
            logger.error(f"[GEMINI FAILED] Tu '{word}' khong the enrich sau khi da thu toan bo model pool. Bo qua!")
            return None

        try:
            data = resp.json()
            raw_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()

            clean_json = re.sub(r"^```json\s*", "", raw_text)
            clean_json = re.sub(r"\s*```$", "", clean_json)
            parsed = json.loads(clean_json)

            return {
                "phonetic": parsed.get("phonetic", "").strip(),
                "part_of_speech": parsed.get("part_of_speech", "noun").strip(),
                "meaning_vi": parsed.get("meaning_vi", "").strip(),
                "example_en": parsed.get("example_en", "").strip(),
                "example_vi": parsed.get("example_vi", "").strip(),
                "suggested_topic": predefined_topic or parsed.get("suggested_topic", "General Business").strip()
            }
        except Exception as e:
            logger.error(f"[GEMINI JSON_ERROR] Tu '{word}' loi parse JSON tu {self.model_pool[self.current_idx]}: {e}. Response thô: {raw_text}")
            return None
