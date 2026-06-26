---
title: "PostgreSQL Dollar Quoting Inside Python Strings: A Backend Developer's Guide"
description: "A deep dive into PostgreSQL dollar-quoting syntax, why it's essential for stored procedures in Python, and how to safely embed complex SQL inside Django and FastAPI codebases."
pubDate: 2025-06-01
tags: ["PostgreSQL", "Python", "Django", "FastAPI", "Backend"]
draft: false
---

## What Is Dollar Quoting?

PostgreSQL supports a non-standard quoting mechanism called **dollar quoting** (`$$`). It lets you embed literal strings — including single quotes — without escaping, which is invaluable for writing stored procedures and functions directly from Python.

Standard single-quote quoting breaks the moment your SQL body contains its own quotes:

```sql
-- This fails if the function body uses single quotes
CREATE OR REPLACE FUNCTION greet(name TEXT) RETURNS TEXT AS '
  BEGIN
    RETURN ''Hello, '' || name || ''!'';  -- double-escaped — messy
  END;
' LANGUAGE plpgsql;
```

Dollar quoting eliminates the escaping entirely:

```sql
CREATE OR REPLACE FUNCTION greet(name TEXT) RETURNS TEXT AS $$
  BEGIN
    RETURN 'Hello, ' || name || '!';   -- clean, no escaping
  END;
$$ LANGUAGE plpgsql;
```

---

## The Python String Problem

When you embed dollar-quoted SQL inside a Python string, you hit a subtle issue: Python's f-strings and `.format()` both use `{` and `}` as interpolation delimiters, but they don't interfere with `$$`. The real trap is using **raw strings** or **triple-quotes** incorrectly.

### Safe Patterns

**Triple-quoted raw string (recommended):**

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

**Django migration with dollar-quoted function:**

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

---

## Parameterized Queries Still Apply

Dollar quoting handles **SQL structure**, not **user data**. Never interpolate user input into a dollar-quoted block — use parameterized queries for values:

```python
# BAD: SQL injection risk even with dollar quoting
def bad_search(conn, user_query: str):
    sql = f"""
    SELECT * FROM articles
    WHERE body @@ to_tsquery('english', $${user_query}$$);
    """
    # ^^^ DO NOT DO THIS

# GOOD: parameterized value, dollar-quoted function body
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

---

## FastAPI + asyncpg Example

With `asyncpg`, dollar quoting works identically — just use `$1`, `$2` for positional parameters (asyncpg-style), not `%s`:

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

---

## Elasticsearch Integration Note

When indexing PostgreSQL content into Elasticsearch, the full-text search pipeline looks like:

1. **PostgreSQL** — source of truth, tsvector triggers keep `search_vector` column fresh
2. **Redis** — write-through cache for hot reads; pub/sub channel notifies the indexer
3. **Elasticsearch** — receives denormalized documents via a Python worker that listens to the Redis channel

The dollar-quoted trigger function above (`update_search_vector`) is the first step in this pipeline. The same event that updates `search_vector` can also push a Redis notification:

```python
# In the same migration, extend the trigger function
UPDATE_TRIGGER_SQL = """
CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(NEW.body, '')), 'B');

    -- Notify the Elasticsearch indexer via pg_notify
    PERFORM pg_notify('es_index_channel', NEW.id::TEXT);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
"""
```

---

## Summary

| Pattern | Use Case |
|---|---|
| `$$...$$` | Function/procedure bodies in migrations |
| `$body$...$body$` | Nested dollar quoting when body itself contains `$$` |
| `%s` / `$1` | User-supplied values — always parameterized |
| `psycopg2.sql.Identifier` | Dynamic table/column names — never f-string |

Dollar quoting is one of those PostgreSQL features that feels niche until you start writing real backend infrastructure — then it becomes indispensable.
