# TÀI LIỆU ĐẶC TẢ PHẦN MỀM
## Nền tảng học tiếng Anh chuẩn TOEIC (Từ vựng – Nói – Viết)

| Thông tin | Chi tiết |
|---|---|
| Phiên bản | 1.0 |
| Ngày cập nhật | 10/09/2026 |
| Backend | Java 25 + Spring Boot 3.x |
| Frontend | Vite.js (React) |
| Database | PostgreSQL |
| Đối tượng đọc | Dev team, QA, PM |

---

## 1. TỔNG QUAN DỰ ÁN

### 1.1. Mục tiêu
Xây dựng nền tảng web hỗ trợ người học ôn luyện TOEIC với 3 trụ cột chính:
- Học và ghi nhớ từ vựng theo phương pháp lặp lại ngắt quãng (Spaced Repetition)
- Luyện nói theo cấu trúc TOEIC Speaking, chấm điểm bằng AI
- Luyện viết theo cấu trúc TOEIC Writing, chấm điểm và feedback bằng AI

### 1.2. Phạm vi (Scope)
**Trong phạm vi (In-scope):**
- Quản lý tài khoản người dùng
- Module từ vựng (flashcard, SRS, quiz)
- Module luyện nói (ghi âm, chấm điểm AI)
- Module luyện viết (chấm điểm AI, phát hiện lỗi)
- Module test/kiểm tra (mini test, mock test, placement test)
- Theo dõi tiến độ học tập, gamification cơ bản

**Ngoài phạm vi (Out-of-scope) ở phiên bản 1.0:**
- Luyện Listening/Reading dạng thi thật (200 câu, 7 part) — để lại cho phase sau
- Thanh toán/gói premium
- Ứng dụng mobile native (chỉ web responsive)
- Tính năng lớp học / giáo viên quản lý học viên

### 1.3. Đối tượng người dùng
- Sinh viên/người đi làm cần chứng chỉ TOEIC (mục tiêu 500–900 điểm)
- Tự học, không có giáo viên kèm trực tiếp

---

## 2. KIẾN TRÚC HỆ THỐNG

### 2.1. Kiến trúc tổng thể

```
┌─────────────────────┐        HTTPS/REST       ┌──────────────────────────┐
│   Frontend (Vite)    │ ───────────────────────▶│   Backend (Spring Boot)  │
│   React + TypeScript │ ◀─────────────────────── │   Java 25                │
└─────────────────────┘        JSON/REST          └──────────────────────────┘
                                                              │
                          ┌───────────────────────────────────┼─────────────────────┐
                          ▼                                   ▼                     ▼
                 ┌────────────────┐                ┌──────────────────┐   ┌──────────────────┐
                 │  PostgreSQL     │                │  Object Storage   │   │  AI Services       │
                 │  (dữ liệu chính)│                │  (S3/Cloudinary)  │   │  - Gemini API      │
                 └────────────────┘                │  audio/hình ảnh   │   │  - Speech-to-Text  │
                                                    └──────────────────┘   └──────────────────┘
```

### 2.2. Backend – Spring Boot (Java 25)

**Kiến trúc phân lớp (Layered Architecture) theo module:**

```
src/main/java/com/toeicapp/
├── config/                 # CORS, Security, WebClient, Async config
├── common/                 # Exception handler, response wrapper, utils
├── modules/
│   ├── auth/                # đăng ký, đăng nhập, JWT
│   ├── user/                 # user profile, progress tổng hợp
│   ├── vocabulary/           # từ vựng, SRS
│   ├── speaking/              # luyện nói + chấm điểm AI
│   ├── writing/                # luyện viết + chấm điểm AI
│   ├── test/                    # test/mock test + test_attempts (log tiến độ)
│   └── gamification/            # badge, streak, điểm thưởng
└── ToeicAppApplication.java
```

Mỗi module theo cấu trúc con:
```
vocabulary/
├── controller/   VocabularyController.java
├── service/      VocabularyService.java, SrsService.java (thuật toán SM-2)
├── repository/   VocabularyRepository.java (Spring Data JPA)
├── entity/       Vocabulary.java, UserVocabularyProgress.java
├── dto/          VocabularyResponseDto.java, ReviewRequestDto.java
└── mapper/       VocabularyMapper.java (MapStruct)
```

**Công nghệ backend đề xuất:**
| Thành phần | Công nghệ |
|---|---|
| Ngôn ngữ | Java 25 (dùng Virtual Threads cho I/O-bound calls tới AI service) |
| Framework | Spring Boot 3.x |
| ORM | Spring Data JPA + Hibernate |
| Bảo mật | Spring Security + JWT (access + refresh token) |
| Validation | Jakarta Bean Validation |
| Mapping DTO | MapStruct |
| Gọi AI ngoài | Spring WebClient (reactive, non-blocking) |
| Xử lý audio async | Spring Async / Virtual Threads |
| Migration DB | Flyway |
| API doc | springdoc-openapi (Swagger UI) |
| Test | JUnit 5 + Mockito + Testcontainers |

**Lưu ý về Java 25:** tận dụng Virtual Threads (Project Loom, ổn định từ Java 21+) cho các luồng gọi AI chấm điểm speaking/writing — tránh nghẽn thread pool khi nhiều người dùng chấm bài cùng lúc; đồng thời có thể dùng Structured Concurrency (tính năng preview qua các bản Java gần đây) để gộp song song việc gọi Speech-to-Text + gọi AI feedback trong cùng 1 request.

### 2.3. Frontend – Vite.js

```
src/
├── api/                  # axios instance, các hàm gọi API theo module
├── components/           # component dùng chung (Button, Modal, AudioRecorder...)
├── features/
│   ├── auth/
│   ├── vocabulary/         # Flashcard, QuizCard, ReviewQueue
│   ├── speaking/            # Recorder, ScoreResult
│   ├── writing/              # Editor, FeedbackPanel
│   ├── test/                  # TestRunner, ProgressBar, ResultSummary
│   └── dashboard/              # biểu đồ tiến độ
├── hooks/                 # useAuth, useSrsQueue, useRecorder
├── store/                 # Zustand/Redux Toolkit (state quản lý phiên test)
├── routes/                # React Router config
└── main.tsx
```

**Công nghệ frontend đề xuất:**
| Thành phần | Công nghệ |
|---|---|
| Build tool | Vite |
| Framework UI | React 18+ (TypeScript) |
| Routing | React Router v6 |
| State management | Zustand (nhẹ, phù hợp lưu trạng thái test đang làm) |
| Gọi API | Axios + React Query (cache, retry, đồng bộ trạng thái) |
| Ghi âm | MediaRecorder API (Web Audio API) |
| Style | TailwindCSS |
| Chart | Recharts (biểu đồ tiến độ) |

---

## 3. ĐẶC TẢ CHỨC NĂNG THEO MODULE

### 3.1. Module Xác thực (Auth)

| Mã | Chức năng | Mô tả |
|---|---|---|
| AUTH-01 | Đăng ký | Email + mật khẩu, validate email trùng |
| AUTH-02 | Đăng nhập | Trả về access token (JWT, 15 phút) + refresh token (7 ngày) |
| AUTH-03 | Refresh token | Cấp lại access token khi hết hạn |
| AUTH-04 | Đăng xuất | Vô hiệu hoá refresh token (lưu blacklist/redis hoặc DB) |

**API endpoints:**
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
```

---

### 3.2. Module Từ vựng (Vocabulary)

| Mã | Chức năng | Mô tả |
|---|---|---|
| VOC-01 | Xem danh sách từ theo chủ đề | Phân trang, lọc theo topic/difficulty |
| VOC-02 | Tra từ (search) | Full-text search trên bảng `vocabularies` |
| VOC-03 | Lấy hàng đợi ôn tập (review queue) | Trả về các từ có `next_review_date <= today`, sắp theo độ ưu tiên |
| VOC-04 | Chấm kết quả ôn tập | Người dùng đánh giá độ nhớ (Again/Hard/Good/Easy) → cập nhật SM-2 (`ease_factor`, `interval_days`, `next_review_date`) |
| VOC-05 | Quiz trắc nghiệm | Sinh câu hỏi trắc nghiệm từ tập từ đã học |
| VOC-06 | Thống kê từ vựng cá nhân | Số từ mới / đang học / đã thuộc |

**API endpoints:**
```
GET  /api/vocabulary?topicId=&page=&size=
GET  /api/vocabulary/search?q=
GET  /api/vocabulary/review-queue
POST /api/vocabulary/{id}/review     body: { grade: "AGAIN"|"HARD"|"GOOD"|"EASY" }
GET  /api/vocabulary/quiz?topicId=&count=
GET  /api/vocabulary/stats
```

**Business rule quan trọng — thuật toán SM-2 rút gọn:**
```
input: grade (0-5), ease_factor hiện tại, interval hiện tại, review_count
if grade < 3:
    review_count = 0
    interval_days = 1
else:
    if review_count == 0: interval_days = 1
    elif review_count == 1: interval_days = 6
    else: interval_days = round(interval_days * ease_factor)
    ease_factor = max(1.3, ease_factor + (0.1 - (5-grade)*(0.08+(5-grade)*0.02)))
    review_count += 1
next_review_date = today + interval_days
```

---

### 3.3. Module Luyện nói (Speaking)

| Mã | Chức năng | Mô tả |
|---|---|---|
| SPK-01 | Xem danh sách bài luyện theo Part | Part 1–4 theo cấu trúc TOEIC Speaking |
| SPK-02 | Ghi âm câu trả lời | Frontend ghi âm (MediaRecorder), upload file lên Object Storage |
| SPK-03 | Chấm điểm AI | Backend gửi audio → Speech-to-Text → transcript → gửi AI chấm phát âm/trôi chảy/ngữ điệu |
| SPK-04 | Xem lịch sử luyện tập | Danh sách các lần luyện + điểm + feedback |
| SPK-05 | Nghe bài mẫu | Phát audio mẫu điểm cao để so sánh |

**API endpoints:**
```
GET  /api/speaking/exercises?part=&difficulty=
GET  /api/speaking/exercises/{id}
POST /api/speaking/exercises/{id}/submit    multipart: audio file
GET  /api/speaking/attempts/{id}            (xem kết quả chấm điểm, có thể polling nếu xử lý async)
GET  /api/speaking/attempts?userId=
```

**Luồng xử lý chấm điểm (async, do gọi AI mất thời gian):**
```
1. FE upload audio → BE lưu file → tạo record user_speaking_attempts (status=PENDING)
2. BE trả về attemptId ngay (202 Accepted)
3. BE xử lý bất đồng bộ (Virtual Thread / @Async):
   a. Gọi Speech-to-Text lấy transcript
   b. Gọi AI (Gemini) chấm điểm dựa trên transcript + tiêu chí TOEIC Speaking
   c. Cập nhật record: pronunciation_score, fluency_score, ai_feedback, status=DONE
4. FE polling GET /api/speaking/attempts/{id} hoặc dùng WebSocket để nhận kết quả real-time
```

---

### 3.4. Module Luyện viết (Writing)

| Mã | Chức năng | Mô tả |
|---|---|---|
| WRT-01 | Xem danh sách bài luyện theo Part | Part 1: mô tả tranh, Part 2: trả lời email, Part 3: luận |
| WRT-02 | Nộp bài viết | Text editor, đếm từ, giới hạn thời gian |
| WRT-03 | Chấm điểm AI | Gửi nội dung → AI chấm theo tiêu chí TOEIC Writing (ngữ pháp, từ vựng, mạch lạc) |
| WRT-04 | Xem lỗi chi tiết | Highlight lỗi trong bài, kèm giải thích và gợi ý sửa |
| WRT-05 | Theo dõi lỗi lặp lại | Thống kê loại lỗi người dùng hay mắc theo thời gian |

**API endpoints:**
```
GET  /api/writing/exercises?part=
POST /api/writing/exercises/{id}/submit     body: { content: string }
GET  /api/writing/submissions/{id}
GET  /api/writing/submissions?userId=
GET  /api/writing/error-stats?userId=       (thống kê lỗi lặp lại theo error_type)
```

---

### 3.5. Module Test / Kiểm tra (có log tiến độ)

| Mã | Chức năng | Mô tả |
|---|---|---|
| TST-01 | Bắt đầu bài test | Tạo `test_attempts` (status=IN_PROGRESS) |
| TST-02 | Trả lời câu hỏi | Lưu ngay từng câu vào `test_attempt_answers`, ghi log vào `test_activity_logs` |
| TST-03 | Resume bài test dở | Nếu có attempt IN_PROGRESS, cho phép tiếp tục từ `current_question_index` |
| TST-04 | Nộp bài | Tính điểm, cập nhật `status=COMPLETED`, ghi vào `user_test_results` |
| TST-05 | Theo dõi hoạt động bất thường | Ghi nhận `tab_blur`/`tab_focus` để phát hiện rời khỏi màn hình khi đang thi |
| TST-06 | Xem kết quả & giải thích đáp án | Chi tiết đúng/sai từng câu kèm `explanation` |

**API endpoints:**
```
POST /api/tests/{testId}/attempts                  → tạo attempt mới, trả attemptId
GET  /api/tests/attempts/current                   → lấy attempt IN_PROGRESS (nếu có) để resume
PATCH /api/tests/attempts/{attemptId}/answers       body: { questionId, selectedAnswer }
POST /api/tests/attempts/{attemptId}/activity-log   body: { eventType, questionId?, metadata? }
POST /api/tests/attempts/{attemptId}/submit
GET  /api/tests/attempts/{attemptId}/result
```

**Business rule:**
- Mỗi user chỉ có tối đa 1 `test_attempts` với `status=IN_PROGRESS` cho mỗi `test_id` tại một thời điểm
- Cron job (chạy mỗi 15 phút) quét các attempt có `last_activity_at` quá X phút không cập nhật → tự động chuyển `status=ABANDONED`
- `PATCH answers` cần cập nhật `time_spent_seconds` và tăng `answer_change_count` nếu người dùng đổi đáp án đã chọn trước đó

---

### 3.6. Module Gamification

| Mã | Chức năng | Mô tả |
|---|---|---|
| GAM-01 | Cập nhật streak | Tăng `streak_count` nếu học liên tục ngày kế tiếp, reset nếu bỏ 1 ngày |
| GAM-02 | Trao huy hiệu | Kiểm tra điều kiện (`condition_type`) sau mỗi hành động học, tự động cấp badge |
| GAM-03 | Xem dashboard tiến độ | Tổng hợp: số từ đã học, điểm test gần nhất, streak, badge đã đạt |

---

## 4. YÊU CẦU PHI CHỨC NĂNG (NON-FUNCTIONAL REQUIREMENTS)

| Loại | Yêu cầu |
|---|---|
| Hiệu năng | API p95 < 500ms (trừ các API gọi AI chấm điểm, xử lý bất đồng bộ) |
| Khả năng mở rộng | Backend stateless, có thể scale horizontal; audio/hình ảnh lưu Object Storage, không lưu local disk |
| Bảo mật | JWT + refresh token rotation, mã hoá password bằng BCrypt, validate input tránh injection |
| Khả dụng | Retry + circuit breaker khi gọi AI service ngoài (Resilience4j) |
| Khả năng quan sát (Observability) | Structured logging (JSON), correlation ID theo request, tích hợp Actuator + Micrometer cho metrics |
| Tương thích | Frontend responsive, hỗ trợ Chrome/Edge/Safari bản mới (MediaRecorder API cần HTTPS) |
| Đa ngôn ngữ | UI hỗ trợ song ngữ Việt/Anh (i18n) — chuẩn bị cấu trúc nhưng có thể làm sau |

---

## 5. LUỒNG NGƯỜI DÙNG CHÍNH (USER FLOW)

### 5.1. Luồng học từ vựng
```
Đăng nhập → Chọn chủ đề → Học từ mới (flashcard)
  → Làm quiz củng cố → Hệ thống xếp vào hàng đợi ôn tập theo SRS
  → Ngày hôm sau: hệ thống nhắc ôn tập → đánh giá độ nhớ → cập nhật lịch ôn tiếp theo
```

### 5.2. Luồng luyện nói
```
Chọn Part → Nghe/đọc đề → Ghi âm trả lời → Upload
  → (xử lý AI bất đồng bộ) → Nhận điểm + feedback chi tiết
  → Nghe lại bài mẫu để so sánh → Luyện lại nếu cần
```

### 5.3. Luồng làm test
```
Chọn bài test → Bắt đầu (tạo attempt) → Trả lời từng câu (auto-save)
  → [Nếu thoát giữa chừng] → Quay lại → hệ thống hỏi "Tiếp tục bài đang làm?"
  → Nộp bài → Xem kết quả chi tiết + giải thích đáp án
```

---

## 6. MÔ HÌNH DỮ LIỆU

Xem chi tiết trong file `database-schema.dbml` (đã thiết kế riêng, gồm các nhóm bảng):
- User & Auth: `users`, `user_profiles`
- Vocabulary: `topics`, `vocabularies`, `user_vocabulary_progress`
- Speaking: `speaking_exercises`, `user_speaking_attempts`
- Writing: `writing_exercises`, `user_writing_submissions`, `writing_errors`
- Test & Progress logging: `tests`, `test_questions`, `user_test_results`, `test_attempts`, `test_attempt_answers`, `test_activity_logs`
- Gamification: `badges`, `user_badges`

---

## 7. LỘ TRÌNH TRIỂN KHAI ĐỀ XUẤT (ROADMAP)

| Giai đoạn | Nội dung |
|---|---|
| Sprint 1 | Setup project (Spring Boot + Vite), Auth module, DB migration (Flyway) |
| Sprint 2 | Module Vocabulary (CRUD, SRS, quiz) |
| Sprint 3 | Module Test cơ bản (không log tiến độ nâng cao) |
| Sprint 4 | Module Test nâng cao (`test_attempts`, resume, activity log) |
| Sprint 5 | Module Writing (chấm điểm AI + phát hiện lỗi) |
| Sprint 6 | Module Speaking (ghi âm + Speech-to-Text + chấm điểm AI) |
| Sprint 7 | Gamification + Dashboard tổng hợp |
| Sprint 8 | Kiểm thử tổng thể, tối ưu hiệu năng, chuẩn bị triển khai |

---

## 8. RỦI RO VÀ GIẢI PHÁP

| Rủi ro | Giải pháp |
|---|---|
| Chi phí gọi AI (Gemini/Speech-to-Text) cao khi scale | Giới hạn số lần chấm điểm/ngày cho tài khoản free, cache kết quả tương tự |
| Độ trễ khi chấm điểm AI | Xử lý bất đồng bộ, hiển thị trạng thái "đang chấm điểm" cho người dùng |
| Chất lượng ghi âm kém ảnh hưởng chấm điểm | Kiểm tra chất lượng audio trước khi gửi AI (độ dài tối thiểu, mức âm lượng) |
| Người dùng gian lận khi làm test | Ghi log `tab_blur`/`tab_focus`, giới hạn thời gian cứng theo `duration_minutes` |