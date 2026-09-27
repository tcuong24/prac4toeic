# TOEIC Listening Dialogue Extraction & Multi-Voice TTS Pipeline

Pipeline tự động nhận diện và tiền xử lý transcript đề thi TOEIC Listening (từ file `.txt` hoặc `.pdf`), sử dụng mô hình Gemini với cơ chế xoay tua model để phân tách thành các lượt thoại (`dialogue turns`), nhận diện vai người nói (`Narrator`, `Man`, `Woman`), và tổng hợp audio đa giọng nói bằng **Piper TTS** (kết hợp giọng nam Ryan và giọng nữ Lessac).

---

## 1. Cấu trúc thư mục

```
scripts/listening_pipeline/
├── inputs/                      # Đặt file transcript đề thi (.txt hoặc .pdf) tại đây
│   └── sample_part3.txt         # File đề thi mẫu Part 3
├── models/                      # Tự động tải ONNX models cho Piper TTS
│   ├── en_US-ryan-high.onnx     # Giọng nam / Narrator
│   └── en_US-lessac-medium.onnx # Giọng nữ
├── output/
│   ├── dialogues.json           # Dữ liệu JSON các lượt thoại đã phân tách
│   ├── listening.sql            # Script SQL chèn vào CSDL PostgreSQL
│   └── checkpoint.json          # Ghi nhớ các câu đã xử lý (resume an toàn)
├── logs/                        # Log chi tiết quá trình chạy
├── prompt_template.py           # Quản lý prompt hệ thống bóc tách lượt thoại
├── transcript_extractor.py      # Bộ đọc file .txt/.pdf và làm sạch OCR
├── gemini_parser.py             # Client Gemini xoay tua model (Round-Robin & Failover)
├── multi_piper_tts.py           # Tổng hợp audio đa giọng và ghép nối WAV
├── run_listening_pipeline.py    # Điểm thực thi chính (CLI)
└── requirements.txt             # Các thư viện phụ thuộc
```

---

## 2. Hướng dẫn sử dụng

### Cài đặt thư viện
```bash
pip install -r scripts/listening_pipeline/requirements.txt
```

### Chạy pipeline với file transcript mẫu
```bash
python scripts/listening_pipeline/run_listening_pipeline.py --input scripts/listening_pipeline/inputs/sample_part3.txt --part 3
```

### Chạy chỉ trích xuất JSON (bỏ qua sinh audio TTS)
```bash
python scripts/listening_pipeline/run_listening_pipeline.py --input scripts/listening_pipeline/inputs/sample_part3.txt --skip-audio
```

---

## 3. Tùy chọn dòng lệnh (CLI Arguments)

| Tham số | Ý nghĩa | Mặc định |
|---|---|---|
| `--input`, `-i` | Đường dẫn file transcript đầu vào (`.txt` hoặc `.pdf`) | File đầu tiên trong `inputs/` |
| `--part`, `-p` | Gợi ý Part đề thi (1, 2, 3, hoặc 4) | Tự động phân tích |
| `--skip-audio` | Bỏ qua bước sinh audio TTS, chỉ xuất JSON và SQL | `False` |
| `--output-dir`, `-o` | Thư mục lưu kết quả JSON, SQL và checkpoint | `scripts/listening_pipeline/output/` |

---

## 4. Định dạng đầu ra

### JSON (`output/dialogues.json`):
```json
[
  {
    "question_range": "32-34",
    "question_numbers": [32, 33, 34],
    "part": 3,
    "context": "Discussion about office furniture delivery",
    "audio_url": "/uploads/listening/listening_p3_q32_34.wav",
    "turns": [
      { "speaker": "Narrator", "text": "Questions 32 through 34 refer to the following conversation." },
      { "speaker": "Man", "text": "Hello Ms. Tanaka, this is David from Apex Logistics..." },
      { "speaker": "Woman", "text": "Oh hello David! Yes, I was just checking our inventory space..." },
      { "speaker": "Narrator", "text": "Number 32. Why is the man calling?" },
      { "speaker": "Narrator", "text": "Number 33. What problem does the woman mention?" },
      { "speaker": "Narrator", "text": "Number 34. What will the woman probably do next?" }
    ]
  }
]
```

### SQL Seed (`output/listening.sql`):
Chứa các câu lệnh `CREATE TABLE IF NOT EXISTS` và `INSERT INTO listening_dialogues` cùng `listening_turns` với quan hệ khóa ngoại tương thích hoàn toàn với PostgreSQL.
