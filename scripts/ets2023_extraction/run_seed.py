import os
import sys
import psycopg2
from pathlib import Path
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = Path(__file__).resolve().parents[2]
ENV_PATH = ROOT_DIR / ".env"
load_dotenv(ENV_PATH)

db_name = os.getenv("DB_NAME", "prac4toeic")
db_user = os.getenv("DB_USER", "postgres")
db_password = os.getenv("DB_PASSWORD", "123456")
db_port = os.getenv("DB_PORT", "5432")
db_host = os.getenv("DB_HOST", "localhost")

def run_all_seeds():
    script_dir = Path(__file__).resolve().parent
    sql_files = sorted(script_dir.glob("test_*_seed.sql"))
    
    if not sql_files:
        print("No seed SQL files found.")
        return

    print(f"Connecting to database '{db_name}' at {db_host}:{db_port}...")
    try:
        conn = psycopg2.connect(
            dbname=db_name,
            user=db_user,
            password=db_password,
            host=db_host,
            port=db_port
        )
        cur = conn.cursor()
        
        for sql_file in sql_files:
            print(f"Executing {sql_file.name}...")
            with open(sql_file, "r", encoding="utf-8") as f:
                sql = f.read()
            cur.execute(sql)
            conn.commit()
            print(f" -> [SUCCESS] Imported {sql_file.name}")
            
        cur.close()
        conn.close()
        print("\nAll seeds executed successfully!")
    except Exception as e:
        print(f"Database error: {e}")

if __name__ == "__main__":
    run_all_seeds()
