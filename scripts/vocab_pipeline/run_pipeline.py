import os
import sys
import json
import argparse
import re
import time
from pathlib import Path

# Nạp file .env từ thư mục gốc dự án
CURRENT_DIR = Path(__file__).parent.resolve()
PROJECT_ROOT = CURRENT_DIR.parent.parent.resolve()
ROOT_ENV = PROJECT_ROOT / ".env"

if ROOT_ENV.exists():
    from dotenv import load_dotenv
    load_dotenv(ROOT_ENV)

from logger import logger, LOG_FILE, ERROR_LOG_FILE
from gemini_enricher import GeminiEnricher
from piper_tts import PiperSynthesizer
from db_writer import DatabaseWriter

BACKEND_UPLOADS_AUDIO = PROJECT_ROOT / "prac4toeic-api" / "uploads" / "audio"
CHECKPOINT_FILE = CURRENT_DIR / "checkpoint.json"
WORDLISTS_DIR = CURRENT_DIR / "wordlists"


def load_checkpoint() -> set:
    if CHECKPOINT_FILE.exists():
        try:
            with open(CHECKPOINT_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return set(data.get("processed", []))
        except Exception as e:
            logger.error(f"[CHECKPOINT] Loi doc checkpoint: {e}")
            return set()
    return set()


def save_checkpoint(processed_set: set):
    with open(CHECKPOINT_FILE, "w", encoding="utf-8") as f:
        json.dump({"processed": sorted(list(processed_set))}, f, ensure_ascii=False, indent=2)


def clean_filename(text: str) -> str:
    """Chuẩn hóa tên file audio từ từ vựng (ví dụ: 'abide by' -> 'abide_by')."""
    text = text.lower().strip()
    return re.sub(r"[^\w\-]", "_", text)


def format_topic_name(filename_stem: str) -> str:
    """Chuyển 'customer_service' -> 'Customer Service'."""
    words = filename_stem.replace("_", " ").replace("-", " ").split()
    return " ".join(w.capitalize() for w in words)


def process_wordlist(wordlist_path: Path, topic_name: str, enricher, synthesizer, db_writer, processed_words, limit=None, skip_audio=False, delay=4.2):
    with open(wordlist_path, "r", encoding="utf-8") as f:
        raw_words = [line.strip() for line in f if line.strip() and not line.startswith("#")]

    total = len(raw_words)
    count = 0

    logger.info(f"[PIPELINE] Bat dau danh sach '{wordlist_path.name}' | Chu de: '{topic_name}' ({total} tu)")

    for idx, word in enumerate(raw_words, start=1):
        if limit and count >= limit:
            logger.info(f"[LIMIT] Da dat gioi han {limit} tu cho danh sach nay.")
            break

        norm_word = word.strip().lower()
        if norm_word in processed_words:
            continue

        logger.info(f"[{idx}/{total}] Dang xu ly tu: '{norm_word}'...")

        # 1. Gọi 100% Gemini để lấy IPA, từ loại, nghĩa TOEIC, câu ví dụ
        enriched = enricher.enrich(norm_word, predefined_topic=topic_name)
        if not enriched:
            logger.warning(f"[SKIP] Bo qua tu '{norm_word}' vi khong lay duoc du lieu AI. KHONG luu checkpoint!")
            continue

        final_topic = topic_name or enriched.get("suggested_topic") or "General Business"

        # 2. Sinh Audio với Piper TTS (Ryan High)
        audio_filename = f"{clean_filename(norm_word)}.wav"
        word_audio_path = BACKEND_UPLOADS_AUDIO / audio_filename
        example_audio_filename = f"{clean_filename(norm_word)}_example.wav"
        example_audio_path = BACKEND_UPLOADS_AUDIO / example_audio_filename

        audio_url = f"/uploads/audio/{audio_filename}"

        if synthesizer and not skip_audio:
            try:
                # Phát âm từ đơn
                synthesizer.synthesize(norm_word, word_audio_path)
                # Đọc cả câu ví dụ
                if enriched.get("example_en"):
                    synthesizer.synthesize(enriched["example_en"], example_audio_path)
                logger.info(f"  [AUDIO OK] Da sinh audio: {audio_filename}")
            except Exception as e:
                logger.error(f"  [AUDIO ERROR] Loi tao audio cho '{norm_word}': {e}", exc_info=True)

        # 3. Lưu vào PostgreSQL, CSV, SQL
        vocab_record = {
            "topic_name": final_topic,
            "word": norm_word,
            "phonetic": enriched.get("phonetic", ""),
            "part_of_speech": enriched.get("part_of_speech", "noun"),
            "meaning_vi": enriched.get("meaning_vi", ""),
            "example_en": enriched.get("example_en", ""),
            "example_vi": enriched.get("example_vi", ""),
            "audio_url": audio_url
        }
        db_writer.save_vocabulary(vocab_record)
        logger.info(f"  [SAVED] [{final_topic}] {norm_word} ({vocab_record['part_of_speech']}) - {vocab_record['meaning_vi'][:35]}...")

        # 4. Checkpoint
        processed_words.add(norm_word)
        save_checkpoint(processed_words)
        count += 1

        # 5. Nghỉ điều tiết nhịp độ để không bao giờ vượt giới hạn 15 req/phút của Gemini
        time.sleep(delay)

    return count


def main():
    parser = argparse.ArgumentParser(description="TOEIC Vocabulary Pipeline (100% Gemini + Piper TTS Ryan High)")
    parser.add_argument("--wordlist", type=str, default=None, help="Đường dẫn file wordlist txt")
    parser.add_argument("--topic", type=str, default=None, help="Tên chủ đề cố định")
    parser.add_argument("--all-topics", action="store_true", help="Chạy tự động qua toàn bộ các file chủ đề trong wordlists/")
    parser.add_argument("--limit", type=int, default=None, help="Giới hạn số từ xử lý (mỗi file hoặc tổng)")
    parser.add_argument("--skip-audio", action="store_true", help="Bỏ qua bước sinh audio TTS")
    parser.add_argument("--delay", type=float, default=4.2, help="Thoi gian nghi giua cac tu (giay), mac dinh 4.2s de chong 429")

    args = parser.parse_args()

    logger.info("=" * 70)
    logger.info("BAT DAU VOCABULARY PIPELINE (100% GEMINI + PIPER RYAN HIGH)")
    logger.info(f"Audio Target: {BACKEND_UPLOADS_AUDIO}")
    logger.info(f"File log chi tiet: {LOG_FILE}")
    logger.info(f"File log loi rieng: {ERROR_LOG_FILE}")
    logger.info("=" * 70)

    BACKEND_UPLOADS_AUDIO.mkdir(parents=True, exist_ok=True)

    enricher = GeminiEnricher()
    db_writer = DatabaseWriter(output_dir=CURRENT_DIR / "output")
    synthesizer = None if args.skip_audio else PiperSynthesizer()
    processed_words = load_checkpoint()

    logger.info(f"[CHECKPOINT] Da co {len(processed_words)} tu hop le trong checkpoint.")

    total_added = 0

    if args.all_topics:
        topic_files = sorted(list(WORDLISTS_DIR.glob("*.txt")))
        topic_files = [f for f in topic_files if f.name != "sample_toeic_50.txt"]

        logger.info(f"[TOPICS] Phat hien {len(topic_files)} chu de trong wordlists/: {[f.stem for f in topic_files]}")

        for tf in topic_files:
            topic_name = format_topic_name(tf.stem)
            added = process_wordlist(tf, topic_name, enricher, synthesizer, db_writer, processed_words, limit=args.limit, skip_audio=args.skip_audio, delay=args.delay)
            total_added += added
    else:
        target_file = Path(args.wordlist) if args.wordlist else (WORDLISTS_DIR / "contracts.txt")
        if not target_file.exists():
            logger.error(f"[FILE NOT FOUND] Khong tim thay file: {target_file}")
            sys.exit(1)

        topic_name = args.topic or format_topic_name(target_file.stem)
        total_added = process_wordlist(target_file, topic_name, enricher, synthesizer, db_writer, processed_words, limit=args.limit, skip_audio=args.skip_audio, delay=args.delay)

    db_writer.close()
    logger.info("=" * 70)
    logger.info(f"HOAN TAT! Da xu ly thanh cong {total_added} tu vung moi.")
    logger.info(f"Audio da luu tai: {BACKEND_UPLOADS_AUDIO}")
    logger.info(f"Backup CSV: {CURRENT_DIR / 'output' / 'vocabularies.csv'}")
    logger.info(f"Backup SQL: {CURRENT_DIR / 'output' / 'vocabularies.sql'}")
    logger.info(f"Log chi tiet tai: {LOG_FILE}")
    logger.info(f"Log loi rieng tai: {ERROR_LOG_FILE}")
    logger.info("=" * 70)


if __name__ == "__main__":
    main()
