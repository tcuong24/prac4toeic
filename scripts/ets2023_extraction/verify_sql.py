import json
import re
from pathlib import Path

sql = Path('scripts/ets2023_extraction/test_01_seed.sql').read_text(encoding='utf-8')

non_null = len(re.findall(r"'/uploads/images/test01/rc_passage_", sql))
null_img = sql.count(', NULL)')
print(f"Questions with reading image (rc_passage): {non_null}")
print(f"Entries with NULL image: {null_img}")

for q in [131, 147, 158, 162, 166, 176, 181, 186, 191, 196]:
    hits = re.findall(rf"\({q}, 1, {q},.*?'(/uploads/images/[^']*)'", sql)
    if hits:
        print(f"Q{q}: {hits[0]}")
    else:
        print(f"Q{q}: NOT FOUND or NULL image")
