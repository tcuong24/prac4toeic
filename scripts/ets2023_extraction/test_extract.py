import fitz
import os
import json
from google import genai
from dotenv import load_dotenv

load_dotenv('../../.env')
client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))
doc = fitz.open(r'D:\prac4toeic\ETS 2023 - ZENLISH\TEST 1\1.1. ĐỀ ETS 2023 LC TEST 01.pdf')

for page_idx in [2, 3]:
    pix = doc[page_idx].get_pixmap(dpi=150)
    prompt = "Find all the photographs on this page for the TOEIC Listening Part 1. Return their bounding boxes as a JSON array of objects: [{\"question\": 1, \"box\": [ymin, xmin, ymax, xmax]}]. The box coordinates should be integers from 0 to 1000. Do not include markdown formatting, just return raw JSON."
    resp = client.models.generate_content(
        model='gemini-3.5-flash-lite',
        contents=[prompt, genai.types.Part.from_bytes(data=pix.tobytes('jpeg'), mime_type='image/jpeg')]
    )
    print(f"Page {page_idx}:")
    print(resp.text)
