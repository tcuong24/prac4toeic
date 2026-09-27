import os
import json
import re
from pathlib import Path
import shutil

def create_seed_sql():
    base_dir = Path(r"D:\prac4toeic\ETS 2023 - ZENLISH\TEST 1")
    audio_dir = base_dir / "1.4. File nghe cắt lẻ từng câu"
    answers_file = base_dir / "answers_test_01.json"
    lc_file = base_dir / "questions_test_01_lc.json"
    rc_file = base_dir / "questions_test_01_rc.json"
    
    # Load answers
    answers = {}
    if answers_file.exists():
        with open(answers_file, "r", encoding="utf-8") as f:
            answers = json.load(f)
            
    # Load questions
    lc_questions = []
    rc_questions = []
    
    if lc_file.exists():
        with open(lc_file, "r", encoding="utf-8") as f:
            lc_questions = json.load(f)
            
    if rc_file.exists():
        with open(rc_file, "r", encoding="utf-8") as f:
            rc_questions = json.load(f)

    q_dict = {}
    for q in lc_questions + rc_questions:
        q_num = str(q.get("question_number"))
        q_dict[q_num] = q
        
    # Map Audio files
    audio_map = {}
    for filename in os.listdir(audio_dir):
        if filename.endswith(".mp3"):
            # Extract numbers from end of filename, e.g. _32-34.mp3 or _1.mp3
            match = re.search(r'_(\d+)(?:-(\d+))?\.mp3$', filename)
            if match:
                start = int(match.group(1))
                end = int(match.group(2)) if match.group(2) else start
                for i in range(start, end + 1):
                    audio_map[i] = f"/uploads/listening/test01/{filename}"
                    
    # Map Image files
    image_dir = base_dir / "images"
    image_map = {}
    
    # Check reading_image_mapping.json if present
    reading_mapping_file = image_dir / "reading_image_mapping.json"
    if reading_mapping_file.exists():
        with open(reading_mapping_file, "r", encoding="utf-8") as f:
            rc_map = json.load(f)
            for q_str, fname in rc_map.items():
                image_map[int(q_str)] = f"/uploads/images/test01/{fname}"
                
    if image_dir.exists():
        for filename in os.listdir(image_dir):
            if filename.endswith(".jpg") or filename.endswith(".png"):
                # Single question pattern (e.g. Test 01_Part 1_1.jpg)
                match_single = re.search(r'_(\d+)\.(jpg|png)$', filename)
                if match_single and not filename.startswith("rc_passage_"):
                    q_num = int(match_single.group(1))
                    image_map[q_num] = f"/uploads/images/test01/{filename}"
                # Range pattern (e.g. rc_passage_147_148.jpg)
                match_range = re.search(r'_(\d+)_(\d+)\.(jpg|png)$', filename)
                if match_range:
                    start_q = int(match_range.group(1))
                    end_q = int(match_range.group(2))
                    for q in range(start_q, end_q + 1):
                        image_map[q] = f"/uploads/images/test01/{filename}"
                    
    # Ensure upload dir exists
    dest_audio_dir = Path(r"D:\prac4toeic\prac4toeic-api\uploads\listening\test01")
    dest_audio_dir.mkdir(parents=True, exist_ok=True)
    
    dest_image_dir = Path(r"D:\prac4toeic\prac4toeic-api\uploads\images\test01")
    dest_image_dir.mkdir(parents=True, exist_ok=True)
    
    # Copy audio files
    print(f"Copying audio files to {dest_audio_dir}...")
    for filename in os.listdir(audio_dir):
        if filename.endswith(".mp3"):
            src = audio_dir / filename
            dst = dest_audio_dir / filename
            if not dst.exists():
                shutil.copy2(src, dst)
                
    # Copy image files
    if image_dir.exists():
        print(f"Copying image files to {dest_image_dir}...")
        for filename in os.listdir(image_dir):
            if filename.endswith(".jpg") or filename.endswith(".png"):
                src = image_dir / filename
                dst = dest_image_dir / filename
                if not dst.exists():
                    shutil.copy2(src, dst)
                
    sql_lines = []
    
    # Create tables if not exist
    sql_lines.append("CREATE TABLE IF NOT EXISTS tests (id BIGINT PRIMARY KEY, title VARCHAR(255), test_type VARCHAR(50), duration_minutes INT, created_at TIMESTAMP, updated_at TIMESTAMP);")
    
    # 1. Insert Test
    sql_lines.append("INSERT INTO tests (id, title, test_type, duration_minutes, created_at, updated_at)")
    sql_lines.append("VALUES (1, 'ETS 2023 TEST 1', 'FULL_TEST', 120, NOW(), NOW())")
    sql_lines.append("ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;\n")
    
    # 2. Insert Questions
    sql_lines.append("INSERT INTO test_questions (id, test_id, question_order, part, content, option_a, option_b, option_c, option_d, correct_answer, audio_url, image_url) VALUES")
    
    values = []
    for i in range(1, 201):
        q_num = str(i)
        
        # Determine part
        if 1 <= i <= 6: part = 1
        elif 7 <= i <= 31: part = 2
        elif 32 <= i <= 70: part = 3
        elif 71 <= i <= 100: part = 4
        elif 101 <= i <= 130: part = 5
        elif 131 <= i <= 146: part = 6
        else: part = 7
        
        q_data = q_dict.get(q_num, {})
        q_text = q_data.get("question_text", f"Question {i}").replace("'", "''")
        opt_a = q_data.get("option_a", "(A)").replace("'", "''")
        opt_b = q_data.get("option_b", "(B)").replace("'", "''")
        opt_c = q_data.get("option_c", "(C)").replace("'", "''")
        opt_d = q_data.get("option_d", "(D)").replace("'", "''")
        
        if part in [1, 2]:
            q_text = f"Question {i}"
            opt_a, opt_b, opt_c = "(A)", "(B)", "(C)"
            opt_d = "(D)" if part == 1 else "" 
        
        correct_ans = answers.get(q_num, "A")
        audio_url = audio_map.get(i, "")
        image_url = image_map.get(i, "")
            
        values.append(f"({i}, 1, {i}, {part}, '{q_text}', '{opt_a}', '{opt_b}', '{opt_c}', '{opt_d}', '{correct_ans}', '{audio_url}', " + (f"'{image_url}'" if image_url else "NULL") + ")")

    sql_lines.append(",\n".join(values))
    sql_lines.append("ON CONFLICT (id) DO UPDATE SET")
    sql_lines.append("part = EXCLUDED.part, content = EXCLUDED.content, option_a = EXCLUDED.option_a, option_b = EXCLUDED.option_b, option_c = EXCLUDED.option_c, option_d = EXCLUDED.option_d, correct_answer = EXCLUDED.correct_answer, audio_url = EXCLUDED.audio_url, image_url = EXCLUDED.image_url;")
    
    out_sql = Path(r"D:\prac4toeic\scripts\ets2023_extraction\test_01_seed.sql")
    with open(out_sql, "w", encoding="utf-8") as f:
        f.write("\n".join(sql_lines))
        
    print(f"Generated seed SQL at {out_sql}")

if __name__ == "__main__":
    create_seed_sql()
