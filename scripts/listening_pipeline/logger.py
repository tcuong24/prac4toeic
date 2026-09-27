import logging
import sys
from pathlib import Path

LOGS_DIR = Path(__file__).parent / "logs"
LOGS_DIR.mkdir(parents=True, exist_ok=True)
LOG_FILE = LOGS_DIR / "listening_pipeline.log"

logger = logging.getLogger("listening_pipeline")
logger.setLevel(logging.DEBUG)

if not logger.handlers:
    # Đảm bảo stdout hỗ trợ UTF-8 đầy đủ trên Windows
    try:
        if sys.platform == "win32":
            import io
            stream = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
        else:
            stream = sys.stdout
    except Exception:
        stream = sys.stdout

    c_handler = logging.StreamHandler(stream)
    c_handler.setLevel(logging.INFO)
    c_format = logging.Formatter("[%(asctime)s] %(levelname)s - %(message)s", datefmt="%H:%M:%S")
    c_handler.setFormatter(c_format)
    logger.addHandler(c_handler)

    f_handler = logging.FileHandler(LOG_FILE, encoding="utf-8")
    f_handler.setLevel(logging.DEBUG)
    f_format = logging.Formatter("[%(asctime)s] [%(levelname)s] (%(filename)s:%(lineno)d) - %(message)s")
    f_handler.setFormatter(f_format)
    logger.addHandler(f_handler)
