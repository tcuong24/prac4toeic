import os
import sys
import json
import fitz  # PyMuPDF
from pathlib import Path
from dotenv import load_dotenv
from google import genai
import time

sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = Path(__file__).resolve().parents[2]
ENV_PATH = ROOT_DIR / ".env"
load_dotenv(ENV_PATH)

API_KEY = os.getenv("GEMINI_API_KEY")
MODEL = "gemini-3.5-flash-lite" 
client = genai.Client(api_key=API_KEY)

def extract_questions_from_pdf(pdf_path, is_lc):
    print(f"Processing PDF: {pdf_path}")
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
    
    Example:
    [
      {
        "question_number": 32,
        "question_text": "What does the man want to do?",
        "option_a": "Buy a ticket",
        "option_b": "Change a reservation",
        "option_c": "Rent a car",
        "option_d": "Check a schedule"
      }
    ]
    """

    for page_num in range(len(doc)):
        print(f"Processing page {page_num + 1}/{len(doc)}...")
        page = doc.load_page(page_num)
        pix = page.get_pixmap(dpi=150)
        img_bytes = pix.tobytes("jpeg")
        
        try:
            response = client.models.generate_content(
                model=MODEL,
                contents=[prompt, genai.types.Part.from_bytes(
                    data=img_bytes,
                    mime_type='image/jpeg'
                )],
                config=genai.types.GenerateContentConfig(
                    temperature=0.1
                )
            )
            
            text = response.text.replace('```json', '').replace('```', '').strip()
            
            if text and text != "[]":
                try:
                    q_list = json.loads(text)
                    if isinstance(q_list, list):
                        all_questions.extend(q_list)
                        print(f" -> Found {len(q_list)} questions on this page.")
                except json.JSONDecodeError:
                    print(f" -> Could not parse JSON on page {page_num+1}.")
            time.sleep(1) # Prevent rate limiting
        except Exception as e:
            print(f" -> API Error on page {page_num+1}: {e}")
            time.sleep(2)
            
    # Sort
    all_questions.sort(key=lambda x: int(x.get("question_number", 0)))
    
    # Save to JSON
    suffix = "lc" if is_lc else "rc"
    out_file = Path(pdf_path).parent / f"questions_test_01_{suffix}.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(all_questions, f, indent=4, ensure_ascii=False)
    
    print(f"Saved {len(all_questions)} questions to {out_file}")

if __name__ == "__main__":
    lc_pdf = r"D:\prac4toeic\ETS 2023 - ZENLISH\TEST 1\1.1. ĐỀ ETS 2023 LC TEST 01.pdf"
    rc_pdf = r"D:\prac4toeic\ETS 2023 - ZENLISH\TEST 1\1.2. ĐỀ ETS 2023 RC TEST 01.pdf"
    
    extract_questions_from_pdf(lc_pdf, True)
    extract_questions_from_pdf(rc_pdf, False)
