"""
Resume extraction: Process only missing pages to fill gaps in reading_image_mapping.json.
Missing passages: 162-165 (page 16), and pages around 176-185.
"""
import os
import sys
import json
import time
from pathlib import Path
import fitz  # PyMuPDF
from PIL import Image
import io
from dotenv import load_dotenv
from google import genai

sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = Path(__file__).resolve().parents[2]
load_dotenv(ROOT_DIR / ".env")

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
MODEL = "gemini-3.5-flash-lite"

IMAGES_DIR = Path(r"D:\prac4toeic\ETS 2023 - ZENLISH\TEST 1\images")
MAPPING_FILE = IMAGES_DIR / "reading_image_mapping.json"
PDF_PATH = r"D:\prac4toeic\ETS 2023 - ZENLISH\TEST 1\1.2. ĐỀ ETS 2023 RC TEST 01.pdf"

PROMPT = """
You are an expert at analyzing TOEIC Reading test pages (Part 6 and Part 7).
Look at this test page image carefully.

Find every reading passage / context document on this page (e.g. email, advertisement, article, memo, letter, notice, web page, schedule, form, or text message chain).
Each passage usually starts with or is associated with a header like:
"Questions X-Y refer to the following..." or is a Part 6 text with blanks.

Return a JSON array of objects with:
- "start_q": int (first question number in the group)
- "end_q": int (last question number in the group)
- "title": string (e.g. "Advertisement", "E-mail", "Article")
- "box": [ymin, xmin, ymax, xmax] flat 4-integer array (0-1000 normalized) of the reading passage itself. Include header and entire passage, but NOT multiple choice questions/options.

If this page only contains standalone questions with NO reading passage/document, return [].
Return ONLY raw valid JSON array, no markdown.
"""

def call_api_with_retry(img_bytes, max_retries=5):
    for attempt in range(max_retries):
        try:
            resp = client.models.generate_content(
                model=MODEL,
                contents=[PROMPT, genai.types.Part.from_bytes(data=img_bytes, mime_type="image/jpeg")],
                config=genai.types.GenerateContentConfig(temperature=0.1)
            )
            return resp
        except Exception as e:
            err = str(e)
            if "429" in err or "RESOURCE_EXHAUSTED" in err:
                wait = 30 + attempt * 5
                print(f"   Rate limited. Sleeping {wait}s (attempt {attempt+1}/{max_retries})...")
                time.sleep(wait)
            elif "11001" in err or "getaddrinfo" in err or "disconnected" in err.lower():
                wait = 10 + attempt * 5
                print(f"   Network error: {err[:60]}. Sleeping {wait}s (attempt {attempt+1}/{max_retries})...")
                time.sleep(wait)
            else:
                print(f"   API error: {err[:120]}")
                return None
    print("   Max retries exceeded.")
    return None

def extract_crop(page_img, box, width, height):
    ymin, xmin, ymax, xmax = box
    ymin = max(0, min(1000, ymin))
    xmin = max(0, min(1000, xmin))
    ymax = max(0, min(1000, ymax))
    xmax = max(0, min(1000, xmax))
    
    if ymax <= ymin or xmax <= xmin:
        return None
    
    left = max(0, int(xmin * width / 1000) - 4)
    top = max(0, int(ymin * height / 1000) - 4)
    right = min(width, int(xmax * width / 1000) + 4)
    bottom = min(height, int(ymax * height / 1000) + 4)
    
    return page_img.crop((left, top, right, bottom))

def main():
    # Load existing mapping
    existing_mapping = {}
    if MAPPING_FILE.exists():
        with open(MAPPING_FILE, "r", encoding="utf-8") as f:
            existing_mapping = json.load(f)
    
    # Find which questions are already covered
    covered_qs = set(int(q) for q in existing_mapping.keys())
    
    # Also find which image files we already have
    existing_files = {f.name for f in IMAGES_DIR.glob("rc_passage_*.jpg")}
    
    # Build mapping from existing image files (covers more than the mapping file)
    # by scanning the filenames
    import re
    file_mapping = {}
    for fname in existing_files:
        m = re.match(r"rc_passage_(\d+)_(\d+)\.jpg$", fname)
        if m:
            s, e = int(m.group(1)), int(m.group(2))
            for q in range(s, e + 1):
                file_mapping[str(q)] = fname
                covered_qs.add(q)
    
    print(f"Questions already covered by existing images: {sorted(covered_qs)}")
    
    # The questions we need to cover for Reading (131-200)
    all_reading_qs = set(range(131, 201))
    missing_qs = all_reading_qs - covered_qs
    print(f"\nMissing question numbers: {sorted(missing_qs)}")
    
    if not missing_qs:
        print("All questions are already covered! Rebuilding mapping file...")
        final_mapping = {**file_mapping}
        with open(MAPPING_FILE, "w", encoding="utf-8") as f:
            json.dump(dict(sorted(final_mapping.items(), key=lambda x: int(x[0]))), f, indent=2)
        print(f"Mapping saved with {len(final_mapping)} entries.")
        return
    
    doc = fitz.open(PDF_PATH)
    crops_by_range = {}
    
    # Process pages that likely contain missing passages
    # Pages 15-27 (0-indexed) cover questions 162-185 area
    pages_to_scan = range(15, 27)
    
    for page_num in pages_to_scan:
        print(f"\n--- Page {page_num + 1}/{len(doc)} ---")
        page = doc.load_page(page_num)
        pix = page.get_pixmap(dpi=150)
        img_bytes = pix.tobytes("jpeg")
        
        resp = call_api_with_retry(img_bytes)
        if not resp or not resp.text:
            print(f"   Skipping page {page_num + 1}")
            time.sleep(4.5)
            continue
        
        raw_text = resp.text.replace("```json", "").replace("```", "").strip()
        if not raw_text or raw_text == "[]":
            print(f"   No passage on page {page_num + 1}.")
            time.sleep(4.5)
            continue
        
        try:
            items = json.loads(raw_text)
        except Exception as e:
            print(f"   JSON parse error: {raw_text[:80]}")
            time.sleep(4.5)
            continue
        
        if not isinstance(items, list) or not items:
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
            
            start_q = int(start_q)
            end_q = int(end_q)
            
            # Skip if we already have a file for this range
            fname = f"rc_passage_{start_q}_{end_q}.jpg"
            if fname in existing_files:
                print(f"   Already have {fname}, skipping.")
                # Still add to mapping in case it was missing
                for q in range(start_q, end_q + 1):
                    file_mapping[str(q)] = fname
                continue
            
            # Handle nested list e.g. [[ymin, xmin, ymax, xmax]]
            if isinstance(box, list) and box and isinstance(box[0], list):
                box = box[0]
            
            if len(box) != 4:
                continue
            
            cropped = extract_crop(img, box, width, height)
            if not cropped:
                continue
            
            key = (start_q, end_q)
            if key not in crops_by_range:
                crops_by_range[key] = []
            crops_by_range[key].append(cropped)
            print(f"   Found crop for Q{start_q}-Q{end_q} size={cropped.size}")
        
        time.sleep(4.5)  # ~13 req/min safe
    
    # Save new crops
    print("\n--- Saving new passage images ---")
    for (start_q, end_q), img_list in sorted(crops_by_range.items()):
        fname = f"rc_passage_{start_q}_{end_q}.jpg"
        out_path = IMAGES_DIR / fname
        
        if len(img_list) == 1:
            final_img = img_list[0]
        else:
            gap = 20
            max_w = max(im.width for im in img_list)
            total_h = sum(im.height for im in img_list) + gap * (len(img_list) - 1)
            final_img = Image.new("RGB", (max_w, total_h), color=(255, 255, 255))
            current_y = 0
            for im in img_list:
                final_img.paste(im, ((max_w - im.width) // 2, current_y))
                current_y += im.height + gap
        
        final_img.save(out_path, "JPEG", quality=90)
        print(f"  Saved {fname} ({final_img.size})")
        
        for q in range(start_q, end_q + 1):
            file_mapping[str(q)] = fname
    
    # Merge and save final mapping
    final_mapping = {**file_mapping}
    sorted_mapping = dict(sorted(final_mapping.items(), key=lambda x: int(x[0])))
    with open(MAPPING_FILE, "w", encoding="utf-8") as f:
        json.dump(sorted_mapping, f, indent=2)
    
    covered_after = set(int(q) for q in final_mapping.keys())
    still_missing = all_reading_qs - covered_after
    print(f"\nDone. Covered {len(covered_after)} questions.")
    if still_missing:
        print(f"Still missing: {sorted(still_missing)}")
    else:
        print("All reading questions now have passage images!")

if __name__ == "__main__":
    main()
