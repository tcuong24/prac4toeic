import os
import sys
import json
import argparse
import time
from pathlib import Path
from typing import List, Dict, Any

from logger import logger
from transcript_extractor import extract_text_from_file, chunk_transcript
from gemini_parser import GeminiListeningParser
from multi_piper_tts import MultiPiperSynthesizer

CURRENT_DIR = Path(__file__).parent.resolve()
DEFAULT_INPUT_DIR = CURRENT_DIR / "inputs"
DEFAULT_OUTPUT_DIR = CURRENT_DIR / "output"
ROOT_DIR = CURRENT_DIR.parents[1]
DEFAULT_UPLOAD_DIR = ROOT_DIR / "prac4toeic-api" / "uploads" / "listening"


def load_checkpoint(checkpoint_path: Path) -> Dict[str, Any]:
    if checkpoint_path.exists():
        try:
            with open(checkpoint_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"[CHECKPOINT] Không thể đọc checkpoint: {e}")
    return {"processed_ranges": [], "dialogues": []}


def save_checkpoint(checkpoint_path: Path, data: Dict[str, Any]):
    checkpoint_path.parent.mkdir(parents=True, exist_ok=True)
    with open(checkpoint_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def generate_sql_file(dialogues: List[Dict[str, Any]], sql_path: Path):
    """Xuất file SQL chèn dữ liệu vào bảng listening_dialogues và listening_turns."""
    sql_path.parent.mkdir(parents=True, exist_ok=True)

    lines = [
        "-- Prac4TOEIC Listening Dialogues Data Seed",
        "-- Tự động sinh bởi listening_pipeline",
        "",
        "CREATE TABLE IF NOT EXISTS listening_dialogues (",
        "    id BIGSERIAL PRIMARY KEY,",
        "    part INT NOT NULL,",
        "    question_range VARCHAR(50) NOT NULL,",
        "    context TEXT,",
        "    audio_url VARCHAR(255),",
        "    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        ");",
        "",
        "CREATE TABLE IF NOT EXISTS listening_turns (",
        "    id BIGSERIAL PRIMARY KEY,",
        "    dialogue_id BIGINT REFERENCES listening_dialogues(id) ON DELETE CASCADE,",
        "    turn_order INT NOT NULL,",
        "    speaker VARCHAR(50) NOT NULL,",
        "    text TEXT NOT NULL",
        ");",
        "",
    ]

    for d_idx, d in enumerate(dialogues, 1):
        part = d.get("part", 3)
        q_range = str(d.get("question_range", "")).replace("'", "''")
        context = str(d.get("context", "")).replace("'", "''")
        audio_url = str(d.get("audio_url", "")).replace("'", "''")

        lines.append(f"-- Dialogue #{d_idx} (Part {part} - Q{q_range})")
        lines.append(
            f"INSERT INTO listening_dialogues (id, part, question_range, context, audio_url) "
            f"VALUES ({d_idx}, {part}, '{q_range}', '{context}', '{audio_url}') "
            f"ON CONFLICT (id) DO NOTHING;"
        )

        turns = d.get("turns", [])
        for t_order, turn in enumerate(turns, 1):
            speaker = str(turn.get("speaker", "Narrator")).replace("'", "''")
            t_text = str(turn.get("text", "")).replace("'", "''")
            lines.append(
                f"INSERT INTO listening_turns (dialogue_id, turn_order, speaker, text) "
                f"VALUES ({d_idx}, {t_order}, '{speaker}', '{t_text}');"
            )
        lines.append("")

    with open(sql_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    logger.info(f"[SQL] Đã ghi {len(dialogues)} đoạn hội thoại ra: {sql_path.name}")


def main():
    parser = argparse.ArgumentParser(description="Prac4TOEIC - Listening Dialogue Extraction & Multi-Voice TTS Pipeline")
    parser.add_argument("--input", "-i", type=str, default=None, help="Đường dẫn tới file transcript .txt hoặc .pdf")
    parser.add_argument("--pages", type=str, default=None, help="Phạm vi trang cần đọc từ PDF (VD: '5-25' hoặc '1,2,3')")
    parser.add_argument("--part", "-p", type=int, default=None, help="Gợi ý phần thi (1, 2, 3, hoặc 4)")
    parser.add_argument("--skip-audio", action="store_true", help="Chỉ trích xuất JSON, bỏ qua bước sinh audio TTS")
    parser.add_argument("--output-dir", "-o", type=str, default=str(DEFAULT_OUTPUT_DIR), help="Thư mục xuất kết quả")
    args = parser.parse_args()

    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    checkpoint_file = output_dir / "checkpoint.json"
    dialogues_file = output_dir / "dialogues.json"
    sql_file = output_dir / "listening.sql"

    upload_audio_dir = DEFAULT_UPLOAD_DIR
    upload_audio_dir.mkdir(parents=True, exist_ok=True)

    # 1. Xác định file đầu vào
    input_file = None
    if args.input:
        input_file = Path(args.input).resolve()
    else:
        # Tìm file mẫu trong inputs/
        txt_files = list(DEFAULT_INPUT_DIR.glob("*.txt")) + list(DEFAULT_INPUT_DIR.glob("*.pdf"))
        if txt_files:
            input_file = txt_files[0]

    if not input_file or not input_file.exists():
        logger.error(f"[INPUT ERROR] Không tìm thấy file đầu vào hợp lệ tại: {input_file}")
        sys.exit(1)

    logger.info("=" * 60)
    logger.info("   PRAC4TOEIC - LISTENING DIALOGUE & TTS PIPELINE")
    logger.info("=" * 60)
    logger.info(f"File nguồn: {input_file.name}")
    logger.info(f"Part hint : {args.part or 'Tự động'}")
    logger.info(f"Sinh Audio: {'Bỏ qua' if args.skip_audio else 'Có (Multi-Voice Piper TTS)'}")
    logger.info(f"Audio Out : {upload_audio_dir}")
    logger.info("=" * 60)

    # 2. Đọc và chia transcript thành chunks
    raw_text = extract_text_from_file(input_file, pages=args.pages)
    chunks = chunk_transcript(raw_text)

    # 3. Khởi tạo Gemini Parser & TTS Synthesizer
    gemini_parser = GeminiListeningParser()
    tts_engine = None
    if not args.skip_audio:
        tts_engine = MultiPiperSynthesizer()

    checkpoint = load_checkpoint(checkpoint_file)
    processed_ranges = set(checkpoint.get("processed_ranges", []))
    all_dialogues = checkpoint.get("dialogues", [])

    total_chunks = len(chunks)
    new_dialogues_count = 0

    # 4. Chạy xử lý từng chunk
    for c_idx, chunk in enumerate(chunks, 1):
        logger.info(f"\n--- [CHUNK {c_idx}/{total_chunks}] Đang phân tích nội dung ---")
        dialogues = gemini_parser.parse_chunk(chunk, part_hint=args.part)

        for d in dialogues:
            q_range = str(d.get("question_range", f"c{c_idx}"))
            if q_range in processed_ranges:
                logger.info(f"[SKIP] Cụm câu hỏi {q_range} đã được xử lý trước đó.")
                continue

            turns = d.get("turns", [])
            logger.info(f"-> Phát hiện cụm câu hỏi: {q_range} ({len(turns)} lượt thoại)")

            # Sinh audio nếu không chọn skip
            if tts_engine and turns:
                safe_q_range = q_range.replace(" ", "_").replace("-", "_")
                audio_filename = f"listening_p{d.get('part', 3)}_q{safe_q_range}.wav"
                target_audio_path = upload_audio_dir / audio_filename

                try:
                    logger.info(f"[AUDIO] Đang tổng hợp audio đa giọng cho câu {q_range}...")
                    tts_engine.synthesize_dialogue(turns, target_audio_path)
                    d["audio_url"] = f"/uploads/listening/{audio_filename}"
                except Exception as e:
                    logger.error(f"[AUDIO ERROR] Thất bại khi sinh audio câu {q_range}: {e}")
                    d["audio_url"] = None

            all_dialogues.append(d)
            processed_ranges.add(q_range)
            new_dialogues_count += 1

            # Lưu checkpoint định kỳ
            checkpoint["processed_ranges"] = list(processed_ranges)
            checkpoint["dialogues"] = all_dialogues
            save_checkpoint(checkpoint_file, checkpoint)

        # Tránh spam API quá nhanh
        time.sleep(1)

    # 5. Lưu toàn bộ kết quả cuối cùng ra JSON và SQL
    with open(dialogues_file, "w", encoding="utf-8") as f:
        json.dump(all_dialogues, f, ensure_ascii=False, indent=2)

    generate_sql_file(all_dialogues, sql_file)

    logger.info("\n" + "=" * 60)
    logger.info(f"HOÀN THÀNH PIPELINE!")
    logger.info(f"- Tổng số đoạn hội thoại trích xuất: {len(all_dialogues)} (mới: {new_dialogues_count})")
    logger.info(f"- File JSON: {dialogues_file}")
    logger.info(f"- File SQL : {sql_file}")
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
