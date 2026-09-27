import os
import fitz
import json
import time
from pathlib import Path
from google import genai
from dotenv import load_dotenv
from PIL import Image
import io

sys_stdout = open(1, 'w', encoding='utf-8', closefd=False)

def extract_listening_images(pdf_path, dest_dir):
    doc = fitz.open(pdf_path)
    
    load_dotenv(Path(__file__).resolve().parents[2] / ".env")
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    
    os.makedirs(dest_dir, exist_ok=True)
    
    question_count = 1
    
    for page_num in range(2, 5): # Usually part 1 is on pages 2, 3, 4 (0-indexed)
        if question_count > 6:
            break
            
        print(f"Processing page {page_num}...")
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
        
        try:
            resp = client.models.generate_content(
                model='gemini-3.5-flash-lite',
                contents=[prompt, genai.types.Part.from_bytes(data=img_bytes, mime_type='image/jpeg')]
            )
            
            text = resp.text.replace('```json', '').replace('```', '').strip()
            if not text or text == "[]":
                continue
                
            boxes = json.loads(text)
            boxes.sort(key=lambda x: x.get("box")[0]) # Sort by Y coordinate
            
            img = Image.open(io.BytesIO(img_bytes))
            width, height = img.size
            
            for item in boxes:
                if question_count > 6:
                    break
                    
                box = item.get("box")
                ymin, xmin, ymax, xmax = box
                
                # Convert normalized coordinates (0-1000) to actual pixel coordinates
                left = int(xmin * width / 1000)
                top = int(ymin * height / 1000)
                right = int(xmax * width / 1000)
                bottom = int(ymax * height / 1000)
                
                cropped = img.crop((left, top, right, bottom))
                
                filename = f"Test 01_Part 1_{question_count}.jpg"
                out_path = os.path.join(dest_dir, filename)
                cropped.save(out_path)
                print(f" -> Saved image for question {question_count}: {out_path}")
                
                question_count += 1
                
        except Exception as e:
            print(f"Error on page {page_num}: {e}")
            
        time.sleep(2)
        
    print(f"Done. Extracted {question_count - 1} images.")

if __name__ == "__main__":
    pdf_file = r"D:\prac4toeic\ETS 2023 - ZENLISH\TEST 1\1.1. ĐỀ ETS 2023 LC TEST 01.pdf"
    out_dir = r"D:\prac4toeic\ETS 2023 - ZENLISH\TEST 1\images"
    extract_listening_images(pdf_file, out_dir)
