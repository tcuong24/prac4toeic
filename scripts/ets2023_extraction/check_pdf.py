import sys
import pypdf

sys.stdout.reconfigure(encoding='utf-8')

def check_pdf_text(pdf_path):
    print(f"Checking {pdf_path}")
    try:
        with open(pdf_path, 'rb') as file:
            reader = pypdf.PdfReader(file)
            print(f"Total pages: {len(reader.pages)}")
            
            # Check first 5 pages
            for i in range(min(5, len(reader.pages))):
                page = reader.pages[i]
                text = page.extract_text()
                print(f"--- Page {i+1} ---")
                if text.strip():
                    print(text[:200] + "...\n")
                else:
                    print("[No text found - possibly scanned image]\n")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    lc_pdf = r"D:\prac4toeic\ETS 2023 - ZENLISH\TEST 1\1.1. ĐỀ ETS 2023 LC TEST 01.pdf"
    rc_pdf = r"D:\prac4toeic\ETS 2023 - ZENLISH\TEST 1\1.2. ĐỀ ETS 2023 RC TEST 01.pdf"
    
    check_pdf_text(lc_pdf)
    print("===========================================")
    check_pdf_text(rc_pdf)
