import re
from pathlib import Path
from typing import List
from logger import logger

def extract_text_from_file(file_path: str | Path, pages: str | None = None) -> str:
    """Đọc và trích xuất text từ file .txt hoặc .pdf."""
    path = Path(file_path).resolve()
    if not path.exists():
        raise FileNotFoundError(f"Không tìm thấy file: {path}")

    suffix = path.suffix.lower()
    if suffix in [".txt", ".text"]:
        return _read_text_file(path)
    elif suffix == ".pdf":
        return _read_pdf_file(path, pages=pages)
    else:
        raise ValueError(f"Định dạng file không được hỗ trợ: {suffix}. Chỉ hỗ trợ .txt và .pdf")

def _read_text_file(path: Path) -> str:
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except UnicodeDecodeError:
        with open(path, "r", encoding="latin-1") as f:
            return f.read()

def _read_pdf_file(path: Path, pages: str | None = None) -> str:
    try:
        import pypdf
        reader = pypdf.PdfReader(str(path))
        total_pages = len(reader.pages)
        logger.info(f"[PDF] Tổng số trang trong file {path.name}: {total_pages}")

        # Xác định phạm vi trang cần đọc
        page_indices = range(total_pages)
        if pages:
            selected = set()
            for part in pages.split(","):
                part = part.strip()
                if "-" in part:
                    start, end = part.split("-")
                    start_idx = max(0, int(start) - 1)
                    end_idx = min(total_pages, int(end))
                    selected.update(range(start_idx, end_idx))
                elif part.isdigit():
                    idx = int(part) - 1
                    if 0 <= idx < total_pages:
                        selected.add(idx)
            if selected:
                page_indices = sorted(list(selected))
                logger.info(f"[PDF] Đã chọn đọc {len(page_indices)} trang: {min(page_indices)+1} -> {max(page_indices)+1}")

        text_pages = []
        for idx in page_indices:
            page = reader.pages[idx]
            txt = page.extract_text() or ""
            
            # Tự động dừng nếu phát hiện bắt đầu phần Reading (Part 5)
            if re.search(r"(?i)(?:reading\s+test|part\s+5[:\s]+incomplete\s+sentences)", txt):
                logger.info(f"[PDF] Phát hiện bắt đầu phần Reading tại trang {idx + 1}. Dừng trích xuất Listening.")
                # Lấy phần text trước khi vào Reading nếu có
                cutoff = re.split(r"(?i)(?:reading\s+test|part\s+5[:\s]+incomplete\s+sentences)", txt)[0]
                if cutoff.strip():
                    text_pages.append(cutoff)
                break

            text_pages.append(txt)

        return "\n\n--- PAGE BREAK ---\n\n".join(text_pages)
    except ImportError:
        logger.error("[PDF] Chưa cài đặt thư viện pypdf. Hãy chạy: pip install pypdf")
        raise

def clean_ocr_text(text: str) -> str:
    """Làm sạch các lỗi ký tự rác, xuống dòng và gạch nối từ OCR."""
    if not text:
        return ""

    # Nối các từ bị ngắt dòng bằng dấu gạch nối (VD: "infor-\nmation" -> "information")
    text = re.sub(r"(\b\w+)-\s*\n\s*(\w+\b)", r"\1\2", text)

    # Chuẩn hóa khoảng trắng và dấu dòng
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    # Xóa các dòng rác trang như "Page 12 of 200", "ETS TOEIC Test 1"
    text = re.sub(r"(?i)page\s+\d+(\s+of\s+\d+)?", "", text)

    # Nén nhiều dòng trống liên tiếp thành tối đa 2 dòng trống
    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip()

def chunk_transcript(text: str, max_chunk_chars: int = 3000) -> List[str]:
    """
    Chia transcript lớn thành các chunk hợp lý.
    Ưu tiên tách theo các tiêu đề câu hỏi:
    "Questions X through Y refer to...", hoặc "Question X refers to..."
    """
    cleaned = clean_ocr_text(text)

    # Pattern nhận diện mở đầu đoạn hội thoại trong Part 3/4
    split_pattern = r"(?=(?:Questions?\s+\d+(?:\s*(?:through|-|to)\s*\d+)?\s+refer\s+to)|(?:Part\s+[1-4]))"
    raw_chunks = re.split(split_pattern, cleaned, flags=re.IGNORECASE)

    chunks = []
    current_chunk = ""

    for c in raw_chunks:
        c_stripped = c.strip()
        if not c_stripped:
            continue

        if len(current_chunk) + len(c_stripped) < max_chunk_chars:
            current_chunk = f"{current_chunk}\n\n{c_stripped}".strip()
        else:
            if current_chunk:
                chunks.append(current_chunk)
            current_chunk = c_stripped

    if current_chunk:
        chunks.append(current_chunk)

    # Fallback nếu không tách được theo pattern (văn bản ngắn hoặc định dạng khác)
    if not chunks:
        chunks = [cleaned]

    logger.info(f"[EXTRACTOR] Đã phân tách transcript thành {len(chunks)} chunk văn bản để xử lý.")
    return chunks
