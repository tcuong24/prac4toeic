import os
import sys
import json
import re
import time
import shutil
import fitz  # PyMuPDF
from pathlib import Path
from PIL import Image
import io
from dotenv import load_dotenv
from google import genai
from docx2pdf import convert

sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = Path(__file__).resolve().parents[2]
ENV_PATH = ROOT_DIR / ".env"
load_dotenv(ENV_PATH)

API_KEY = os.getenv("GEMINI_API_KEY")
MODEL = "gemini-3.5-flash-lite"
client = genai.Client(api_key=API_KEY)

BASE_ETS_DIR = Path(r"D:\prac4toeic\ETS 2023 - ZENLISH")

def call_gemini_with_retry(contents, max_retries=5, temperature=0.1):
    for attempt in range(max_retries):
        try:
            resp = client.models.generate_content(
                model=MODEL,
                contents=contents,
                config=genai.types.GenerateContentConfig(temperature=temperature)
            )
            return resp
        except Exception as e:
            err = str(e)
            if "429" in err or "RESOURCE_EXHAUSTED" in err:
                wait = 25 + attempt * 5
                print(f"   [Rate Limit 429] Sleeping {wait}s (attempt {attempt + 1}/{max_retries})...")
                time.sleep(wait)
            elif "11001" in err or "getaddrinfo" in err or "disconnected" in err.lower():
                wait = 10 + attempt * 5
                print(f"   [Network Error] Sleeping {wait}s (attempt {attempt + 1}/{max_retries})...")
                time.sleep(wait)
            else:
                print(f"   [API Error] {err[:120]}")
                return None
    print("   Max retries exceeded.")
    return None

def extract_answer_key(image_path, out_json_path):
    if out_json_path.exists():
        print(f"   -> [SKIP] Answer key JSON already exists: {out_json_path.name}")
        with open(out_json_path, "r", encoding="utf-8") as f:
            return json.load(f)

    print(f"   -> Extracting answer key from {image_path.name}...")
    prompt = """
    This is an image of the answer key for a TOEIC test. 
    Please extract the correct answers for all 200 questions.
    Return the result strictly as a JSON object, where the keys are the question numbers (1 to 200) as strings, and the values are the corresponding correct options ('A', 'B', 'C', or 'D').
    Do not include any other text or markdown code blocks in the output, just the raw JSON.
    Example:
    { "1": "A", "2": "B", "3": "C" }
    """
    resp = call_gemini_with_retry([prompt, genai.types.Part.from_bytes(data=image_path.read_bytes(), mime_type='image/jpeg')])
    if resp and resp.text:
        text = resp.text.replace('```json', '').replace('```', '').strip()
        try:
            answers = json.loads(text)
            with open(out_json_path, "w", encoding="utf-8") as f:
                json.dump(answers, f, indent=4)
            print(f"   -> [OK] Saved {len(answers)} answers to {out_json_path.name}")
            return answers
        except Exception as e:
            print(f"   -> [ERROR] Could not parse answer key JSON: {e}")
    return {}

def extract_questions_from_pdf(pdf_path, is_lc, out_json_path):
    if out_json_path.exists():
        print(f"   -> [SKIP] Questions JSON already exists: {out_json_path.name}")
        with open(out_json_path, "r", encoding="utf-8") as f:
            return json.load(f)

    print(f"   -> Extracting questions from PDF: {pdf_path.name}...")
    doc = fitz.open(pdf_path)
    all_questions = []

    prompt = """
    This is a page from a TOEIC test. 
    Extract all the multiple-choice questions and their options found on this page.
    If this is a Listening part (Part 1, 2), some questions might just have a question number and no text. Just output the number.
    If it's Reading or Listening Part 3/4, extract the question text and options A, B, C, D.
    
    Return the output STRICTLY as a JSON array of objects. Do not wrap it in markdown. Just the raw JSON array.
    Each object should have:
    - "question_number": int
    - "question_text": string
    - "option_a": string
    - "option_b": string
    - "option_c": string
    - "option_d": string
    """

    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        pix = page.get_pixmap(dpi=150)
        img_bytes = pix.tobytes("jpeg")

        resp = call_gemini_with_retry([prompt, genai.types.Part.from_bytes(data=img_bytes, mime_type='image/jpeg')])
        if resp and resp.text:
            text = resp.text.replace('```json', '').replace('```', '').strip()
            if text and text != "[]":
                try:
                    q_list = json.loads(text)
                    if isinstance(q_list, list):
                        all_questions.extend(q_list)
                except json.JSONDecodeError:
                    pass
        time.sleep(2)

    all_questions.sort(key=lambda x: int(x.get("question_number", 0)))
    with open(out_json_path, "w", encoding="utf-8") as f:
        json.dump(all_questions, f, indent=4, ensure_ascii=False)
    print(f"   -> [OK] Saved {len(all_questions)} questions to {out_json_path.name}")
    return all_questions

def extract_listening_part1_images(pdf_path, image_dir, test_id):
    image_dir.mkdir(parents=True, exist_ok=True)
    doc = fitz.open(pdf_path)
    q_count = 1
    
    for page_num in range(1, min(5, len(doc))):
        if q_count > 6:
            break
        page = doc[page_num]
        pix = page.get_pixmap(dpi=150)
        img_bytes = pix.tobytes("jpeg")
        
        prompt = """
        Find all the photographs on this page for the TOEIC Listening Part 1. 
        Return their bounding boxes as a JSON array of objects: 
        [{"question": 1, "box": [ymin, xmin, ymax, xmax]}]
        The box coordinates should be integers from 0 to 1000 (normalized to the image size).
        Only return the raw JSON array. Do not use markdown.
        """
        resp = call_gemini_with_retry([prompt, genai.types.Part.from_bytes(data=img_bytes, mime_type='image/jpeg')])
        if resp and resp.text:
            text = resp.text.replace('```json', '').replace('```', '').strip()
            if text and text != "[]":
                try:
                    boxes = json.loads(text)
                    boxes.sort(key=lambda x: x.get("box")[0])
                    img = Image.open(io.BytesIO(img_bytes))
                    w, h = img.size
                    for item in boxes:
                        if q_count > 6:
                            break
                        ymin, xmin, ymax, xmax = item.get("box")
                        left = max(0, int(xmin * w / 1000))
                        top = max(0, int(ymin * h / 1000))
                        right = min(w, int(xmax * w / 1000))
                        bottom = min(h, int(ymax * h / 1000))
                        cropped = img.crop((left, top, right, bottom))
                        fname = f"Test {test_id:02d}_Part 1_{q_count}.jpg"
                        out_p = image_dir / fname
                        cropped.save(out_p)
                        q_count += 1
                except Exception as e:
                    print(f"   [Error cropping Part 1]: {e}")
        time.sleep(2)
    print(f"   -> [OK] Extracted {q_count - 1} Part 1 images.")

def extract_reading_passages(pdf_path, image_dir):
    image_dir.mkdir(parents=True, exist_ok=True)
    mapping_file = image_dir / "reading_image_mapping.json"
    if mapping_file.exists():
        print(f"   -> [SKIP] Reading passage mapping already exists.")
        with open(mapping_file, "r", encoding="utf-8") as f:
            return json.load(f)

    doc = fitz.open(pdf_path)
    prompt = """
    You are an expert at analyzing TOEIC Reading test pages (Part 6 and Part 7).
    Look at this test page image carefully.
    
    Find every reading passage / context document on this page.
    Return a JSON array of objects with:
    - "start_q": int (first question number in group)
    - "end_q": int (last question number in group)
    - "title": string
    - "box": [ymin, xmin, ymax, xmax] (0-1000 normalized) of the reading passage itself.
    If no reading passage on this page, return [].
    Only return raw valid JSON array.
    """
    crops_by_range = {}
    for page_num in range(4, len(doc)):
        page = doc.load_page(page_num)
        pix = page.get_pixmap(dpi=150)
        img_bytes = pix.tobytes("jpeg")
        
        resp = call_gemini_with_retry([prompt, genai.types.Part.from_bytes(data=img_bytes, mime_type='image/jpeg')])
        if resp and resp.text:
            raw = resp.text.replace('```json', '').replace('```', '').strip()
            if raw and raw != "[]":
                try:
                    items = json.loads(raw)
                    if isinstance(items, list):
                        img = Image.open(io.BytesIO(img_bytes))
                        w, h = img.size
                        for item in items:
                            sq, eq, box = item.get("start_q"), item.get("end_q"), item.get("box")
                            if sq and eq and box:
                                if isinstance(box[0], list): box = box[0]
                                ymin, xmin, ymax, xmax = box
                                left = max(0, int(xmin * w / 1000) - 4)
                                top = max(0, int(ymin * h / 1000) - 4)
                                right = min(w, int(xmax * w / 1000) + 4)
                                bottom = min(h, int(ymax * h / 1000) + 4)
                                cropped = img.crop((left, top, right, bottom))
                                key = (int(sq), int(eq))
                                crops_by_range.setdefault(key, []).append(cropped)
                except Exception:
                    pass
        time.sleep(3)

    mapping = {}
    for (sq, eq), img_list in sorted(crops_by_range.items()):
        if len(img_list) == 1:
            final_img = img_list[0]
        else:
            gap = 20
            max_w = max(im.width for im in img_list)
            total_h = sum(im.height for im in img_list) + gap * (len(img_list) - 1)
            final_img = Image.new("RGB", (max_w, total_h), color=(255, 255, 255))
            cur_y = 0
            for im in img_list:
                final_img.paste(im, ((max_w - im.width) // 2, cur_y))
                cur_y += im.height + gap
        fname = f"rc_passage_{sq}_{eq}.jpg"
        final_img.save(image_dir / fname, "JPEG", quality=90)
        for q in range(sq, eq + 1):
            mapping[str(q)] = fname

    with open(mapping_file, "w", encoding="utf-8") as f:
        json.dump(mapping, f, indent=2)
    print(f"   -> [OK] Mapped {len(mapping)} reading passage questions.")
    return mapping

def generate_seed_sql(test_num, test_dir):
    test_str = f"{test_num:02d}"
    test_id = test_num

    answers_file = test_dir / f"answers_test_{test_str}.json"
    lc_file = test_dir / f"questions_test_{test_str}_lc.json"
    rc_file = test_dir / f"questions_test_{test_str}_rc.json"

    answers = json.load(open(answers_file, "r", encoding="utf-8")) if answers_file.exists() else {}
    lc_questions = json.load(open(lc_file, "r", encoding="utf-8")) if lc_file.exists() else []
    rc_questions = json.load(open(rc_file, "r", encoding="utf-8")) if rc_file.exists() else []

    q_dict = {str(q.get("question_number")): q for q in (lc_questions + rc_questions)}

    # Audio mapping
    audio_dir = None
    for name in os.listdir(test_dir):
        if "File nghe" in name and (test_dir / name).is_dir():
            audio_dir = test_dir / name
            break

    audio_map = {}
    if audio_dir and audio_dir.exists():
        for fname in os.listdir(audio_dir):
            if fname.endswith(".mp3"):
                match = re.search(r'_(\d+)(?:-(\d+))?\.mp3$', fname)
                if match:
                    s = int(match.group(1))
                    e = int(match.group(2)) if match.group(2) else s
                    for i in range(s, e + 1):
                        audio_map[i] = f"/uploads/listening/test{test_str}/{fname}"

    # Image mapping
    image_dir = test_dir / "images"
    image_map = {}
    rc_mapping_file = image_dir / "reading_image_mapping.json"
    if rc_mapping_file.exists():
        rc_map = json.load(open(rc_mapping_file, "r", encoding="utf-8"))
        for q_str, fname in rc_map.items():
            image_map[int(q_str)] = f"/uploads/images/test{test_str}/{fname}"

    if image_dir.exists():
        for fname in os.listdir(image_dir):
            if fname.endswith((".jpg", ".png")):
                match_single = re.search(r'_(\d+)\.(jpg|png)$', fname)
                if match_single and not fname.startswith("rc_passage_"):
                    q_num = int(match_single.group(1))
                    image_map[q_num] = f"/uploads/images/test{test_str}/{fname}"
                match_range = re.search(r'_(\d+)_(\d+)\.(jpg|png)$', fname)
                if match_range:
                    s, e = int(match_range.group(1)), int(match_range.group(2))
                    for q in range(s, e + 1):
                        image_map[q] = f"/uploads/images/test{test_str}/{fname}"

    # Copy files to api uploads
    dest_audio = ROOT_DIR / f"prac4toeic-api/uploads/listening/test{test_str}"
    dest_img = ROOT_DIR / f"prac4toeic-api/uploads/images/test{test_str}"
    dest_audio.mkdir(parents=True, exist_ok=True)
    dest_img.mkdir(parents=True, exist_ok=True)

    if audio_dir and audio_dir.exists():
        for fn in os.listdir(audio_dir):
            if fn.endswith(".mp3"):
                shutil.copy2(audio_dir / fn, dest_audio / fn)

    if image_dir.exists():
        for fn in os.listdir(image_dir):
            if fn.endswith((".jpg", ".png")):
                shutil.copy2(image_dir / fn, dest_img / fn)

    # Build SQL statements
    start_q_id = (test_id - 1) * 200 + 1
    sql_lines = [
        "CREATE TABLE IF NOT EXISTS tests (id BIGINT PRIMARY KEY, title VARCHAR(255), test_type VARCHAR(50), duration_minutes INT, created_at TIMESTAMP, updated_at TIMESTAMP);",
        f"INSERT INTO tests (id, title, test_type, duration_minutes, created_at, updated_at)",
        f"VALUES ({test_id}, 'ETS 2023 TEST {test_num}', 'FULL_TEST', 120, NOW(), NOW())",
        f"ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;\n",
        "INSERT INTO test_questions (id, test_id, question_order, part, content, option_a, option_b, option_c, option_d, correct_answer, audio_url, image_url) VALUES"
    ]

    values = []
    for q_order in range(1, 201):
        global_q_id = start_q_id + q_order - 1
        if 1 <= q_order <= 6: part = 1
        elif 7 <= q_order <= 31: part = 2
        elif 32 <= q_order <= 70: part = 3
        elif 71 <= q_order <= 100: part = 4
        elif 101 <= q_order <= 130: part = 5
        elif 131 <= q_order <= 146: part = 6
        else: part = 7

        q_data = q_dict.get(str(q_order), {})
        q_text = q_data.get("question_text", f"Question {q_order}").replace("'", "''")
        opt_a = q_data.get("option_a", "(A)").replace("'", "''")
        opt_b = q_data.get("option_b", "(B)").replace("'", "''")
        opt_c = q_data.get("option_c", "(C)").replace("'", "''")
        opt_d = q_data.get("option_d", "(D)").replace("'", "''")

        if part in [1, 2]:
            q_text = f"Question {q_order}"
            opt_a, opt_b, opt_c = "(A)", "(B)", "(C)"
            opt_d = "(D)" if part == 1 else ""

        ans = answers.get(str(q_order), "A")
        a_url = audio_map.get(q_order, "")
        i_url = image_map.get(q_order, "")

        val_str = f"({global_q_id}, {test_id}, {q_order}, {part}, '{q_text}', '{opt_a}', '{opt_b}', '{opt_c}', '{opt_d}', '{ans}', '{a_url}', " + (f"'{i_url}'" if i_url else "NULL") + ")"
        values.append(val_str)

    sql_lines.append(",\n".join(values))
    sql_lines.append("ON CONFLICT (id) DO UPDATE SET")
    sql_lines.append("part = EXCLUDED.part, content = EXCLUDED.content, option_a = EXCLUDED.option_a, option_b = EXCLUDED.option_b, option_c = EXCLUDED.option_c, option_d = EXCLUDED.option_d, correct_answer = EXCLUDED.correct_answer, audio_url = EXCLUDED.audio_url, image_url = EXCLUDED.image_url;")

    out_sql = ROOT_DIR / f"scripts/ets2023_extraction/test_{test_str}_seed.sql"
    with open(out_sql, "w", encoding="utf-8") as f:
        f.write("\n".join(sql_lines))

    print(f"   -> [OK] Generated SQL seed file: {out_sql.name}")

def process_test(test_num):
    test_dir = BASE_ETS_DIR / f"TEST {test_num}"
    test_str = f"{test_num:02d}"
    print(f"\n==========================================")
    print(f"      START PROCESSING TEST {test_num}")
    print(f"==========================================")

    if not test_dir.exists():
        print(f"Directory {test_dir} does not exist. Skipping.")
        return

    # Find Answer Key Image
    ans_img = None
    for f in test_dir.glob("*.jpg"):
        if "Ảnh đáp án" in f.name:
            ans_img = f
            break

    # Find LC PDF
    lc_pdf = None
    for f in test_dir.glob("*.pdf"):
        if "LC" in f.name and "GIẢI CHI TIẾT" not in f.name:
            lc_pdf = f
            break

    # Find RC PDF / DOCX
    rc_pdf = None
    for f in test_dir.glob("*.pdf"):
        if "RC" in f.name and "GIẢI CHI TIẾT" not in f.name:
            rc_pdf = f
            break

    if not rc_pdf:
        # Check for DOCX
        for f in test_dir.glob("*.docx"):
            if "RC" in f.name and "GIẢI CHI TIẾT" not in f.name:
                converted_pdf = test_dir / f"{f.stem}.pdf"
                if not converted_pdf.exists():
                    print(f"   -> Converting {f.name} to PDF...")
                    convert(str(f), str(converted_pdf))
                rc_pdf = converted_pdf
                break

    if ans_img:
        extract_answer_key(ans_img, test_dir / f"answers_test_{test_str}.json")

    if lc_pdf:
        extract_questions_from_pdf(lc_pdf, True, test_dir / f"questions_test_{test_str}_lc.json")
        extract_listening_part1_images(lc_pdf, test_dir / "images", test_num)

    if rc_pdf:
        extract_questions_from_pdf(rc_pdf, False, test_dir / f"questions_test_{test_str}_rc.json")
        extract_reading_passages(rc_pdf, test_dir / "images")

    generate_seed_sql(test_num, test_dir)
    print(f"==========================================")
    print(f"      FINISHED TEST {test_num}")
    print(f"==========================================")

if __name__ == "__main__":
    # Test 3 to 10
    tests_to_process = [int(x) for x in sys.argv[1:]] if len(sys.argv) > 1 else list(range(3, 11))
    for t in tests_to_process:
        process_test(t)
