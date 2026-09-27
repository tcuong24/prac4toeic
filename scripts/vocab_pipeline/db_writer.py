import os
import csv
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional
from logger import logger

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    HAS_PSYCOPG2 = True
except ImportError:
    HAS_PSYCOPG2 = False


class DatabaseWriter:
    def __init__(self, output_dir: Path):
        self.output_dir = output_dir
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        self.csv_path = self.output_dir / "vocabularies.csv"
        self.sql_path = self.output_dir / "vocabularies.sql"
        
        self.db_host = os.getenv("DB_HOST", "localhost")
        self.db_port = int(os.getenv("DB_PORT", "5432"))
        self.db_name = os.getenv("DB_NAME", "prac4toeic")
        self.db_user = os.getenv("DB_USER", "postgres")
        self.db_pass = os.getenv("DB_PASSWORD", "123456")
        
        self.conn = None
        self._init_db_connection()
        self._init_csv()

    def _init_db_connection(self):
        if not HAS_PSYCOPG2:
            logger.warning("[DB] Thu vien 'psycopg2' chua duoc cai dat. Du lieu se chi duoc luu ra CSV va SQL.")
            return

        try:
            self.conn = psycopg2.connect(
                host=self.db_host,
                port=self.db_port,
                dbname=self.db_name,
                user=self.db_user,
                password=self.db_pass,
                connect_timeout=5
            )
            self.conn.autocommit = True
            logger.info(f"[DB] Ket noi thanh cong toi PostgreSQL: {self.db_host}:{self.db_port}/{self.db_name}")
        except Exception as e:
            logger.warning(f"[DB] Khong the ket noi PostgreSQL ({self.db_host}:{self.db_port}/{self.db_name}): {e}. Du lieu van duoc xuat ra CSV va SQL.")
            self.conn = None

    def _init_csv(self):
        if not self.csv_path.exists():
            with open(self.csv_path, "w", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)
                writer.writerow([
                    "topic_name", "word", "phonetic", "part_of_speech",
                    "meaning_vi", "example_en", "example_vi", "audio_url"
                ])

    def get_or_create_topic(self, topic_name: str) -> Optional[int]:
        """Tìm hoặc tạo mới Topic trong bảng topics."""
        if not self.conn:
            return None

        clean_topic = topic_name.strip()
        with self.conn.cursor() as cur:
            cur.execute("SELECT id FROM topics WHERE name = %s;", (clean_topic,))
            row = cur.fetchone()
            if row:
                return row[0]

            now = datetime.now()
            cur.execute(
                """
                INSERT INTO topics (name, description, created_at, updated_at)
                VALUES (%s, %s, %s, %s)
                RETURNING id;
                """,
                (clean_topic, f"Từ vựng TOEIC chủ đề {clean_topic}", now, now)
            )
            new_id = cur.fetchone()[0]
            logger.info(f"[DB] Da tao Topic moi trong DB: '{clean_topic}' (ID: {new_id})")
            return new_id

    def save_vocabulary(self, data: Dict[str, Any]):
        """Lưu từ vựng vào PostgreSQL, file CSV và file SQL."""
        topic_name = data.get("topic_name", "General Business")
        word = data["word"]
        phonetic = data.get("phonetic", "")
        part_of_speech = data.get("part_of_speech", "noun")
        meaning_vi = data.get("meaning_vi", "")
        example_en = data.get("example_en", "")
        example_vi = data.get("example_vi", "")
        audio_url = data.get("audio_url", "")

        # 1. Ghi vào PostgreSQL (nếu có kết nối)
        if self.conn:
            try:
                topic_id = self.get_or_create_topic(topic_name)
                with self.conn.cursor() as cur:
                    now = datetime.now()
                    cur.execute(
                        "SELECT id FROM vocabularies WHERE word = %s AND topic_id = %s;",
                        (word, topic_id)
                    )
                    existing = cur.fetchone()
                    if existing:
                        cur.execute(
                            """
                            UPDATE vocabularies
                            SET phonetic = %s, part_of_speech = %s, meaning_vi = %s,
                                example_en = %s, example_vi = %s, audio_url = %s, updated_at = %s
                            WHERE id = %s;
                            """,
                            (phonetic, part_of_speech, meaning_vi, example_en, example_vi, audio_url, now, existing[0])
                        )
                    else:
                        cur.execute(
                            """
                            INSERT INTO vocabularies (
                                topic_id, word, phonetic, part_of_speech,
                                meaning_vi, example_en, example_vi, audio_url,
                                created_at, updated_at
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
                            """,
                            (topic_id, word, phonetic, part_of_speech, meaning_vi, example_en, example_vi, audio_url, now, now)
                        )
            except Exception as e:
                logger.error(f"[DB ERROR] Loi khi luu vao PostgreSQL cho tu '{word}': {e}", exc_info=True)

        # 2. Append vào file CSV
        with open(self.csv_path, "a", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow([
                topic_name, word, phonetic, part_of_speech,
                meaning_vi, example_en, example_vi, audio_url
            ])

        # 3. Append vào file SQL
        sql_escaped_word = word.replace("'", "''")
        sql_escaped_meaning = meaning_vi.replace("'", "''")
        sql_escaped_ex_en = example_en.replace("'", "''")
        sql_escaped_ex_vi = example_vi.replace("'", "''")
        sql_escaped_topic = topic_name.replace("'", "''")

        sql_line = (
            f"INSERT INTO vocabularies (topic_id, word, phonetic, part_of_speech, meaning_vi, example_en, example_vi, audio_url, created_at, updated_at) "
            f"VALUES ((SELECT id FROM topics WHERE name = '{sql_escaped_topic}' LIMIT 1), "
            f"'{sql_escaped_word}', '{phonetic}', '{part_of_speech}', '{sql_escaped_meaning}', '{sql_escaped_ex_en}', '{sql_escaped_ex_vi}', '{audio_url}', NOW(), NOW()) "
            f"ON CONFLICT DO NOTHING;\n"
        )
        with open(self.sql_path, "a", encoding="utf-8") as f:
            f.write(sql_line)

    def close(self):
        if self.conn:
            self.conn.close()
