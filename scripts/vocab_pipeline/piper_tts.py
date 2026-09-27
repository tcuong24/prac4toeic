import os
import sys
import wave
import urllib.request
import subprocess
from pathlib import Path
from logger import logger

MODEL_NAME = "en_US-ryan-high"
MODEL_URL = "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/ryan/high/en_US-ryan-high.onnx"
CONFIG_URL = "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/ryan/high/en_US-ryan-high.onnx.json"

CURRENT_DIR = Path(__file__).parent.resolve()
MODELS_DIR = CURRENT_DIR / "models"
MODEL_PATH = MODELS_DIR / f"{MODEL_NAME}.onnx"
CONFIG_PATH = MODELS_DIR / f"{MODEL_NAME}.onnx.json"


def ensure_model_downloaded():
    """Tự động tải voice model Ryan High từ HuggingFace nếu chưa tồn tại."""
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    def _download(url: str, dest_path: Path):
        if not dest_path.exists():
            logger.info(f"[PIPER] Dang tai voice model: {dest_path.name} tu HuggingFace...")
            urllib.request.urlretrieve(url, dest_path)
            logger.info(f"[PIPER] Da tai xong: {dest_path.name}")

    _download(MODEL_URL, MODEL_PATH)
    _download(CONFIG_URL, CONFIG_PATH)


class PiperSynthesizer:
    def __init__(self):
        ensure_model_downloaded()
        self.voice = None
        self._init_engine()

    def _init_engine(self):
        try:
            from piper.voice import PiperVoice
            logger.info(f"[PIPER] Khoi tao Piper TTS Engine (Model: {MODEL_NAME})...")
            self.voice = PiperVoice.load(str(MODEL_PATH), config_path=str(CONFIG_PATH))
        except ImportError:
            logger.warning("[PIPER] Thu vien piper-tts chua duoc cai qua pip. Se thu dung lenh CLI piper...")

    def synthesize(self, text: str, output_path: str | Path) -> str:
        """Sinh file WAV từ đoạn text và lưu vào output_path."""
        text = text.strip()
        output_file = Path(output_path).resolve()
        output_file.parent.mkdir(parents=True, exist_ok=True)

        try:
            if self.voice is not None:
                with wave.open(str(output_file), "wb") as wav_file:
                    self.voice.synthesize_wav(text, wav_file)
            else:
                cmd = ["piper", "--model", str(MODEL_PATH), "--output_file", str(output_file)]
                res = subprocess.run(cmd, input=text.encode("utf-8"), capture_output=True)
                if res.returncode != 0:
                    err_msg = res.stderr.decode("utf-8", errors="ignore")
                    logger.error(f"[PIPER CLI ERROR] Loi khi chay CLI: {err_msg}")
                    raise RuntimeError(err_msg)

            logger.debug(f"[PIPER OK] Da sinh audio: {output_file.name} ({os.path.getsize(output_file)} bytes)")
            return str(output_file)
        except Exception as e:
            logger.error(f"[PIPER ERROR] Loi khi sinh audio cho text '{text[:30]}...': {e}", exc_info=True)
            raise


if __name__ == "__main__":
    synthesizer = PiperSynthesizer()
    test_file = CURRENT_DIR / "test_ryan.wav"
    synthesizer.synthesize("Welcome to the TOEIC preparation platform. Let's practice speaking!", test_file)
    logger.info(f"[PIPER OK] Audio test tao thanh cong tai: {test_file} ({os.path.getsize(test_file)} bytes)")
