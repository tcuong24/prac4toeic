import os
import sys
import json
import time
from pathlib import Path
import fitz # PyMuPDF
from PIL import Image
import io
from dotenv import load_dotenv
from google import genai

sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = Path(__file__).resolve().parents[2]
ENV_PATH = ROOT_DIR / ".env"
load_dotenv(ENV_PATH)

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
MODEL = "gemini-3.5-flash-lite"

def analyze_and_extract_reading_images(pdf_path, output_dir):
    doc = fitz.open(pdf_path)
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"Opened PDF {pdf_path}, total pages: {len(doc)}")
    
    prompt = """
    You are an expert at analyzing TOEIC Reading test pages (Part 6 and Part 7).
    Look at this test page image carefully.
    
    Find every reading passage / context document on this page (e.g. email, advertisement, article, memo, letter, notice, web page, schedule, form, or text message chain).
    Each passage usually starts with or is associated with a header like:
    "Questions X-Y refer to the following..." or is a Part 6 text with blanks.
    
    Return a JSON array of objects with:
    - "start_q": int (first question number in the group, e.g. 147 or 158)
    - "end_q": int (last question number in the group, e.g. 148 or 161)
    - "title": string (e.g. "Advertisement", "E-mail", "Article")
    - "box": [ymin, xmin, ymax, xmax] flat 4-integer array (0-1000) of the reading passage/document itself on this page. Include header ("Questions X-Y refer to...") and the entire passage/document, but DO NOT include multiple choice questions or options (A, B, C, D).
    
    If this page only contains standalone questions with NO reading passage/document, return an empty array [].
    
    Return ONLY a raw valid JSON array, no markdown.
    """
    
    crops_by_range = {}
    
    # Part 6 starts on page 4 (0-indexed). Scan pages 4 to 30.
    for page_num in range(4, len(doc)):
        print(f"\n--- Checking Page {page_num + 1}/{len(doc)} ---")
        page = doc.load_page(page_num)
        
        pix = page.get_pixmap(dpi=150)
        img_bytes = pix.tobytes("jpeg")
        
        resp = None
        for attempt in range(5):
            try:
                resp = client.models.generate_content(
                    model=MODEL,
                    contents=[
                        prompt,
                        genai.types.Part.from_bytes(data=img_bytes, mime_type="image/jpeg")
                    ],
                    config=genai.types.GenerateContentConfig(
                        temperature=0.1
                    )
                )
                break
            except Exception as e:
                if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                    print(f" -> Quota 429 hit. Sleeping 25s (attempt {attempt + 1}/5)...")
                    time.sleep(25)
                else:
                    print(f" -> Error calling API on page {page_num + 1}: {e}")
                    break
                    
        if not resp or not resp.text:
            continue
            
        raw_text = resp.text.replace("```json", "").replace("```", "").strip()
        if not raw_text or raw_text == "[]":
            print(f" -> No reading passage found on page {page_num + 1}.")
            time.sleep(4.5)
            continue
            
        try:
            items = json.loads(raw_text)
        except Exception as e:
            print(f" -> Could not parse JSON on page {page_num + 1}: {raw_text[:100]}")
            time.sleep(4.5)
            continue
            
        if not isinstance(items, list) or len(items) == 0:
            time.sleep(4.5)
            continue
            
        img = Image.open(io.BytesIO(img_bytes))
        width, height = img.size
        
        for item in items:
            start_q = item.get("start_q")
            end_q = item.get("end_q")
            box = item.get("box")
            
            if not start_q or not end_q or not box:
                continue
                
            # Handle nested list e.g. [[ymin, xmin, ymax, xmax]]
            if isinstance(box, list) and len(box) > 0 and isinstance(box[0], list):
                box = box[0]
                
            if len(box) != 4:
                continue
                
            ymin, xmin, ymax, xmax = box
            ymin = max(0, min(1000, ymin))
            xmin = max(0, min(1000, xmin))
            ymax = max(0, min(1000, ymax))
            xmax = max(0, min(1000, xmax))
            
            if ymax <= ymin or xmax <= xmin:
                continue
                
            left = int(xmin * width / 1000)
            top = int(ymin * height / 1000)
            right = int(xmax * width / 1000)
            bottom = int(ymax * height / 1000)
            
            # Padding
            left = max(0, left - 4)
            top = max(0, top - 4)
            right = min(width, right + 4)
            bottom = min(height, bottom + 4)
            
            cropped = img.crop((left, top, right, bottom))
            key = (int(start_q), int(end_q))
            if key not in crops_by_range:
                crops_by_range[key] = []
            crops_by_range[key].append(cropped)
            print(f" -> Found crop for questions {start_q}-{end_q} (size: {cropped.size})")
            
        time.sleep(4.5) # Safe rate limit spacing (13-14 requests per min max)
        
    # Stitch and save
    mapping = {}
    print("\n--- Saving & Stitching Passage Images ---")
    for (start_q, end_q), img_list in sorted(crops_by_range.items()):
        if not img_list:
            continue
            
        if len(img_list) == 1:
            final_img = img_list[0]
        else:
            gap = 20
            max_w = max(im.width for im in img_list)
            total_h = sum(im.height for im in img_list) + gap * (len(img_list) - 1)
            
            final_img = Image.new("RGB", (max_w, total_h), color=(255, 255, 255))
            current_y = 0
            for im in img_list:
                offset_x = (max_w - im.width) // 2
                final_img.paste(im, (offset_x, current_y))
                current_y += im.height + gap
                
        filename = f"rc_passage_{start_q}_{end_q}.jpg"
        out_path = Path(output_dir) / filename
        final_img.save(out_path, "JPEG", quality=90)
        print(f"Saved {filename} for Q{start_q}-Q{end_q} ({final_img.size})")
        
        for q in range(start_q, end_q + 1):
            mapping[str(q)] = filename
            
    mapping_file = Path(output_dir) / "reading_image_mapping.json"
    with open(mapping_file, "w", encoding="utf-8") as f:
        json.dump(mapping, f, indent=2)
        
    print(f"\nExtraction complete! Mapped {len(mapping)} questions to reading images.")
    print(f"Mapping saved to {mapping_file}")

if __name__ == "__main__":
    pdf = r"D:\prac4toeic\ETS 2023 - ZENLISH\TEST 1\1.2. ĐỀ ETS 2023 RC TEST 01.pdf"
    out_dir = r"D:\prac4toeic\ETS 2023 - ZENLISH\TEST 1\images"
    analyze_and_extract_reading_images(pdf, out_dir)
