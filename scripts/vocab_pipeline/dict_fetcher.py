import requests
from typing import Optional, Dict, Any

API_BASE_URL = "https://api.dictionaryapi.dev/api/v2/entries/en"

def fetch_dictionary_info(word: str) -> Dict[str, Any]:
    """
    Gọi Free Dictionary API để lấy phiên âm IPA và từ loại gốc.
    Fallback an toàn nếu từ không có trong từ điển mở.
    """
    clean_word = word.strip().lower()
    default_result = {
        "word": clean_word,
        "phonetic": "",
        "part_of_speech": "noun",
        "definition_en": ""
    }

    try:
        url = f"{API_BASE_URL}/{clean_word}"
        response = requests.get(url, timeout=3)
        if response.status_code != 200:
            return default_result

        data = response.json()
        if not isinstance(data, list) or len(data) == 0:
            return default_result

        entry = data[0]
        phonetic = entry.get("phonetic", "")
        if not phonetic and "phonetics" in entry:
            for p in entry["phonetics"]:
                if p.get("text"):
                    phonetic = p["text"]
                    break

        part_of_speech = ""
        definition_en = ""
        if "meanings" in entry and len(entry["meanings"]) > 0:
            first_meaning = entry["meanings"][0]
            part_of_speech = first_meaning.get("partOfSpeech", "")
            if "definitions" in first_meaning and len(first_meaning["definitions"]) > 0:
                definition_en = first_meaning["definitions"][0].get("definition", "")

        return {
            "word": clean_word,
            "phonetic": phonetic,
            "part_of_speech": part_of_speech or "noun",
            "definition_en": definition_en
        }
    except Exception as e:
        print(f"⚠️ Không thể lấy dữ liệu từ Free Dictionary API cho từ '{clean_word}': {e}")
        return default_result
