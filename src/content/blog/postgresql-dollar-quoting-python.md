---
title: পাইথন স্ট্রিং-এর মধ্যে পোস্টগ্রেসকিউএল ডলার $$ কোটিং
description: PostgreSQL-এর ডলার-কোটিং সিনট্যাক্সের গভীর বিশ্লেষণ, পাইথনের স্টোরড
  প্রসিডিউরের জন্য এটি কেন অপরিহার্য, এবং Django ও FastAPI কোডবেসে কীভাবে
  নিরাপদে জটিল SQL এম্বেড করা যায়।
pubDate: 2025-06-01
tags:
  - PostgreSQL
  - Python
  - Backend
draft: false
---
## ডলার কোটিং কী?

PostgreSQL একটি নন-স্ট্যান্ডার্ড কোটিং পদ্ধতি সাপোর্ট করে, যাকে বলা হয় **ডলার কোটিং** (`$$`)। এর মাধ্যমে আপনি লিটারাল স্ট্রিং — এমনকি সিঙ্গেল কোট সহ — কোনো এসকেপিং ছাড়াই এমবেড করতে পারেন। পাইথন থেকে সরাসরি স্টোরড প্রসিডিউর ও ফাংশন লেখার সময় এটি অমূল্য।

স্ট্যান্ডার্ড সিঙ্গেল-কোট কোটিং তখনই ভেঙে পড়ে, যখন আপনার SQL বডিতে নিজস্ব কোট থাকে:

```sql
-- ফাংশন বডিতে সিঙ্গেল কোট থাকলে এটি ফেইল করে
CREATE OR REPLACE FUNCTION greet(name TEXT) RETURNS TEXT AS '
  BEGIN
    RETURN ''Hello, '' || name || ''!'';  -- ডাবল-এসকেপড — অগোছালো
  END;
' LANGUAGE plpgsql;
```

ডলার কোটিং এসকেপিং সম্পূর্ণভাবে দূর করে দেয়:

```sql
CREATE OR REPLACE FUNCTION greet(name TEXT) RETURNS TEXT AS $$
  BEGIN
    RETURN 'Hello, ' || name || '!';   -- পরিষ্কার, কোনো এসকেপিং নেই
  END;
$$ LANGUAGE plpgsql;
```

## পাইথন স্ট্রিং-এর সমস্যা

যখন আপনি ডলার-কোটেড SQL পাইথন স্ট্রিং-এর ভেতরে এমবেড করেন, তখন একটি সূক্ষ্ম সমস্যার মুখোমুখি হন: পাইথনের f-string এবং `.format()` উভয়েই `{` ও `}` কে ইন্টারপোলেশন ডেলিমিটার হিসেবে ব্যবহার করে, তবে এগুলো `$$` এর সাথে সংঘর্ষ করে না। আসল ফাঁদটি হলো raw string বা triple-quote ভুলভাবে ব্যবহার করা।

## নিরাপদ প্যাটার্ন

**Triple-quoted স্ট্রিং (প্রস্তাবিত):**

```python
import psycopg2

CREATE_FUNCTION_SQL = """
CREATE OR REPLACE FUNCTION calculate_percentile(
    p_table TEXT,
    p_column TEXT,
    p_percentile FLOAT
) RETURNS FLOAT AS $$
DECLARE
    result FLOAT;
BEGIN
    EXECUTE format(
        'SELECT percentile_cont(%L) WITHIN GROUP (ORDER BY %I) FROM %I',
        p_percentile, p_column, p_table
    ) INTO result;
    RETURN result;
END;
$$ LANGUAGE plpgsql;
"""

def create_analytics_functions(conn):
    with conn.cursor() as cur:
        cur.execute(CREATE_FUNCTION_SQL)
    conn.commit()
```

**ডলার-কোটেড ফাংশনসহ Django মাইগ্রেশন:**

```python
from django.db import migrations

FORWARD_SQL = """
CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(NEW.body, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER articles_search_vector_update
    BEFORE INSERT OR UPDATE ON articles_article
    FOR EACH ROW EXECUTE FUNCTION update_search_vector();
"""

REVERSE_SQL = """
DROP TRIGGER IF EXISTS articles_search_vector_update ON articles_article;
DROP FUNCTION IF EXISTS update_search_vector();
"""

class Migration(migrations.Migration):
    dependencies = [("articles", "0003_add_search_vector_field")]

    operations = [
        migrations.RunSQL(sql=FORWARD_SQL, reverse_sql=REVERSE_SQL),
    ]
```

## প্যারামিটারাইজড কোয়েরি এখনও প্রযোজ্য

ডলার কোটিং SQL-এর **স্ট্রাকচার** সামলায়, ইউজার ডেটা নয়। ডলার-কোটেড ব্লকের ভেতরে কখনোই ইউজার ইনপুট ইন্টারপোলেট করবেন না — ভ্যালুর জন্য সবসময় প্যারামিটারাইজড কোয়েরি ব্যবহার করুন:

```python
# খারাপ: ডলার কোটিং থাকা সত্ত্বেও SQL ইনজেকশনের ঝুঁকি
def bad_search(conn, user_query: str):
    sql = f"""
    SELECT * FROM articles
    WHERE body @@ to_tsquery('english', $${user_query}$$);
    """
    # ^^^ এটি করবেন না

# ভালো: প্যারামিটারাইজড ভ্যালু, ডলার-কোটেড ফাংশন বডি
def safe_search(conn, user_query: str):
    sql = """
    SELECT id, title, ts_rank(search_vector, query) AS rank
    FROM articles, to_tsquery('english', %s) query
    WHERE search_vector @@ query
    ORDER BY rank DESC
    LIMIT 20;
    """
    with conn.cursor() as cur:
        cur.execute(sql, (user_query,))
        return cur.fetchall()
```

## FastAPI + asyncpg উদাহরণ

asyncpg-এর ক্ষেত্রে ডলার কোটিং হুবহু একইভাবে কাজ করে — শুধু positional প্যারামিটারের জন্য `%s` এর বদলে `$1`, `$2` (asyncpg-স্টাইল) ব্যবহার করুন:

```python
from fastapi import FastAPI, Depends
import asyncpg

app = FastAPI()

CREATE_UPSERT_FUNCTION = """
CREATE OR REPLACE FUNCTION upsert_post(
    p_slug TEXT,
    p_title TEXT,
    p_body TEXT,
    p_author_id INT
) RETURNS INT AS $$
DECLARE
    v_id INT;
BEGIN
    INSERT INTO posts (slug, title, body, author_id, updated_at)
    VALUES (p_slug, p_title, p_body, p_author_id, NOW())
    ON CONFLICT (slug) DO UPDATE
        SET title = EXCLUDED.title,
            body = EXCLUDED.body,
            updated_at = NOW()
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql;
"""

@app.on_event("startup")
async def setup_db(pool: asyncpg.Pool = Depends(get_pool)):
    async with pool.acquire() as conn:
        await conn.execute(CREATE_UPSERT_FUNCTION)
```

## Elasticsearch ইন্টিগ্রেশন নোট

PostgreSQL-এর কনটেন্ট Elasticsearch-এ ইনডেক্স করার সময় ফুল-টেক্সট সার্চ পাইপলাইনটি দেখতে এমন হয়:

1. **PostgreSQL** — সোর্স অব ট্রুথ; tsvector ট্রিগার `search_vector` কলামটি আপডেটেড রাখে
2. **Redis** — হট রিডের জন্য write-through ক্যাশ; pub/sub চ্যানেল ইনডেক্সারকে নোটিফাই করে
3. **Elasticsearch** — একটি পাইথন ওয়ার্কারের মাধ্যমে ডিনরমালাইজড ডকুমেন্ট গ্রহণ করে, যা Redis চ্যানেল শোনে

উপরের ডলার-কোটেড ট্রিগার ফাংশনটি (`update_search_vector`) এই পাইপলাইনের প্রথম ধাপ। যে ইভেন্টটি `search_vector` আপডেট করে, সেটিই Redis-এ নোটিফিকেশন পাঠাতে পারে:

```python
# একই মাইগ্রেশনে ট্রিগার ফাংশনটি সম্প্রসারিত করুন
UPDATE_TRIGGER_SQL = """
CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(NEW.body, '')), 'B');

    -- pg_notify-এর মাধ্যমে Elasticsearch ইনডেক্সারকে নোটিফাই করুন
    PERFORM pg_notify('es_index_channel', NEW.id::TEXT);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
"""
```

## সারসংক্ষেপ

| প্যাটার্ন | ব্যবহারের ক্ষেত্র |
|---------|-----------------|
| `$$...$$` | মাইগ্রেশনে ফাংশন/প্রসিডিউর বডি |
| `$body$...$body$` | নেস্টেড ডলার কোটিং, যখন বডিতেই `$$` থাকে |
| `%s` / `$1` | ইউজার-সরবরাহকৃত ভ্যালু — সবসময় প্যারামিটারাইজড |
| `psycopg2.sql.Identifier` | ডায়নামিক টেবিল/কলামের নাম — কখনোই f-string নয় |

ডলার কোটিং PostgreSQL-এর সেই ফিচারগুলোর একটি, যা প্রথমে খুবই নিস (niche) মনে হয় — কিন্তু যখনই আপনি বাস্তব ব্যাকএন্ড ইনফ্রাস্ট্রাকচার লেখা শুরু করেন, তখন এটি অপরিহার্য হয়ে ওঠে।
