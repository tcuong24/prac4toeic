# TOEIC Vocabulary Ingestion Pipeline (100% Gemini AI + Piper Ryan High)

Hệ thống tự động hóa làm giàu từ vựng TOEIC và sinh audio bản ngữ:
1. **Google Gemini (3.6 Flash - 100% AI Mode)**: Tự động trích xuất phiên âm IPA chuẩn Mỹ, từ loại, nghĩa tiếng Việt môi trường doanh nghiệp, câu ví dụ văn phòng (12-22 từ) và bản dịch tiếng Việt.
2. **Piper TTS (Giọng Ryan High)**: Sinh âm thanh phát âm từ vựng (`{word}.wav`) và câu ví dụ (`{word}_example.wav`) chuẩn ngữ điệu bản ngữ Mỹ.
3. **PostgreSQL & Static Storage**: Tự động tạo chủ đề trong bảng `topics`, lưu từ vào `vocabularies` và lưu file audio vào thư mục `prac4toeic-api/uploads/audio/` để Spring Boot phục vụ tĩnh qua `/uploads/audio/...`.

---

## 📁 Danh sách từ vựng theo chủ đề có sẵn (`wordlists/`)

Đã biên soạn sẵn 8 chủ đề cốt lõi thường gặp nhất trong đề thi TOEIC (~240 từ):
- `contracts.txt` (30 từ - Hợp đồng & Đàm phán)
- `marketing.txt` (30 từ - Tiếp thị & Quảng cáo)
- `personnel.txt` (30 từ - Nhân sự & Tuyển dụng)
- `finance.txt` (30 từ - Tài chính, Kế toán & Ngân hàng)
- `office.txt` (30 từ - Vận hành văn phòng & Công nghệ)
- `travel.txt` (30 từ - Du lịch & Công tác)
- `shopping.txt` (30 từ - Đặt hàng, Mua sắm & Giao vận)
- `customer_service.txt` (30 từ - Chăm sóc khách hàng & Khiếu nại)

---

## 🚀 Hướng dẫn chạy

Mở Terminal tại thư mục `scripts/vocab_pipeline/`:

### 1. Chạy tự động toàn bộ các chủ đề:
```bash
python run_pipeline.py --all-topics
```
*(Script sẽ tự động duyệt qua từng file chủ đề, tạo Topic tương ứng trong Database và sinh dữ liệu + audio)*.

### 2. Chạy riêng một chủ đề bất kỳ:
```bash
# Ví dụ chạy chủ đề Contracts:
python run_pipeline.py --wordlist wordlists/contracts.txt --topic "Contracts"

# Hoặc Marketing:
python run_pipeline.py --wordlist wordlists/marketing.txt --topic "Marketing"
```

### 3. Chạy thử nghiệm giới hạn số từ:
```bash
# Chạy thử 5 từ của chủ đề Personnel:
python run_pipeline.py --wordlist wordlists/personnel.txt --limit 5
```

### 4. Chạy nhanh (chỉ tạo text & DB, bỏ qua sinh audio):
```bash
python run_pipeline.py --all-topics --skip-audio
```

---

## 📌 Cơ chế Checkpoint & Sao lưu
- **Checkpoint (`checkpoint.json`)**: Ghi nhớ các từ đã xử lý. Nếu mất kết nối mạng hoặc dừng giữa chừng, bạn chỉ cần chạy lại lệnh, script sẽ tự động tiếp tục các từ chưa xong mà **không tốn quota hay chạy lại từ đã xong**.
- **Backup (`output/`)**: Dữ liệu luôn được sao lưu song song vào `output/vocabularies.csv` và `output/vocabularies.sql`.
