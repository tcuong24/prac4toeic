import os
import wave
import shutil
import urllib.request
from pathlib import Path
from typing import List, Dict, Any, Optional
from logger import logger

# Đường dẫn thư mục models
CURRENT_DIR = Path(__file__).parent.resolve()
MODELS_DIR = CURRENT_DIR / "models"
VOCAB_MODELS_DIR = CURRENT_DIR.parent / "vocab_pipeline" / "models"

VOICE_CONFIGS = {
    "male": {
        "name": "en_US-ryan-high",
        "onnx_url": "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/ryan/high/en_US-ryan-high.onnx",
        "json_url": "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/ryan/high/en_US-ryan-high.onnx.json",
    },
    "female": {
        "name": "en_US-lessac-medium",
        "onnx_url": "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx",
        "json_url": "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json",
    },
}

def ensure_voice_model(voice_type: str = "male") -> tuple[Path, Path]:
    """Kiểm tra và tự động tải voice model nếu chưa có."""
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    cfg = VOICE_CONFIGS[voice_type]
    model_name = cfg["name"]

    model_path = MODELS_DIR / f"{model_name}.onnx"
    json_path = MODELS_DIR / f"{model_name}.onnx.json"

    # Kiểm tra nếu đã có ở vocab_pipeline thì sao chép sang để tiết kiệm băng thông
    if not model_path.exists():
        src_model = VOCAB_MODELS_DIR / f"{model_name}.onnx"
        src_json = VOCAB_MODELS_DIR / f"{model_name}.onnx.json"
        if src_model.exists() and src_json.exists():
            logger.info(f"[TTS] Tái sử dụng model {model_name} từ vocab_pipeline...")
            shutil.copy2(src_model, model_path)
            shutil.copy2(src_json, json_path)
            return model_path, json_path

    def _download(url: str, dest: Path):
        if not dest.exists():
            logger.info(f"[TTS] Đang tải {dest.name} từ HuggingFace...")
            urllib.request.urlretrieve(url, dest)
            logger.info(f"[TTS] Tải thành công: {dest.name}")

    _download(cfg["onnx_url"], model_path)
    _download(cfg["json_url"], json_path)
    return model_path, json_path


class MultiPiperSynthesizer:
    def __init__(self):
        self.voices: Dict[str, Any] = {}
        self._init_voices()

    def _init_voices(self):
        try:
            from piper.voice import PiperVoice
            for v_type in ["male", "female"]:
                m_path, j_path = ensure_voice_model(v_type)
                logger.info(f"[TTS] Nạp engine Piper cho giọng {v_type} ({m_path.name})...")
                self.voices[v_type] = PiperVoice.load(str(m_path), config_path=str(j_path))
        except ImportError:
            logger.warning("[TTS WARN] Thư viện python piper-tts chưa được nạp. Đảm bảo đã cài đặt piper.")

    def synthesize_single_turn(self, text: str, speaker: str, temp_wav_path: Path):
        """Sinh audio cho 1 câu thoại đơn lẻ."""
        speaker_lower = speaker.lower()
        if "woman" in speaker_lower or "female" in speaker_lower:
            voice_type = "female"
        else:
            voice_type = "male"  # Man, Narrator

        voice = self.voices.get(voice_type)
        if not voice:
            raise RuntimeError(f"Engine cho voice {voice_type} chưa sẵn sàng.")

        with wave.open(str(temp_wav_path), "wb") as wav_file:
            voice.synthesize_wav(text.strip(), wav_file)

    def create_silence_wav(self, duration_ms: int, sample_rate: int, channels: int, sampwidth: int) -> bytes:
        """Tạo dữ liệu frame khoảng lặng (silence) theo mili-giây."""
        num_frames = int(sample_rate * (duration_ms / 1000.0))
        return b"\x00" * (num_frames * channels * sampwidth)

    def synthesize_dialogue(
        self,
        turns: List[Dict[str, str]],
        output_path: str | Path,
        normal_pause_ms: int = 400,
        question_pause_ms: int = 6000,
    ) -> str:
        """
        Ghép nối các lượt thoại và khoảng lặng thành một file audio master hoàn chỉnh.
        - Giữa các câu thoại bình thường: pause ~400ms.
        - Giữa các câu hỏi của Narrator: pause ~6-8s (để thí sinh chọn đáp án).
        """
        out_file = Path(output_path).resolve()
        out_file.parent.mkdir(parents=True, exist_ok=True)
        temp_dir = out_file.parent / "temp_turns"
        temp_dir.mkdir(parents=True, exist_ok=True)

        turn_files: List[Path] = []

        try:
            # 1. Sinh audio cho từng turn
            for i, turn in enumerate(turns):
                t_speaker = turn.get("speaker", "Man")
                t_text = turn.get("text", "")
                if not t_text.strip():
                    continue

                turn_path = temp_dir / f"turn_{i}_{t_speaker}.wav"
                self.synthesize_single_turn(t_text, t_speaker, turn_path)
                turn_files.append(turn_path)

            if not turn_files:
                raise ValueError("Không có nội dung thoại hợp lệ để xuất audio.")

            # 2. Đọc thông số WAV từ turn đầu tiên
            with wave.open(str(turn_files[0]), "rb") as first_wav:
                params = first_wav.getparams()
                sample_rate = params.framerate
                channels = params.nchannels
                sampwidth = params.sampwidth

            # 3. Ghép nối vào file master
            with wave.open(str(out_file), "wb") as master_wav:
                master_wav.setparams(params)

                for i, t_file in enumerate(turn_files):
                    with wave.open(str(t_file), "rb") as cur_wav:
                        frames = cur_wav.readframes(cur_wav.getnframes())
                        master_wav.writeframes(frames)

                    # Thêm khoảng lặng sau mỗi câu thoại (ngoại trừ câu cuối cùng)
                    if i < len(turn_files) - 1:
                        next_turn = turns[i + 1] if i + 1 < len(turns) else {}
                        next_text = next_turn.get("text", "")
                        is_question_read = "number " in next_text.lower() or "question " in next_text.lower()

                        pause_ms = question_pause_ms if is_question_read else normal_pause_ms
                        silence_data = self.create_silence_wav(pause_ms, sample_rate, channels, sampwidth)
                        master_wav.writeframes(silence_data)

            logger.info(f"[TTS MASTER OK] Đã tạo audio hội thoại hoàn chỉnh: {out_file.name} ({out_file.stat().st_size} bytes)")
            return str(out_file)

        finally:
            # Dọn dẹp các file tạm
            if temp_dir.exists():
                shutil.rmtree(temp_dir, ignore_errors=True)
