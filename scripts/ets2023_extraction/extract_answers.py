import os
import sys
import json
from pathlib import Path
from dotenv import load_dotenv
from google import genai

sys.stdout.reconfigure(encoding='utf-8')

# Tải .env từ thư mục gốc
ROOT_DIR = Path(__file__).resolve().parents[2]
ENV_PATH = ROOT_DIR / ".env"
load_dotenv(ENV_PATH)

API_KEY = os.getenv("GEMINI_API_KEY")
MODEL = "gemini-3.5-flash-lite" # Use the model specified by the user

def extract_answers(image_path):
    print(f"Processing {image_path}...")
    
    prompt = """
    This is an image of the answer key for a TOEIC test. 
    Please extract the correct answers for all 200 questions.
    Return the result strictly as a JSON object, where the keys are the question numbers (1 to 200) as strings, and the values are the corresponding correct options ('A', 'B', 'C', or 'D').
    Do not include any other text or markdown code blocks in the output, just the raw JSON.
    Example:
    {
      "1": "A",
      "2": "B",
      "3": "C"
    }
    """
    
    try:
        # Upload the file
        client = genai.Client(api_key=API_KEY)
        
        # Use the file in a generation request
        response = client.models.generate_content(
            model=MODEL,
            contents=[prompt, genai.types.Part.from_bytes(
                data=Path(image_path).read_bytes(),
                mime_type='image/jpeg'
            )],
            config=genai.types.GenerateContentConfig(
                temperature=0.1
            )
        )
        
        text = response.text
        text = text.replace('```json', '').replace('```', '').strip()
        
        answers = json.loads(text)
        
        # Save to JSON file
        output_file = Path(image_path).parent / "answers_test_01.json"
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(answers, f, indent=4)
            
        print(f"Successfully extracted {len(answers)} answers and saved to {output_file}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    image_file = r"D:\prac4toeic\ETS 2023 - ZENLISH\TEST 1\1.5. Ảnh đáp án Test 01.jpg"
    extract_answers(image_file)
