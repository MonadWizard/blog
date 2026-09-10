---
title: রেট লিমিটিং (Rate Limiting) — ফান্ডামেন্টাল থেকে মাস্টার লেভেল
description: "একটি সম্পূর্ণ বাংলা গাইড: কনসেপ্ট → অ্যালগরিদম → ডিস্ট্রিবিউটেড
  ইমপ্লিমেন্টেশন → প্রোডাকশন ইউজকেস → অ্যাডভান্সড প্যাটার্ন"
pubDate: 2026-09-10
tags:
  - Backend
  - System Design
draft: false
---

## সূচিপত্র

| পর্ব | বিষয় | লেভেল |
|------|-------|--------|
| ০ | এই ডকুমেন্ট কীভাবে পড়বেন | — |
| ১ | ফান্ডামেন্টাল — রেট লিমিট কী ও কেন | Foundation |
| ২ | রেট লিমিটারের অ্যানাটমি — key, cost, policy | Foundation |
| ৩ | ৬টি কোর অ্যালগরিদম (গণিতসহ) | Core |
| ৪ | ডিস্ট্রিবিউটেড রেট লিমিটিং | Core |
| ৫ | কোন লেয়ারে বসাবেন | Core |
| ৬ | HTTP কন্ট্রাক্ট — 429, হেডার, ব্যাকঅফ | Core |
| ৭ | রিয়েল ইমপ্লিমেন্টেশন (FastAPI / Django / Nginx) | Advanced |
| ৮ | অ্যাডভান্সড প্যাটার্ন | Advanced |
| ৯ | ১৫টি রিয়েল-ওয়ার্ল্ড ইউজকেস — সম্পূর্ণ working approach | Advanced |
| ১০ | বাইপাস ও সিকিউরিটি | Master |
| ১১ | অ্যান্টি-প্যাটার্ন | Master |
| ১২ | টেস্টিং ও মনিটরিং | Master |
| ১৩ | ডিজাইন ডিসিশন চিটশিট | Master |
| ১৪ | মাস্টারি রোডম্যাপ + ইন্টারভিউ প্রশ্ন | Master |
| ১৫ | কনসলিডেশন এক্সারসাইজ | — |

---

## পর্ব ০ — এই ডকুমেন্ট কীভাবে পড়বেন

প্রতিটি পর্বে থাকছে:

1. **কনসেপ্ট + অ্যানালজি** — জিনিসটা আসলে কী
2. **ASCII ডায়াগ্রাম** — কীভাবে কাজ করে
3. **নিউমেরিক উদাহরণ** — আসল হিসাব, ধরে নেওয়া কিছু নয়
4. **প্রোডাকশন ইনসাইট** — আপনার Django `aggame` প্রজেক্টের `@rate_limit` / `budget.reserve` সিস্টেমের সাথে মিলিয়ে
5. **Active recall প্রশ্ন** — নিজেকে যাচাই

এক বসায় শেষ করার চেষ্টা করবেন না। পর্ব ১–৩ একদিন, পর্ব ৪–৭ আরেকদিন, পর্ব ৮–৯ তৃতীয় দিন, পর্ব ১০–১৫ চতুর্থ দিন — এই ভাগে পড়লে ধরে রাখা সহজ হবে।

---

## পর্ব ১ — ফান্ডামেন্টাল

### ১.১ রেট লিমিট আসলে কী?

**সংজ্ঞা:** রেট লিমিটিং হলো এমন একটা মেকানিজম যেটা নির্দিষ্ট একটা **সময়-জানালার (time window)** ভেতরে কোনো **ক্লায়েন্ট (identity)** কতবার কোনো **রিসোর্স** ব্যবহার করতে পারবে — তা নিয়ন্ত্রণ করে, এবং সীমা ছাড়ালে রিকোয়েস্ট **reject / delay / degrade** করে।

**অ্যানালজি — মেট্রোরেলের গেট:**

স্টেশনে ১০টা গেট আছে। প্রতিটা গেট দিয়ে সেকেন্ডে ১ জন ঢুকতে পারে। ভিড়ের সময় ৫০০ জন একসাথে এলে কী হয়?

- **গেট না থাকলে** → সবাই একসাথে প্ল্যাটফর্মে, প্ল্যাটফর্ম ভেঙে পড়ে (= সার্ভার ক্র্যাশ)
- **গেট থাকলে** → লাইন হয়, ধীরে ধীরে ঢোকে, প্ল্যাটফর্ম নিরাপদ (= rate limiting)
- **গেটের সামনে লাইন অনেক লম্বা হলে** → নতুন লোকদের "পরের ট্রেনে আসুন" বলা হয় (= 429 Too Many Requests)

গুরুত্বপূর্ণ ইনসাইট: **রেট লিমিট ট্রাফিক কমায় না, ট্রাফিককে predictable করে।** আপনার সার্ভার ৫০০০ rps হ্যান্ডেল করতে পারলে rate limit নিশ্চিত করে যে কখনো ৫০০০০ rps ভেতরে ঢুকবে না।

### ১.২ কেন দরকার — ৬টি আসল কারণ

```
┌─────────────────────────────────────────────────────────────┐
│  ১. Availability   → একজন abuser সবার সার্ভিস নষ্ট করতে পারে না  │
│  ২. Cost control   → SMS/Mail/3rd-party API বিল নিয়ন্ত্রণ         │
│  ৩. Security       → brute force, credential stuffing, enumeration │
│  ৪. Fairness       → একজন heavy user সব capacity খেয়ে ফেলে না     │
│  ৫. Business model → free/pro/enterprise tier আলাদা করা          │
│  ৬. Downstream     → নিজের DB/queue/partner API-কে বাঁচানো        │
└─────────────────────────────────────────────────────────────┘
```

**আপনার প্রজেক্টের কনটেক্সটে:**

- কারণ ২ — OTP পাঠানোর API-তে লিমিট না থাকলে একজন অ্যাটাকার স্ক্রিপ্ট চালিয়ে লক্ষ SMS পাঠাতে পারে, এবং **বিলটা আসবে আপনার নামে**। এজন্যই আপনি `RATE_LIMIT_SPEND_BUDGETS`-এ `sms` / `mail` চ্যানেল আলাদা করেছেন।
- কারণ ৩ — forgot-password ফ্লো-তে existence cross-check থাকায় ওটা একটা enumeration oracle; uniform 200 + rate limit দুটোই লাগে।
- কারণ ৬ — `paid_places` / `paid_geocode` চ্যানেল আসলে Google Places/Geocoding API-র প্রতি রিকোয়েস্টে টাকা কাটে, তাই ওখানে rate নয়, **spend** নিয়ন্ত্রণ করা লাগে।

### ১.৩ মৌলিক পরিভাষা

| টার্ম | মানে | উদাহরণ |
|-------|------|---------|
| **Limit** | সর্বোচ্চ কতবার | ১০০ |
| **Window** | কত সময়ে | ১ মিনিট |
| **Rate** | limit ÷ window | 100/min ≈ 1.67 rps |
| **Burst** | মুহূর্তের জন্য rate ছাড়িয়ে যাওয়ার অনুমতি | 100/min হলেও একসাথে ২০টা |
| **Quota** | বড় সময়ের মোট সীমা (সাধারণত বিলিং) | ১০ লক্ষ কল/মাস |
| **Cost / Weight** | এক রিকোয়েস্ট কত "দামি" | সার্চ = 1, রিপোর্ট = 50 |
| **Key / Scope** | কাকে গোনা হচ্ছে | ip, user_id, api_key, tenant |
| **Throttle** | ধীর করা (reject না করে) | প্রতি রিকোয়েস্টে 200ms delay |
| **Shed** | ওভারলোডে ইচ্ছাকৃতভাবে ফেলে দেওয়া | 503 |
| **Backpressure** | ধীরগতি উৎসের দিকে ফিরিয়ে দেওয়া সিগন্যাল | consumer lag → producer pause |
| **Concurrency limit** | একসাথে কয়টা চলবে | সর্বোচ্চ ৫০টা in-flight |

### ১.৪ কাছাকাছি ধারণাগুলোর পার্থক্য (খুব গুরুত্বপূর্ণ)

| ধারণা | কী নিয়ন্ত্রণ করে | ট্রিগার | রেসপন্স |
|-------|------------------|---------|---------|
| **Rate limiting** | সময়প্রতি সংখ্যা | policy অতিক্রম | 429 |
| **Concurrency limiting** | একসাথে চলমান সংখ্যা | in-flight > N | 429 / queue |
| **Throttling** | গতি | নরম সীমা | delay, তারপর 429 |
| **Load shedding** | সার্ভারের স্বাস্থ্য | CPU/latency/queue depth | 503 |
| **Backpressure** | পাইপলাইন প্রবাহ | downstream ধীর | producer থামে |
| **Circuit breaker** | ব্যর্থতার হার | error rate > X% | fail fast |
| **Quota** | মোট ব্যবহার | মাসিক সীমা | 402/403 |

**মনে রাখার সূত্র:**

- Rate limit বলে — *"তুমি বেশি চাচ্ছো"* (client-এর দোষ) → **429**
- Load shed বলে — *"আমি এখন পারছি না"* (server-এর অবস্থা) → **503**

এই দুটো গুলিয়ে ফেলা সবচেয়ে কমন ভুল। 429 মানে ক্লায়েন্ট নিজের আচরণ বদলাবে; 503 মানে ক্লায়েন্ট পরে আবার চেষ্টা করবে, কিন্তু দোষটা তার নয়।

### ১.৫ Active Recall — পর্ব ১

1. রেট লিমিট কি ট্রাফিক কমায়? না হলে কী করে?
2. 429 আর 503-এর সেমান্টিক পার্থক্য কী?
3. আপনার OTP ফ্লো-তে "rate" নিয়ন্ত্রণই কি যথেষ্ট, নাকি "spend" আলাদাভাবে নিয়ন্ত্রণ করা লাগে? কেন?
4. Quota আর rate limit-এর মধ্যে পার্থক্য এক লাইনে বলুন।

---

## পর্ব ২ — রেট লিমিটারের অ্যানাটমি

যেকোনো রেট লিমিটার তিনটা প্রশ্নের উত্তর দেয়:

```
┌────────────────────────────────────────────────────┐
│  ১. WHO?    →  Key / Scope   (কাকে গুনছি)            │
│  ২. HOW MUCH? → Cost / Weight (এই কলের ওজন কত)       │
│  ৩. HOW MANY? → Policy       (কত/কত সময়ে + burst)   │
└────────────────────────────────────────────────────┘
```

### ২.১ Key design — সবচেয়ে বেশি ভুল হয় এখানে

Key ভুল হলে অ্যালগরিদম যত ভালোই হোক, লিমিটার অকেজো।

| Scope | Key উদাহরণ | কখন ভালো | দুর্বলতা |
|-------|-----------|----------|----------|
| `global` | `rl:otp.send:global` | সর্বোচ্চ খরচ/ক্ষতি ক্যাপ করা | সবাই একসাথে ভোগে |
| `ip` | `rl:login:ip:103.x.x.x` | anonymous endpoint | NAT/CGNAT, proxy, spoof |
| `net` | `rl:login:net:103.x.x.0/24` | botnet একই সাবনেটে | বড় ISP-তে over-block |
| `user` | `rl:search:user:9421` | authenticated API | লগইনের আগে নেই |
| `id` (identifier) | `rl:otp.send:id:01712xxxxxx` | OTP-র মতো target-ভিত্তিক | attacker আইডি ঘোরাতে পারে |
| `api_key` | `rl:api:key:ak_live_xx` | B2B API | key শেয়ার হলে |
| `tenant` | `rl:api:org:5512` | multi-tenant SaaS | tenant-এর ভেতরে unfair |
| `device` | `rl:signup:device:<fp>` | মোবাইল অ্যাপ | fingerprint spoof |

**সোনালি নিয়ম: একটা endpoint-এ একাধিক scope একসাথে চালান।**

আপনার OTP পাঠানোর জন্য বাস্তব লেয়ারিং:

```
রিকোয়েস্ট আসল
   │
   ├─▶ per-identifier  : ঐ নম্বরে ৩/১০মিনিট     ← একই ভিক্টিমকে স্প্যাম আটকায়
   ├─▶ per-ip          : ১০/১০মিনিট             ← এক মেশিন থেকে বহু নম্বর আটকায়
   ├─▶ per-subnet(/24) : ৪০/১০মিনিট             ← ছোট botnet আটকায়
   ├─▶ global          : ৫০০/মিনিট              ← সর্বনাশের সিলিং
   └─▶ spend(sms)      : দৈনিক ৫০০০ + rolling   ← টাকার সিলিং
   
   সব পাস করলে তবেই SMS যাবে
```

এটাকে বলে **defense in depth** — একটা লেয়ার বাইপাস হলে পরেরটা ধরবে।

### ২.২ Cost / weight — সব রিকোয়েস্ট সমান নয়

একটা `GET /health` আর একটা `POST /report/generate` কে সমান গোনা মানে হয় health check ব্লক করা, নয়তো report endpoint খুলে দেওয়া।

```
cost = 1        → সাধারণ read
cost = 5        → সার্চ (Elasticsearch হিট)
cost = 20       → জিওকোডিং (টাকা লাগে)
cost = 100      → রিপোর্ট এক্সপোর্ট
cost = tokens   → LLM কল (ইনপুট+আউটপুট টোকেন)
```

Token bucket এই মডেলে ন্যাচারালি ফিট করে — শুধু ১টার বদলে `cost` সংখ্যক টোকেন কেটে নিন।

### ২.৩ ডিসিশন ফ্লো

```
        রিকোয়েস্ট
            │
            ▼
    ┌───────────────┐   না    ┌──────────────────┐
    │ policy আছে?    ├───────▶│ default policy   │
    └───────┬───────┘         └──────────────────┘
            │ হ্যাঁ
            ▼
    ┌───────────────┐   হ্যাঁ  ┌──────────────────┐
    │ allowlist?     ├───────▶│ ALLOW (bypass)   │
    └───────┬───────┘         └──────────────────┘
            │ না
            ▼
    ┌───────────────────────┐
    │ key বানাও (scope অনুযায়ী)│
    └───────┬───────────────┘
            ▼
    ┌───────────────────────┐  ব্যর্থ  ┌────────────────────────┐
    │ Redis-এ atomic check   ├───────▶│ fail-open না fail-closed?│
    └───────┬───────────────┘         └────────────────────────┘
            │
      ┌─────┴──────┐
      ▼            ▼
  ALLOW        DENY → 429 + Retry-After + হেডার + মেট্রিক
      │
      ▼
  budget.reserve()  ← টাকা খরচ হয় এমন হলে
      │
      ▼
  হ্যান্ডলার চালাও
      │
   ┌──┴───┐
   ▼      ▼
সফল    ব্যর্থ → budget.release()  ← টাকা ফেরত
```

### ২.৪ Fail-open বনাম Fail-closed

Redis ডাউন হলে কী করবেন?

| | Fail-open (allow) | Fail-closed (deny) |
|---|---|---|
| ঝুঁকি | Redis ডাউনের সময় সীমাহীন abuse | Redis ডাউনে সার্ভিস ডাউন |
| কখন | সাধারণ read API, availability মুখ্য | টাকা/সিকিউরিটি জড়িত |
| উদাহরণ | `GET /products` | `otp.send`, `payment.initiate` |

আপনার `RATE_LIMIT_SPEND_BUDGETS` **fail-closed** — এটা সঠিক সিদ্ধান্ত: Redis না থাকলে SMS পাঠানো বন্ধ থাকুক, কিন্তু অনিয়ন্ত্রিত বিল না আসুক। বিপরীতে সাধারণ read endpoint-এ fail-closed করলে Redis-এর একটা hiccup পুরো সাইট নামিয়ে দেবে।

**মাস্টার-লেভেল সূক্ষ্মতা:** সেরা উত্তর প্রায়ই "hybrid" — Redis ফেল করলে in-process local limiter-এ (কড়া লিমিট সহ) ফলব্যাক করুন। তাতে availability-ও থাকে, সিলিংও থাকে।

### ২.৫ Active Recall — পর্ব ২

1. শুধু per-IP লিমিট দিলে OTP স্প্যামার কীভাবে বাঁচবে? আর শুধু per-identifier দিলে?
2. `cost` প্যারামিটার কোন অ্যালগরিদমে সবচেয়ে সহজে বসে?
3. আপনার কোন policy-গুলো fail-closed হওয়া উচিত, কোনগুলো fail-open?

---

## পর্ব ৩ — ৬টি কোর অ্যালগরিদম

এই পর্বটাই ইন্টারভিউ ও প্রোডাকশন — দুই জায়গার হৃদয়। প্রতিটার জন্য: কাজের ধরন → ডায়াগ্রাম → আসল হিসাব → সুবিধা/অসুবিধা।

---

### ৩.১ Fixed Window Counter

**আইডিয়া:** সময়কে সমান বালতিতে ভাগ করুন (0–59s, 60–119s...)। প্রতি বালতিতে একটা কাউন্টার। কাউন্টার > limit হলে reject।

```
limit = 100 / minute

12:00:00 ──────────────── 12:01:00 ──────────────── 12:02:00
│        window A         │        window B         │
│      counter = 0→100    │      counter = 0→100    │
└─────────────────────────┴─────────────────────────┘
                     রিসেট এখানে
```

**Redis-এ:**
```
INCR  rl:api:user:42:1757500800
EXPIRE rl:api:user:42:1757500800 60   (শুধু প্রথমবার)
```

**নিউমেরিক উদাহরণ (এবং ফাঁদ):**

limit = 100/min ধরুন। অ্যাটাকার এভাবে করল:

| সময় | রিকোয়েস্ট | উইন্ডো | কাউন্টার | ফল |
|------|-----------|--------|----------|-----|
| 12:00:59.0 | 100 | A | 0 → 100 | সব পাস |
| 12:01:00.0 | 100 | B (নতুন) | 0 → 100 | সব পাস |

**১ সেকেন্ডের ভেতরে ২০০টা রিকোয়েস্ট পাস** — অথচ লিমিট বলেছিল ১০০/মিনিট। একে বলে **boundary burst problem**; সবচেয়ে খারাপ ক্ষেত্রে আপনি **2× limit** পেতে পারেন।

**সুবিধা:** অসম্ভব সহজ, O(1) মেমরি (কী প্রতি ১টা ইন্টিজার), সবচেয়ে দ্রুত।
**অসুবিধা:** boundary burst; উইন্ডো রিসেটে thundering herd (সবাই 12:01:00-এ ঝাঁপায়)।

**কখন ব্যবহার করবেন:** যখন approximate হলেই চলে এবং লিমিটটা "মোটামুটি" — যেমন `api.default` টাইপ ব্যাকস্টপ পলিসি।

---

### ৩.২ Sliding Window Log

**আইডিয়া:** প্রতিটা রিকোয়েস্টের টাইমস্ট্যাম্প জমা রাখুন। চেক করার সময় পুরনোগুলো ফেলে দিয়ে গুনুন।

```
এখন = 12:01:30, window = 60s  →  বৈধ সীমা: 12:00:30 – 12:01:30

log: [12:00:10] [12:00:45] [12:01:02] [12:01:29]
        ✗ বাদ      ✓         ✓          ✓
                  গণনা = 3
```

**Redis (Sorted Set) দিয়ে:**
```
ZREMRANGEBYSCORE key 0 (now-60000)
ZCARD key
ZADD key now uuid          ← পাস করলে
PEXPIRE key 60000
```

**নিউমেরিক উদাহরণ — এটাই সবচেয়ে নিখুঁত:**

limit 100/min, ৩.১-এর সেই অ্যাটাক আবার চালান:

| সময় | রিকোয়েস্ট | লগে গণনা | ফল |
|------|-----------|-----------|-----|
| 12:00:59 | 100 | 0 → 100 | পাস |
| 12:01:00 | 100 | 100 (আগেরগুলো এখনো ৬০s-এর ভেতরে) | **সব reject** |
| 12:01:59 | 1 | 100 | reject |
| 12:02:00 | 1 | 0 (আগেরগুলো এক্সপায়ার) | পাস |

boundary burst সম্পূর্ণ নেই।

**মেমরির হিসাব (এখানেই সমস্যা):**

ধরুন ১০ লক্ষ অ্যাক্টিভ ইউজার, প্রত্যেকে সর্বোচ্চ ১০০ এন্ট্রি। Redis sorted set-এ প্রতি এন্ট্রি ≈ ৭০ বাইট (member + score + skiplist overhead)।

```
1,000,000 × 100 × 70 বাইট = 7,000,000,000 বাইট ≈ 7 GB
```

শুধু রেট লিমিট করতে ৭ GB RAM। এজন্যই sliding window log কেবল **অল্প-ভলিউম, উচ্চ-মূল্যের** endpoint-এ ব্যবহার হয়।

**সুবিধা:** পুরোপুরি নিখুঁত, boundary ইস্যু নেই।
**অসুবিধা:** O(N) মেমরি প্রতি কী; ZREMRANGEBYSCORE ব্যয়বহুল হতে পারে।

**প্রোডাকশন ইনসাইট:** আপনার `RATE_LIMIT_SPEND_BUDGETS`-এ "true sliding-window rolling cap (Redis sorted set)" ঠিক এই অ্যালগরিদম — এবং জায়গামতো বসেছে। SMS-এর মতো টাকার সিলিং-এ approximate হওয়া চলে না, আর ভলিউম দিনে কয়েক হাজার, তাই মেমরিও সমস্যা নয়।

---

### ৩.৩ Sliding Window Counter (Weighted / Approximate)

**আইডিয়া:** Fixed window-এর সস্তা মেমরি + sliding-এর মসৃণতা। আগের ও বর্তমান উইন্ডোর কাউন্টার রেখে ওজন করে যোগ করুন।

```
সূত্র:
count = আগের_উইন্ডোর_কাউন্ট × (আগের উইন্ডোর যতটুকু এখনো ওভারল্যাপ করছে)
        + বর্তমান_উইন্ডোর_কাউন্ট
```

```
      window A (12:00)          window B (12:01)
 ├────────────────────────┼────────────────────────┤
 │        count = 90      │       count = 20       │
 └────────────────────────┴────────────────────────┘
                      ┌──── এখন 12:01:15
             ◀───── ৬০ সেকেন্ডের স্লাইডিং জানালা ─────▶
             (A-এর শেষ ৭৫%) + (B-এর প্রথম ২৫%)
```

**আসল হিসাব:**

limit = 100/min, এখন = 12:01:15 (বর্তমান উইন্ডোর ২৫% পার), prev = 90, curr = 20

```
overlap = 1 − 0.25 = 0.75
count   = 90 × 0.75 + 20
        = 67.5 + 20
        = 87.5  →  87
87 < 100  →  ALLOW ✅
```

আরেকটু পরে, 12:01:30 (৫০% পার), curr বেড়ে ৪০ হয়েছে:

```
count = 90 × 0.50 + 40 = 45 + 40 = 85  →  ALLOW
```

কিন্তু 12:01:05 (৮.৩% পার) এ curr = 30 হলে:

```
count = 90 × 0.9167 + 30 = 82.5 + 30 = 112.5 → 112
112 > 100 → DENY ❌
```

লক্ষ্য করুন — fixed window এখানে ALLOW বলত (নতুন উইন্ডোতে মাত্র ৩০)। sliding counter সঠিকভাবে ধরল।

**নির্ভুলতা:** এটা ধরে নেয় আগের উইন্ডোতে ট্রাফিক সমানভাবে ছড়ানো ছিল। বাস্তবে Cloudflare-এর প্রকাশিত ডেটায় এই এস্টিমেটের ভুল ১% এরও কম।

**মেমরি:** প্রতি কী মাত্র ২টা ইন্টিজার। ১০ লক্ষ ইউজার ≈ **কয়েকশো MB**, ৭ GB নয়।

**কখন:** এটাই বেশিরভাগ HTTP API-র **ডিফল্ট পছন্দ** হওয়া উচিত।

---

### ৩.৪ Token Bucket ⭐

**আইডিয়া:** একটা বালতিতে টোকেন জমে ধ্রুব হারে। রিকোয়েস্ট এলে টোকেন খরচ হয়। টোকেন না থাকলে reject।

```
                 refill: 5 টোকেন/সেকেন্ড
                        │
                        ▼
              ┌──────────────────┐
              │ ●●●●●●●●●●       │  capacity = 10
              │  বর্তমান = 7      │  (এর বেশি জমবে না)
              └────────┬─────────┘
                       │ প্রতি রিকোয়েস্টে −cost
                       ▼
                 টোকেন ≥ cost ?
                  ├─ হ্যাঁ → ALLOW, টোকেন কাটো
                  └─ না  → DENY
```

**দুইটা প্যারামিটার, দুইটা আলাদা অর্থ:**

- `rate` (refill) = **টেকসই গড় হার** (sustained)
- `capacity` (bucket size) = **কতটা burst সহ্য করবে**

এই দুটো আলাদা করতে পারাই token bucket-এর মূল শক্তি।

**নিউমেরিক উদাহরণ:**

capacity = 10, refill = 5/s। t=0 তে বালতি ভর্তি (10)।

| সময় | ঘটনা | রিফিল | আগে | পরে | ফল |
|------|------|-------|-----|-----|-----|
| t=0.0 | ১২টা রিকোয়েস্ট একসাথে | 0 | 10 | 0 | ১০টা পাস, ২টা DENY |
| t=0.4 | ১টা রিকোয়েস্ট | 0.4×5 = 2 | 2 | 1 | ALLOW |
| t=1.0 | ৪টা রিকোয়েস্ট | 0.6×5 = 3 | 4 | 0 | ৪টাই ALLOW |
| t=1.1 | ১টা রিকোয়েস্ট | 0.1×5 = 0.5 | 0.5 | — | DENY (0.5 < 1) |
| t=1.3 | ১টা রিকোয়েস্ট | 0.2×5 = 1.0 | 1.5 | 0.5 | ALLOW |

`Retry-After` হিসাব: t=1.1 এ ঘাটতি = 1 − 0.5 = 0.5 টোকেন → 0.5 ÷ 5 = **0.1 সেকেন্ড**।

**কী স্টোর করতে হয়:** মাত্র ২টা ফিল্ড — `tokens` এবং `last_refill_ts`। টাইমার লাগে না; চেক করার সময় **lazy refill** করা হয়:

```
elapsed = now − last_ts
tokens  = min(capacity, tokens + elapsed × rate)
```

**সুবিধা:** burst-বান্ধব, মেমরি O(1), cost/weight সরাসরি সাপোর্ট করে, `Retry-After` নিখুঁতভাবে বের হয়।
**অসুবিধা:** টিউনিং দুটো নব লাগে; ভুল capacity দিলে অপ্রত্যাশিত burst।

**কখন:** ডিফল্ট পছন্দ যখন burst allow করা দরকার — যা বাস্তবে প্রায় সব ইউজার-ফেসিং API (মানুষ ধ্রুব হারে ক্লিক করে না)। AWS, Stripe, GitHub — সবাই এটাই ব্যবহার করে।

---

### ৩.৫ Leaky Bucket

দুটো ভিন্ন জিনিস একই নামে চলে — গুলিয়ে ফেলবেন না।

**(ক) Leaky bucket as a queue (traffic shaping):**

```
রিকোয়েস্ট ─┐
রিকোয়েস্ট ─┼──▶ ┌──────────┐
রিকোয়েস্ট ─┘     │ ▓▓▓▓     │ queue (size = 10)
                 └────┬─────┘
                      │ ধ্রুব হারে বের হয় (5/s)
                      ▼
                   হ্যান্ডলার
   কিউ ভর্তি হলে → নতুন রিকোয়েস্ট DROP
```

আউটপুট **সম্পূর্ণ মসৃণ** — সবসময় ঠিক 5/s, একটুও burst নয়। রিকোয়েস্ট reject না হয়ে **অপেক্ষা** করে।

**(খ) Leaky bucket as a meter:** গাণিতিকভাবে token bucket-এর সমতুল্য (উল্টো দিক থেকে দেখা)।

**Token bucket বনাম Leaky bucket (queue):**

| | Token Bucket | Leaky Bucket (queue) |
|---|---|---|
| Burst | অনুমতি দেয় (bucket ভর্তি থাকলে) | কখনো নয় |
| আউটপুট | অসম | পুরোপুরি সমান |
| অতিরিক্ত রিকোয়েস্ট | সাথে সাথে reject | কিউতে অপেক্ষা, তারপর drop |
| Latency | যোগ করে না | যোগ করে (queue wait) |
| ভালো | ইউজার-ফেসিং API | outbound/partner API, SMS gateway |

**প্রোডাকশন ইনসাইট:** আপনার SMS প্রোভাইডার যদি বলে "সর্বোচ্চ ১০ TPS" — তখন token bucket দিয়ে burst পাঠালে প্রোভাইডার আপনাকে ব্লক করবে। ওখানে leaky bucket (queue) দরকার: রিকোয়েস্ট কিউতে রেখে ঠিক ১০/সেকেন্ড হারে ছাড়ুন। ইনবাউন্ডে token bucket, আউটবাউন্ডে leaky bucket — এটা খুব কাজের থাম্ব রুল।

---

### ৩.৬ GCRA (Generic Cell Rate Algorithm) — মাস্টার লেভেল

টেলিকমের ATM নেটওয়ার্ক থেকে আসা; `redis-cell` মডিউলের `CL.THROTTLE` এটাই চালায়। মাত্র **একটা** ভ্যালু রাখতে হয় — TAT (Theoretical Arrival Time)।

```
T = emission interval = period ÷ limit     ← দুটো রিকোয়েস্টের আদর্শ ব্যবধান
τ = burst tolerance   = (burst − 1) × T    ← কতটা আগে আসা মাফ

allow যদি:  now ≥ TAT − τ
allow হলে:  TAT = max(now, TAT) + T
```

**নিউমেরিক উদাহরণ:**

limit = 10/minute, burst = 3

```
T = 60s ÷ 10 = 6 সেকেন্ড
τ = (3 − 1) × 6 = 12 সেকেন্ড
```

| সময় | TAT (আগে) | শর্ত: now ≥ TAT − 12 | ফল | TAT (পরে) |
|------|-----------|----------------------|-----|-----------|
| t=0 | 0 | 0 ≥ −12 ✅ | ALLOW | 0 + 6 = 6 |
| t=0 | 6 | 0 ≥ −6 ✅ | ALLOW | 6 + 6 = 12 |
| t=0 | 12 | 0 ≥ 0 ✅ | ALLOW | 12 + 6 = 18 |
| t=0 | 18 | 0 ≥ 6 ❌ | **DENY** | অপরিবর্তিত |
| t=3 | 18 | 3 ≥ 6 ❌ | DENY | অপরিবর্তিত |
| t=6 | 18 | 6 ≥ 6 ✅ | ALLOW | 18 + 6 = 24 |

ঠিক ৩টা burst পাস করল, তারপর প্রতি ৬ সেকেন্ডে ১টা — একদম নিখুঁত।

`Retry-After` = `TAT − τ − now` (উপরের t=0, ৪র্থ রিকোয়েস্টে = 18 − 12 − 0 = **6 সেকেন্ড**)।

**সুবিধা:** কী প্রতি একটামাত্র ভ্যালু, নিখুঁত (approximation নেই), নিখুঁত Retry-After।
**অসুবিধা:** মানসিকভাবে বুঝতে কঠিন, ডিবাগ করা কঠিন (কাউন্ট দেখা যায় না, শুধু একটা টাইমস্ট্যাম্প)।

---

### ৩.৭ তুলনামূলক সারণি

| অ্যালগরিদম | মেমরি/কী | নিখুঁততা | Burst | Cost সাপোর্ট | জটিলতা | কখন |
|-----------|----------|---------|-------|-------------|--------|-----|
| Fixed Window | 1 int | ⭐⭐ (2× ফাঁক) | দুর্ঘটনাবশত | সহজ | ⭐ | সস্তা ব্যাকস্টপ |
| Sliding Log | N entries | ⭐⭐⭐⭐⭐ | না | সহজ | ⭐⭐⭐ | টাকা/সিকিউরিটি, কম ভলিউম |
| Sliding Counter | 2 int | ⭐⭐⭐⭐ | না | সহজ | ⭐⭐ | **ডিফল্ট HTTP API** |
| Token Bucket | 2 field | ⭐⭐⭐⭐ | নিয়ন্ত্রিত ✅ | চমৎকার | ⭐⭐ | **ডিফল্ট, burst দরকার হলে** |
| Leaky Bucket | queue | ⭐⭐⭐⭐⭐ | কখনো না | মাঝারি | ⭐⭐⭐ | outbound/partner API |
| GCRA | 1 ts | ⭐⭐⭐⭐⭐ | নিয়ন্ত্রিত ✅ | ভালো | ⭐⭐⭐⭐ | বড় স্কেল, redis-cell |

**সিদ্ধান্তের শর্টকাট:**

```
burst দরকার? ──হ্যাঁ──▶ Token Bucket (বা GCRA)
     │
     না
     ▼
নিখুঁততা critical (টাকা/সিকিউরিটি)? ──হ্যাঁ──▶ Sliding Window Log
     │
     না
     ▼
Sliding Window Counter  ← ৮০% ক্ষেত্রে এটাই সঠিক উত্তর
```

### ৩.৮ Active Recall — পর্ব ৩

1. Fixed window-এ কেন সর্বোচ্চ 2× limit পাস হতে পারে — একটা টাইমলাইন এঁকে দেখান।
2. limit=100/min, prev=60, curr=45, বর্তমান উইন্ডোর ৩০% পার — sliding counter কী বলবে? (হিসাব করুন)
3. capacity=20, refill=2/s। t=0 তে ভর্তি, ২৫টা রিকোয়েস্ট এল। কয়টা পাস? পরের রিকোয়েস্টের Retry-After কত?
4. আপনার SMS gateway ১০ TPS বললে token bucket নাকি leaky bucket — কেন?
5. GCRA-তে limit=30/min, burst=5 হলে T এবং τ কত?

---

## পর্ব ৪ — ডিস্ট্রিবিউটেড রেট লিমিটিং

### ৪.১ কেন in-memory লিমিটার ভেঙে পড়ে

```
                    Load Balancer
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
   ┌─────────┐       ┌─────────┐       ┌─────────┐
   │ App-1   │       │ App-2   │       │ App-3   │
   │ limiter │       │ limiter │       │ limiter │
   │ 100/min │       │ 100/min │       │ 100/min │
   └─────────┘       └─────────┘       └─────────┘

   ইউজার পায়: 100 × 3 = 300/min  ❌
```

Kubernetes-এ autoscale করলে সমস্যা আরও খারাপ — pod ৩ থেকে ২০ হলে কার্যকর লিমিট ২০০০/মিনিট হয়ে যায়, অথচ কোথাও কনফিগ বদলাননি।

**সমাধান:** শেয়ারড স্টেট (Redis) + **atomic** অপারেশন।

### ৪.২ Atomicity — INCR + EXPIRE-এর ফাঁদ

নিচের কোডটা দেখতে ঠিক, কিন্তু ভুল:

```python
count = redis.incr(key)          # ← এখানে ক্র্যাশ করলে?
if count == 1:
    redis.expire(key, 60)        # ← EXPIRE কখনো সেট হবে না
```

`INCR` সফল হয়ে `EXPIRE`-এর আগে প্রসেস মারা গেলে কী-টা **চিরস্থায়ী** হয়ে যায় — ইউজার চিরতরে ব্লকড, এবং Redis-এ মেমরি লিক। এটা বাস্তবে ঘটে।

আরেকটা রেস — check-then-act:

```python
count = redis.get(key)           # দুটো প্রসেসই পড়ল 99
if count < 100:                  # দুটোই পাস করল
    redis.incr(key)              # ফল: 101
```

**একমাত্র সঠিক সমাধান: Lua স্ক্রিপ্ট।** Redis Lua স্ক্রিপ্ট atomically চলে — মাঝখানে অন্য কোনো কমান্ড ঢুকতে পারে না।

### ৪.৩ প্রোডাকশন Lua — Token Bucket

```lua
-- KEYS[1] : bucket key
-- ARGV[1] : capacity
-- ARGV[2] : refill rate (tokens per second)
-- ARGV[3] : now (milliseconds)
-- ARGV[4] : cost (কত টোকেন লাগবে)
-- return  : {allowed(0/1), remaining, retry_after_ms}

local capacity = tonumber(ARGV[1])
local rate     = tonumber(ARGV[2])
local now      = tonumber(ARGV[3])
local cost     = tonumber(ARGV[4])

local bucket = redis.call('HMGET', KEYS[1], 'tokens', 'ts')
local tokens = tonumber(bucket[1])
local ts     = tonumber(bucket[2])

if tokens == nil then
    tokens = capacity
    ts     = now
end

-- lazy refill
local elapsed = math.max(0, now - ts) / 1000.0
tokens = math.min(capacity, tokens + elapsed * rate)

local allowed = 0
local retry_after = 0

if tokens >= cost then
    tokens = tokens - cost
    allowed = 1
else
    retry_after = math.ceil(((cost - tokens) / rate) * 1000)
end

redis.call('HSET', KEYS[1], 'tokens', tokens, 'ts', now)
-- বালতি সম্পূর্ণ ভরতে যত সময়, তার একটু বেশি TTL → idle key নিজে মুছে যায়
redis.call('PEXPIRE', KEYS[1], math.ceil((capacity / rate) * 1000) + 1000)

return {allowed, math.floor(tokens), retry_after}
```

### ৪.৪ প্রোডাকশন Lua — Sliding Window Log

```lua
-- KEYS[1] : zset key
-- ARGV[1] : limit
-- ARGV[2] : window (ms)
-- ARGV[3] : now (ms)
-- ARGV[4] : unique member id (uuid)

local limit  = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local now    = tonumber(ARGV[3])

-- ১. উইন্ডোর বাইরের এন্ট্রি মুছে দাও
redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, now - window)

-- ২. এখন কতগুলো আছে
local count = redis.call('ZCARD', KEYS[1])

if count < limit then
    redis.call('ZADD', KEYS[1], now, ARGV[4])
    redis.call('PEXPIRE', KEYS[1], window)
    return {1, limit - count - 1, 0}
end

-- ৩. reject — সবচেয়ে পুরনোটা কখন expire করবে?
local oldest = redis.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')
local retry_after = math.ceil((tonumber(oldest[2]) + window) - now)
redis.call('PEXPIRE', KEYS[1], window)
return {0, 0, retry_after}
```

**সূক্ষ্মতা:** reject হলে ZADD করবেন **না**। করলে অ্যাটাকার হাতুড়ি চালিয়ে উইন্ডো চিরকাল ভর্তি রাখতে পারবে — একে বলে self-inflicted permanent ban।

### ৪.৫ সময় কার — ক্লায়েন্টের না Redis-এর?

`now` কোথা থেকে আসবে?

| উৎস | সুবিধা | অসুবিধা |
|-----|--------|---------|
| অ্যাপ সার্ভারের ঘড়ি | নেটওয়ার্ক খরচ নেই | সার্ভারগুলোর মধ্যে clock skew (NTP drift কয়েকশো ms) |
| `redis.call('TIME')` | একটাই ঘড়ি, skew নেই | পুরনো Redis-এ replication জটিলতা |

**সুপারিশ:** Redis 5+ এ effect-based replication থাকায় `TIME` নিরাপদ। মাল্টি-রিজিয়ন বা বহু app server থাকলে `TIME` ব্যবহার করুন — না হলে দুই সার্ভারের ৫০০ms পার্থক্যে বালতি ভুলভাবে রিফিল হবে।

### ৪.৬ Hot key সমস্যা ও লেটেন্সি

**সমস্যা ১ — লেটেন্সি:** প্রতি রিকোয়েস্টে ১টা Redis রাউন্ড-ট্রিপ। একই AZ-তে ~0.5ms, ক্রস-AZ ~2ms। ৫০০০ rps এ এটা সরাসরি আপনার p99-তে যোগ হবে।

**সমস্যা ২ — hot key:** `rl:otp.send:global` কী-টা **প্রতিটা** রিকোয়েস্টে হিট হয়। Redis Cluster-এ একটামাত্র shard সব লোড নেবে।

**সমাধান — Local + Global হাইব্রিড (token lease):**

```
┌────────────────────────────────────────────────────────┐
│  App instance-এ ছোট local bucket                        │
│                                                        │
│  Redis থেকে একবারে ১০০ টোকেন "ইজারা" নাও               │
│  → পরের ১০০ রিকোয়েস্ট Redis ছাড়াই সার্ভ হবে             │
│  → শেষ হলে আবার ইজারা নাও                              │
│                                                        │
│  Redis কল কমল ১০০×  |  খরচ: সামান্য over-admission     │
└────────────────────────────────────────────────────────┘
```

**হিসাব:** ১০ instance, প্রতিটা ১০০ টোকেন ইজারা নেয়। সবচেয়ে খারাপ ক্ষেত্রে অতিরিক্ত পাস = ১০ × ১০০ = ১০০০। limit যদি ১,০০,০০০/মিনিট হয়, ভুল = **১%** — গ্রহণযোগ্য। কিন্তু limit যদি ৫/১০মিনিট (OTP) হয়, ভুল = ২০০০০% — সম্পূর্ণ অগ্রহণযোগ্য।

**নিয়ম:** কড়া/নিরাপত্তা-সংক্রান্ত লিমিটে সবসময় strict Redis; উচ্চ-ভলিউমের ঢিলেঢালা লিমিটে lease।

**সমস্যা ৩ — Cluster এ key distribution:** কী-তে `{}` হ্যাশ ট্যাগ সাবধানে ব্যবহার করুন। `rl:{user:42}:search` লিখলে ঐ ইউজারের সব লিমিট এক shard-এ যাবে (multi-key Lua-র জন্য দরকার), কিন্তু hot user সেই shard-কে গরম করবে।

### ৪.৭ redis-cell (GCRA বিল্ট-ইন)

```
CL.THROTTLE user42 15 30 60 1
             │     │  │  │  │
             │     │  │  │  └─ cost
             │     │  └──┴──── 30 রিকোয়েস্ট প্রতি 60 সেকেন্ড
             │     └────────── max burst = 15
             └──────────────── key

রিটার্ন: [0/1 blocked, limit, remaining, retry_after, reset_after]
```

একটামাত্র atomic কমান্ড, Lua লাগে না। মডিউল ইনস্টল করা গেলে (self-managed Redis) দারুণ; তবে **AWS ElastiCache-এ কাস্টম মডিউল সাপোর্ট করে না** — তাই আপনার Mumbai region সেটআপে Lua-ই পথ।

### ৪.৮ Active Recall — পর্ব ৪

1. `INCR` তারপর `EXPIRE` — ঠিক কোন মুহূর্তে ক্র্যাশ করলে কী-টা অমর হয়ে যায়?
2. reject হওয়া রিকোয়েস্ট sliding log-এ ZADD করলে কী বিপদ?
3. আপনার ১২টা pod চলছে, প্রতিটা ৫০ টোকেন lease নেয় — `otp.send` policy-তে এটা কেন বিপজ্জনক?
4. ElastiCache-এ redis-cell কেন ব্যবহার করতে পারবেন না?

---

## পর্ব ৫ — কোন লেয়ারে রেট লিমিট বসাবেন

### ৫.১ সম্পূর্ণ স্ট্যাক

```
┌──────────────────────────────────────────────────────────────┐
│ ১. ক্লায়েন্ট (মোবাইল/ব্রাউজার)                                 │
│    debounce, throttle, ব্যাকঅফ — UX-এর জন্য, নিরাপত্তা নয়      │
├──────────────────────────────────────────────────────────────┤
│ ২. CDN / WAF (Cloudflare)                                    │
│    ভলিউমেট্রিক DDoS, bot, per-IP মোটা লিমিট                    │
│    ✅ সস্তা, origin-এ পৌঁছানোর আগেই বন্ধ                        │
│    ❌ আপনার business context জানে না                          │
├──────────────────────────────────────────────────────────────┤
│ ৩. Load Balancer / Ingress (Nginx, ALB)                      │
│    connection limit, per-IP request rate                     │
├──────────────────────────────────────────────────────────────┤
│ ৪. API Gateway (Kong, Envoy, APIGW)                          │
│    per-API-key, tenant tier, quota                           │
├──────────────────────────────────────────────────────────────┤
│ ৫. অ্যাপ্লিকেশন middleware                                     │
│    per-user, authenticated context                           │
├──────────────────────────────────────────────────────────────┤
│ ৬. হ্যান্ডলার/ডেকোরেটর  ← আপনার @rate_limit এখানে              │
│    endpoint-নির্দিষ্ট, business rule সহ                       │
├──────────────────────────────────────────────────────────────┤
│ ৭. আউটবাউন্ড / ডাউনস্ট্রিম                                     │
│    partner API TPS, DB connection pool, worker concurrency   │
└──────────────────────────────────────────────────────────────┘
```

### ৫.২ কোন লেয়ার কী ধরে

| হুমকি | সঠিক লেয়ার | কারণ |
|-------|------------|------|
| ১০ Gbps SYN flood | CDN/WAF | অ্যাপ পর্যন্ত আসাই উচিত নয় |
| এক IP থেকে ১০,০০০ rps | LB / WAF | সস্তা, শুরুতেই কেটে দেয় |
| একটা API key তার tier ছাড়াচ্ছে | Gateway | tier/billing এখানে জানা |
| একজন ইউজার OTP স্প্যাম করছে | অ্যাপ্লিকেশন | identity + business rule দরকার |
| SMS বাজেট শেষ | অ্যাপ্লিকেশন (spend layer) | টাকার হিসাব শুধু অ্যাপ জানে |
| পার্টনার API ৪২৯ দিচ্ছে | আউটবাউন্ড limiter | নিজের কলের হার নিয়ন্ত্রণ |

**মূল নীতি:** লিমিটটা যত উপরে (edge-এর কাছে) বসানো যায় ততই সস্তা; কিন্তু যত নিচে নামবেন, ততই বেশি context পাবেন। তাই **দুই জায়গাতেই** বসান।

### ৫.৩ Nginx (edge লেয়ার)

```nginx
# ১০MB জোন ≈ ১,৬০,০০০ IPv4 স্টেট ধরে
limit_req_zone $binary_remote_addr zone=perip:10m rate=10r/s;
limit_req_zone $http_x_api_key     zone=perkey:10m rate=100r/s;

limit_conn_zone $binary_remote_addr zone=conn:10m;

server {
    limit_req_status 429;
    limit_conn_status 429;

    location /api/ {
        # burst=20: ২০টা পর্যন্ত কিউ হবে
        # nodelay : কিউতে বসিয়ে না রেখে সাথে সাথে ছাড়বে (burst allow)
        limit_req  zone=perip burst=20 nodelay;
        limit_req  zone=perkey burst=50;
        limit_conn conn 10;
        proxy_pass http://app;
    }

    location /api/auth/ {
        limit_req zone=perip burst=3;   # nodelay নেই → ইচ্ছাকৃত ধীরগতি
        proxy_pass http://app;
    }
}
```

**`nodelay` না দিলে কী হয়:** rate=10r/s মানে nginx প্রতি ১০০ms-এ ১টা ছাড়বে, বাকিগুলো কিউতে অপেক্ষা করবে — এটা **leaky bucket** আচরণ। `nodelay` দিলে burst-গুলো সাথে সাথে যাবে — এটা **token bucket** আচরণ। লগইন endpoint-এ delay ভালো (brute force ধীর হয়), সাধারণ API-তে খারাপ (p99 latency বাড়ে)।

**গুরুত্বপূর্ণ:** Nginx Cloudflare-এর পেছনে থাকলে `$binary_remote_addr` হবে Cloudflare-এর IP — সব ইউজার একই কী শেয়ার করবে! `real_ip_header CF-Connecting-IP` + `set_real_ip_from` অবশ্যই কনফিগার করুন। (বিস্তারিত পর্ব ১০-এ।)

### ৫.৪ Active Recall — পর্ব ৫

1. একই লিমিট Cloudflare আর অ্যাপ্লিকেশন — দুই জায়গায় রাখা কি অপচয়? কেন নয়?
2. Nginx-এ `burst=20` আর `burst=20 nodelay` — আচরণে পার্থক্য কী?
3. SMS spend cap কেন WAF-এ বসানো যায় না?

---

## পর্ব ৬ — HTTP কন্ট্রাক্ট: 429, হেডার ও ব্যাকঅফ

### ৬.১ সঠিক রেসপন্স

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 42
RateLimit-Limit: 100
RateLimit-Remaining: 0
RateLimit-Reset: 42
RateLimit-Policy: 100;w=60
Cache-Control: no-store

{
  "error": {
    "code": "rate_limit_exceeded",
    "message": "অনেক বেশি রিকোয়েস্ট। ৪২ সেকেন্ড পরে আবার চেষ্টা করুন।",
    "retry_after": 42,
    "scope": "ip",
    "policy": "otp.send.phone"
  }
}
```

### ৬.২ হেডারের ব্যাখ্যা

| হেডার | মানে | নোট |
|-------|------|-----|
| `Retry-After` | কত সেকেন্ড (বা HTTP-date) পরে | সবচেয়ে বেশি সাপোর্টেড, **সবসময় দিন** |
| `RateLimit-Limit` | উইন্ডোর সীমা | IETF ড্রাফট স্ট্যান্ডার্ড |
| `RateLimit-Remaining` | আর কয়টা বাকি | সফল রেসপন্সেও দিন |
| `RateLimit-Reset` | কত সেকেন্ডে রিসেট | |
| `X-RateLimit-*` | পুরনো de-facto (GitHub/Twitter) | দুটোই দিলে ক্লায়েন্ট সুবিধা পায় |

**সফল রেসপন্সেও হেডার দিন** — তাহলে ভালো ক্লায়েন্ট 429 খাওয়ার আগেই নিজেকে ধীর করতে পারে। এটা proactive vs reactive-এর পার্থক্য।

**সিকিউরিটি ট্রেড-অফ:** `RateLimit-Remaining` অ্যাটাকারকে বলে দেয় ঠিক কতটা জায়গা আছে। লগইন/OTP-র মতো সংবেদনশীল endpoint-এ শুধু `Retry-After` দিন, বাকি হেডার বাদ।

### ৬.৩ ক্লায়েন্ট-সাইড: Exponential Backoff + Jitter

সবাই একসাথে ঠিক `Retry-After` পরে রিট্রাই করলে **thundering herd** — আবার সবাই 429 খাবে।

```python
import random, time

def call_with_backoff(fn, max_attempts=5, base=1.0, cap=60.0):
    for attempt in range(max_attempts):
        resp = fn()
        if resp.status_code != 429:
            return resp

        server_hint = float(resp.headers.get("Retry-After", 0))
        # exponential: 1, 2, 4, 8, 16 ...
        backoff = min(cap, base * (2 ** attempt))
        wait = max(server_hint, backoff)
        # full jitter — এটাই সবচেয়ে গুরুত্বপূর্ণ লাইন
        wait = random.uniform(0, wait)
        time.sleep(wait)

    raise Exception("rate limited, সব চেষ্টা ব্যর্থ")
```

**কেন full jitter:** ১০০০ ক্লায়েন্ট একসাথে 429 খেল।

| কৌশল | ৪ সেকেন্ডে রিট্রাই আসবে |
|------|------------------------|
| jitter নেই | ঠিক t=4s এ ১০০০টা → আবার ধস |
| `random(0, 4)` (full jitter) | ০–৪ সেকেন্ডে ছড়িয়ে, গড়ে ২৫০/সেকেন্ড ✅ |

AWS-এর প্রকাশিত সিমুলেশনেও "full jitter" সবচেয়ে ভালো ফল দেয় — মোট কাজ ও শেষ হওয়ার সময় দুটোই কমে।

### ৬.৪ Idempotency — অপরিহার্য সঙ্গী

রিট্রাই করলে ডুপ্লিকেট অর্ডার/পেমেন্ট হতে পারে। তাই লেখার (write) API-তে idempotency key:

```http
POST /api/orders
Idempotency-Key: 8f3a1c2e-...
```

সার্ভার key দেখে আগের রেসপন্স ফেরত দেবে, নতুন অর্ডার বানাবে না। **রেট লিমিট + রিট্রাই = ডুপ্লিকেটের ঝুঁকি** — এই দুটো সবসময় একসাথে ডিজাইন করবেন।

### ৬.৫ Active Recall — পর্ব ৬

1. `Retry-After` আর `RateLimit-Reset` — কোনটা কখন?
2. লগইন endpoint-এ `RateLimit-Remaining` না দেওয়ার কারণ কী?
3. full jitter না দিলে ১০০০ ক্লায়েন্টের ক্ষেত্রে কী ঘটে — সংখ্যায় বলুন।

---

## পর্ব ৭ — রিয়েল ইমপ্লিমেন্টেশন

### ৭.১ FastAPI — Redis Lua সহ পূর্ণ লিমিটার

```python
# limiter.py
import time
import uuid
from dataclasses import dataclass
from typing import Literal

import redis.asyncio as redis

TOKEN_BUCKET_LUA = """
local capacity = tonumber(ARGV[1])
local rate     = tonumber(ARGV[2])
local cost     = tonumber(ARGV[3])
local t        = redis.call('TIME')
local now      = tonumber(t[1]) * 1000 + math.floor(tonumber(t[2]) / 1000)

local b      = redis.call('HMGET', KEYS[1], 'tokens', 'ts')
local tokens = tonumber(b[1])
local ts     = tonumber(b[2])
if tokens == nil then tokens = capacity; ts = now end

local elapsed = math.max(0, now - ts) / 1000.0
tokens = math.min(capacity, tokens + elapsed * rate)

local allowed, retry = 0, 0
if tokens >= cost then
    tokens = tokens - cost
    allowed = 1
else
    retry = math.ceil(((cost - tokens) / rate) * 1000)
end

redis.call('HSET', KEYS[1], 'tokens', tokens, 'ts', now)
redis.call('PEXPIRE', KEYS[1], math.ceil((capacity / rate) * 1000) + 1000)
return {allowed, math.floor(tokens), retry}
"""


@dataclass(frozen=True)
class Policy:
    limit: int                       # প্রতি period-এ কতবার
    period: int                      # সেকেন্ড
    burst: int | None = None         # bucket capacity
    scope: Literal["ip", "net", "user", "id", "global"] = "ip"
    fail: Literal["open", "closed"] = "open"

    @property
    def rate(self) -> float:
        return self.limit / self.period

    @property
    def capacity(self) -> int:
        return self.burst or self.limit


@dataclass(frozen=True)
class Decision:
    allowed: bool
    remaining: int
    retry_after_ms: int


class RateLimiter:
    def __init__(self, r: redis.Redis):
        self.r = r
        self._script = r.register_script(TOKEN_BUCKET_LUA)

    async def check(self, name: str, ident: str, policy: Policy,
                    cost: int = 1) -> Decision:
        key = f"rl:{name}:{policy.scope}:{ident}"
        try:
            allowed, remaining, retry = await self._script(
                keys=[key],
                args=[policy.capacity, policy.rate, cost],
            )
        except redis.RedisError:
            if policy.fail == "closed":
                return Decision(False, 0, 1000)
            return Decision(True, -1, 0)   # fail-open
        return Decision(bool(allowed), int(remaining), int(retry))
```

মিডলওয়্যার:

```python
# middleware.py
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import math

POLICIES = {
    "otp.send.phone": Policy(limit=3,   period=600, scope="id",   fail="closed"),
    "otp.send.ip":    Policy(limit=10,  period=600, scope="ip",   fail="closed"),
    "otp.verify":     Policy(limit=5,   period=300, scope="id",   fail="closed"),
    "search":         Policy(limit=60,  period=60,  burst=20, scope="user"),
    "api.default":    Policy(limit=600, period=60,  burst=100, scope="user"),
}


def client_ip(request: Request) -> str:
    # ⚠️ শুধু trusted proxy-র পেছনে থাকলে তবেই XFF বিশ্বাস করুন
    xff = request.headers.get("x-forwarded-for", "")
    if xff:
        return xff.split(",")[-1].strip()   # ডানদিক থেকে, বামদিক থেকে নয়
    return request.client.host


@app.middleware("http")
async def rate_limit_mw(request: Request, call_next):
    policy = POLICIES["api.default"]
    ident = str(getattr(request.state, "user_id", None) or client_ip(request))

    d = await limiter.check("api.default", ident, policy)

    if not d.allowed:
        retry_s = max(1, math.ceil(d.retry_after_ms / 1000))
        return JSONResponse(
            status_code=429,
            content={"error": {"code": "rate_limit_exceeded",
                               "retry_after": retry_s}},
            headers={
                "Retry-After": str(retry_s),
                "RateLimit-Limit": str(policy.limit),
                "RateLimit-Remaining": "0",
                "RateLimit-Policy": f"{policy.limit};w={policy.period}",
            },
        )

    response = await call_next(request)
    response.headers["RateLimit-Limit"] = str(policy.limit)
    response.headers["RateLimit-Remaining"] = str(max(0, d.remaining))
    return response
```

### ৭.২ Django — ডেকোরেটর প্যাটার্ন (আপনার সিস্টেমের কাঠামো)

```python
# ratelimit/decorators.py
import functools
from django.conf import settings
from django.http import JsonResponse

def rate_limit(*policy_names, cost=1, ident=None):
    """
    একাধিক policy একসাথে চেক করে — defense in depth.

    @rate_limit("otp.send.phone", "otp.send.ip", "otp.send.net")
    """
    def decorator(view):
        @functools.wraps(view)
        def wrapper(request, *args, **kwargs):
            for name in policy_names:
                policy = settings.RATE_LIMIT_POLICIES[name]
                key_val = resolve_identity(request, policy["scope"], ident)
                decision = limiter.check(name, key_val, policy, cost)

                metrics.incr("rate_limit_decisions_total",
                             policy=name, scope=policy["scope"],
                             result="allow" if decision.allowed else "deny")

                if not decision.allowed:
                    retry = max(1, decision.retry_after_ms // 1000)
                    return JsonResponse(
                        {"error": {"code": "rate_limit_exceeded",
                                   "retry_after": retry}},
                        status=429,
                        headers={"Retry-After": str(retry)},
                    )
            return view(request, *args, **kwargs)
        return wrapper
    return decorator
```

`settings.py`-তে পলিসি (কোডে হার্ডকোড নয় — এটাই ঠিক প্যাটার্ন):

```python
RATE_LIMIT_POLICIES = {
    "otp.send.forgot": {"limit": 3,  "period": 600,  "scope": "id",  "fail": "closed"},
    "otp.send.email":  {"limit": 5,  "period": 3600, "scope": "id",  "fail": "closed"},
    "otp.send.phone":  {"limit": 3,  "period": 600,  "scope": "id",  "fail": "closed"},
    "otp.verify":      {"limit": 5,  "period": 300,  "scope": "id",  "fail": "closed"},
    "payment.initiate":{"limit": 5,  "period": 300,  "scope": "user","fail": "closed"},
    "paid.geocode":    {"limit": 30, "period": 60,   "scope": "user","fail": "closed"},
    "api.default":     {"limit": 600,"period": 60,   "scope": "user","fail": "open"},
}
```

### ৭.৩ Spend layer — কেন কাউন্টার যথেষ্ট নয়

এটাই সেই জায়গা যেখানে বেশিরভাগ টিউটোরিয়াল থেমে যায়, কিন্তু বাস্তব সিস্টেম শুরু হয়।

**সমস্যা:** rate limit বলে "৩টা রিকোয়েস্ট পাস"। কিন্তু SMS পাঠাতে গিয়ে provider timeout দিল। টোকেন কাটা হয়ে গেছে, SMS যায়নি — ইউজার শাস্তি পেল বিনা কারণে। উল্টোদিকে, রিকোয়েস্ট পাস করার পর SMS পাঠাতে গিয়ে ২০ বার রিট্রাই হলে ২০টা SMS-এর বিল এল, অথচ কাউন্টার বলছে ১।

**সমাধান — reserve/release (দুই-পর্যায়ের কমিট):**

```python
budget = SpendBudget("sms")

# ১. আগে সংরক্ষণ (atomic)
token = budget.reserve(amount=1, ident=phone)
if token is None:
    return error("দৈনিক SMS বাজেট শেষ")

try:
    provider.send_sms(phone, message)   # আসল খরচ এখানে
    budget.commit(token)                # নিশ্চিত করো
except ProviderError:
    budget.release(token)               # ফেরত দাও — ইউজারকে শাস্তি নয়
    raise
```

```
      reserve                commit / release
         │                          │
         ▼                          ▼
   ┌──────────┐  সফল হলে      ┌──────────┐
   │ RESERVED ├──────────────▶│ COMMITTED│  বাজেট থেকে কাটা গেল
   └────┬─────┘               └──────────┘
        │ ব্যর্থ / timeout
        ▼
   ┌──────────┐
   │ RELEASED │  বাজেট ফেরত
   └──────────┘

   ⚠️ release না হলে? → reservation-এ TTL দিন, নিজে expire হবে
```

**দ্বৈত ক্যাপ (আপনার সিস্টেমে যা আছে):**

```
দৈনিক ক্যাপ      : 5000 SMS/দিন   → fixed window (সহজ, বিলিং-সংগত)
রোলিং ক্যাপ      : 500 SMS/ঘণ্টা  → sorted set (নিখুঁত, স্পাইক ধরে)

কেন দুটোই?
  শুধু দৈনিক থাকলে → রাত ১২:০০ টায় ৫০০০ SMS একসাথে যেতে পারে
  শুধু রোলিং থাকলে → দিনে ১২০০০ SMS যেতে পারে (৫০০ × ২৪)
```

### ৭.৪ Active Recall — পর্ব ৭

1. `reserve/release` না থাকলে provider timeout-এ ইউজার কীভাবে ভুক্তভোগী হয়?
2. reservation-এ TTL না দিলে কী হবে?
3. দৈনিক ও রোলিং — দুটোই কেন লাগে? প্রতিটার একক ব্যর্থতা সংখ্যায় দেখান।

---

## পর্ব ৮ — অ্যাডভান্সড প্যাটার্ন

### ৮.১ Cost-based / Weighted rate limiting

সব রিকোয়েস্টের দাম সমান নয়। Token bucket-এ শুধু `cost` বদলান।

```python
COST_TABLE = {
    ("GET",  "/api/health"):        0,     # ফ্রি
    ("GET",  "/api/products"):      1,
    ("GET",  "/api/search"):        5,     # Elasticsearch
    ("POST", "/api/geocode"):      20,     # টাকা লাগে
    ("POST", "/api/report/export"):100,    # ভারী
}
```

**LLM API — টোকেন-ভিত্তিক দ্বৈত লিমিট:**

```
দুটো আলাদা বালতি একসাথে চলে:
  RPM bucket : 500 requests/minute
  TPM bucket : 200,000 tokens/minute

প্রি-চেক  : estimated_tokens = input_tokens + max_tokens   ← আগে reserve
পোস্ট-অ্যাডজাস্ট: আসল খরচ জানার পর অতিরিক্ত টোকেন ফেরত

উদাহরণ: 1000 in + max_tokens 4000 → 5000 reserve
        আসলে 800 আউটপুট → 1800 ব্যবহৃত → 3200 ফেরত
```

এটা ঠিক আপনার `budget.reserve/release` প্যাটার্নেরই আরেক রূপ।

### ৮.২ Tiered / Plan-based

```python
TIERS = {
    "free":       {"limit": 60,    "period": 60,  "burst": 10,   "concurrency": 2},
    "pro":        {"limit": 1000,  "period": 60,  "burst": 200,  "concurrency": 10},
    "enterprise": {"limit": 10000, "period": 60,  "burst": 2000, "concurrency": 50},
}
```

**সূক্ষ্মতা:** tier আপগ্রেড করলে বালতি সাথে সাথে বড় হবে কি? পুরনো bucket key-তে ছোট capacity লেখা থাকতে পারে। সমাধান — কী-তে tier version এনকোড করুন: `rl:api:user:42:v3`। tier বদলালে version বাড়ান, নতুন বালতি ভর্তি অবস্থায় শুরু হবে।

### ৮.৩ Adaptive / Dynamic rate limiting (AIMD)

স্ট্যাটিক লিমিট সবসময় ভুল — হয় খুব কড়া (ক্যাপাসিটি নষ্ট), নয় খুব ঢিলা (ওভারলোড)। সমাধান: সিস্টেমের স্বাস্থ্য দেখে লিমিট নিজে বদলাক।

**AIMD (Additive Increase, Multiplicative Decrease)** — TCP congestion control-এর মতো:

```
প্রতি ১০ সেকেন্ডে:
    if p99_latency < 200ms এবং error_rate < 1%:
        limit = min(max_limit, limit + 10)        ← ধীরে বাড়াও
    elif p99_latency > 500ms বা error_rate > 5%:
        limit = max(min_limit, limit × 0.7)       ← দ্রুত কমাও
```

**সিমুলেশন:**

| চক্র | p99 | limit (আগে) | কাজ | limit (পরে) |
|------|-----|------------|-----|------------|
| 1 | 120ms | 500 | +10 | 510 |
| 2 | 140ms | 510 | +10 | 520 |
| 3 | 610ms | 520 | ×0.7 | 364 |
| 4 | 180ms | 364 | +10 | 374 |
| 5 | 160ms | 374 | +10 | 384 |

লক্ষ্য করুন — বাড়ে ধীরে, কমে দ্রুত। এটা ইচ্ছাকৃত: ওভারলোড থেকে দ্রুত সরে আসা জরুরি, ক্যাপাসিটি ফিরে পাওয়া ধীর হলেও চলে।

```
limit
  │      ╱╲            ╱╲          ╱╲
  │    ╱    ╲        ╱    ╲      ╱    ╲     ← করাত-দাঁত প্যাটার্ন
  │  ╱        ╲    ╱        ╲  ╱        ╲
  │╱            ╲╱            ╲╱
  └──────────────────────────────────────▶ সময়
      ধীরে বাড়ে      হঠাৎ কমে
```

### ৮.৪ Concurrency limiting ও Little's Law

**রেট নয়, একসাথে কয়টা চলছে — সেটাই আসল রিসোর্স।**

```
Little's Law:   L = λ × W
                │   │   └─ গড় লেটেন্সি (সেকেন্ড)
                │   └───── আগমন হার (rps)
                └───────── গড় concurrency
```

**হিসাব:** আপনার API-তে 500 rps আসে, গড় লেটেন্সি 200ms।

```
L = 500 × 0.2 = 100 টা রিকোয়েস্ট সবসময় in-flight
```

DB pool-এ যদি ৫০টা কানেকশন থাকে — আপনি ইতিমধ্যেই ২× ওভারসাবস্ক্রাইবড, কিউ জমছে।

এখন ডাউনস্ট্রিম ধীর হয়ে লেটেন্সি 200ms → 2s হলে:

```
L = 500 × 2 = 1000 in-flight
```

রেট একই আছে, কিন্তু concurrency **১০ গুণ**। rate limiter এটা ধরবেই না — কারণ rps বদলায়নি। এজন্যই **concurrency limiter আলাদাভাবে দরকার**।

```python
import asyncio
sem = asyncio.Semaphore(50)

async def handler(request):
    try:
        await asyncio.wait_for(sem.acquire(), timeout=0.05)
    except asyncio.TimeoutError:
        return JSONResponse({"error": "server busy"}, status_code=503)
    try:
        return await do_work(request)
    finally:
        sem.release()
```

**নোট:** এটা 503, 429 নয় — কারণ সমস্যাটা সার্ভারের, ক্লায়েন্টের নয় (পর্ব ১.৪ মনে করুন)।

### ৮.৫ Fairness — Shuffle Sharding

Multi-tenant সিস্টেমে একজন noisy tenant সবাইকে ফেলে দিতে পারে। সাধারণ sharding-এ ৮টা worker pool থাকলে ঐ pool-এর সব tenant ভোগে।

```
সাধারণ shard:  tenant → hash → shard 3
               shard 3-এর সব tenant একসাথে ভোগে

Shuffle shard: tenant → ৮টার মধ্যে যেকোনো ২টা shard
               tenant A → {1, 5}
               tenant B → {1, 7}   ← A খারাপ করলে B-র 7 এখনো ভালো
               tenant C → {3, 6}   ← সম্পূর্ণ অক্ষত
```

৮টা shard থেকে ২টা বাছার উপায় = C(8,2) = **২৮টা ভিন্ন কম্বিনেশন**। মানে একজন খারাপ tenant-এর সাথে পুরোপুরি ওভারল্যাপ করার সম্ভাবনা ১/২৮ ≈ ৩.৬%। ১০০ জন tenant থাকলে গড়ে ৩-৪ জন ক্ষতিগ্রস্ত হবে, ১০০ জন নয়।

### ৮.৬ Load shedding ও priority

ওভারলোডে সব সমান নয়:

```python
PRIORITY = {
    "payment.callback": 0,   # কখনো ফেলবেন না
    "checkout":         1,
    "login":            2,
    "search":           3,
    "recommendations":  4,   # সবার আগে ফেলুন
}

def should_shed(priority: int) -> bool:
    load = current_load_factor()          # 0.0 – 1.5
    if load < 0.8:
        return False
    threshold = (load - 0.8) * 10         # 0.8→0, 1.3→5
    return priority > (5 - threshold)
```

**উদাহরণ:** load = 1.1 → threshold = 3 → priority > 2 হলে ফেলে দাও। মানে search ও recommendations বাদ, কিন্তু payment/checkout/login চালু। সাইট "ধীর" হবে, "ডাউন" হবে না।

### ৮.৭ আউটবাউন্ড রেট লিমিটিং

আপনার সার্ভিস নিজেই যখন ক্লায়েন্ট (SMS gateway, bKash, Google Places):

```
┌──────────────────────────────────────────────────────┐
│  ১০টা worker pod, সবাই SMS পাঠাতে চায়                 │
│  প্রোভাইডার লিমিট: ১০ TPS (global)                    │
│                                                      │
│  ভুল: প্রতি pod-এ ১০ TPS → বাস্তবে ১০০ TPS → ব্লক     │
│  ভুল: প্রতি pod-এ ১ TPS → pod বাড়লে/কমলে ভুল হার      │
│  সঠিক: Redis-এ শেয়ারড leaky bucket, worker টোকেন নেয়  │
└──────────────────────────────────────────────────────┘

  worker ──▶ acquire_token("sms_gateway", tps=10)
                     │
                     ├─ পেল → পাঠাও
                     └─ পেল না → অপেক্ষা করো (drop নয়, কারণ SMS হারানো যাবে না)
```

**পার্থক্য মনে রাখুন:** ইনবাউন্ডে অতিরিক্ত রিকোয়েস্ট **reject** করা যায় (ক্লায়েন্ট রিট্রাই করবে)। আউটবাউন্ডে সাধারণত **queue + delay** করতে হয়, কারণ কাজটা ইতিমধ্যে গ্রহণ করা হয়ে গেছে।

### ৮.৮ Active Recall — পর্ব ৮

1. rps একই থাকা সত্ত্বেও concurrency ১০ গুণ হতে পারে কীভাবে? Little's Law দিয়ে দেখান।
2. AIMD-তে বাড়ানো additive আর কমানো multiplicative — কেন উল্টো নয়?
3. ৮ shard থেকে ২টা shuffle shard নিলে blast radius কতটা কমে?
4. আউটবাউন্ড লিমিটে reject না করে queue করা কেন?

---

## পর্ব ৯ — ১৫টি রিয়েল-ওয়ার্ল্ড ইউজকেস

প্রতিটার জন্য: **সমস্যা → হুমকি → key → অ্যালগরিদম → পলিসি → এজ কেস**

---

### ইউজকেস ১ — লগইন (Brute force / Credential stuffing)

| | |
|---|---|
| **হুমকি** | পাসওয়ার্ড গেসিং, ফাঁস হওয়া ক্রেডেনশিয়াল দিয়ে বহু অ্যাকাউন্টে চেষ্টা |
| **key** | তিন স্তর: `username`, `ip`, `ip_subnet` |
| **অ্যালগরিদম** | Sliding window log (নিখুঁততা দরকার) |

```
per-username : 5 ব্যর্থ / 15 মিনিট  → তারপর ৩০ মিনিট লক
per-ip       : 20 ব্যর্থ / 15 মিনিট
per-/24      : 100 ব্যর্থ / 15 মিনিট
global       : ব্যর্থতার হার > 30% → সবার জন্য CAPTCHA চালু
```

**কেন তিন স্তর:**
- শুধু per-username → অ্যাটাকার ১০,০০০ ইউজারনেমে ৫টা করে চেষ্টা করবে (= credential stuffing), কোনো লিমিট ট্রিগার হবে না
- শুধু per-IP → botnet-এর ১০০০ IP থেকে প্রতিটায় ১৯টা চেষ্টা = ১৯,০০০ চেষ্টা

**গুরুত্বপূর্ণ:** শুধু **ব্যর্থ** চেষ্টা গুনুন। সফল লগইনে কাউন্টার রিসেট করুন — না হলে অফিসের NAT-এর পেছনে থাকা সবাই ব্লক হয়ে যাবে।

**এজ কেস — DoS by lockout:** username দিয়ে লক করলে অ্যাটাকার ইচ্ছা করে ভুল পাসওয়ার্ড দিয়ে আপনার অ্যাকাউন্ট লক করতে পারে। সমাধান: হার্ড লক না দিয়ে ধাপে ধাপে delay + CAPTCHA, এবং পরিচিত ডিভাইস/IP থেকে এলে ছাড় দিন।

---

### ইউজকেস ২ — OTP পাঠানো (আপনার Flow 2: form fill-up)

| | |
|---|---|
| **হুমকি** | SMS বোমা (ভিক্টিমকে স্প্যাম), বিল উড়ানো, নম্বর এনুমারেশন |
| **বিশেষত্ব** | অ্যানোনিমাস — কোনো authenticated user নেই |

```
স্তর ১ — identifier (নম্বর/ইমেইল) : ৩ / ১০ মিনিট, ৫ / ২৪ ঘণ্টা
স্তর ২ — cooldown                : পরপর দুই OTP-র মাঝে কমপক্ষে ৬০ সেকেন্ড
স্তর ৩ — IP                      : ১০ / ১০ মিনিট
স্তর ৪ — /24 সাবনেট              : ৪০ / ১০ মিনিট
স্তর ৫ — global                  : ৫০০ / মিনিট
স্তর ৬ — spend(sms)              : দৈনিক ৫০০০ + রোলিং ৫০০/ঘণ্টা  [fail-closed]
```

**progressive backoff (খুব কার্যকর):**

```
১ম OTP → সাথে সাথে
২য় OTP → ৬০ সেকেন্ড পরে
৩য় OTP → ৩০০ সেকেন্ড পরে
৪র্থ    → ২৪ ঘণ্টা ব্লক
```

**সম্পূর্ণ ফ্লো:**

```
POST /otp/send  {"phone": "+8801712345678"}
        │
        ▼
  ফরম্যাট ভ্যালিডেশন (Redis হিট করার আগেই — সস্তা)
        │
        ▼
  normalize! ("01712345678", "+8801712345678", "8801712345678"
              → সব একই কী হতে হবে, না হলে ৩× বাইপাস)
        │
        ▼
  ৫টা rate limit চেক (উপরের স্তর ১–৫)
        │  কোনোটা ফেল → 429 + Retry-After
        ▼
  budget.reserve("sms", 1)
        │  ব্যর্থ → 503 "সাময়িকভাবে অনুপলব্ধ"
        ▼
  OTP জেনারেট (crypto-secure, ৬ ডিজিট)
  Fernet challenge টোকেন, ttl=300
        │
        ▼
  provider.send()
        │
   ┌────┴────┐
   ▼         ▼
 সফল      ব্যর্থ → budget.release() → 502
 commit
   │
   ▼
  সবসময় uniform 200 (নম্বর আছে কি নেই — ফাঁস করবেন না)
```

**এজ কেস — normalization বাইপাস:** আপনার Flow 2-এ existence check নেই বলে অ্যাটাকার নম্বরের ফরম্যাট ঘুরিয়ে (`+880...`, `880...`, `0...`) তিনটা আলাদা bucket পেতে পারে। **rate limit key বানানোর আগেই canonical form-এ নরমালাইজ করা বাধ্যতামূলক।** ইমেইলের ক্ষেত্রে: lowercase, এবং Gmail হলে `+tag` ও ডট সরানোর কথা ভাবুন (`r.a.kib+x@gmail.com` = `rakib@gmail.com`)।

---

### ইউজকেস ৩ — OTP যাচাই (verify)

| | |
|---|---|
| **হুমকি** | ৬-ডিজিট কোড ব্রুট-ফোর্স |

**গণিত দিয়ে বুঝুন কেন লিমিট অপরিহার্য:**

```
৬ ডিজিট = 1,000,000 সম্ভাবনা
লিমিট না থাকলে, ১০০ rps এ → 1,000,000 ÷ 100 = 10,000 সেকেন্ড ≈ ২.৮ ঘণ্টায় নিশ্চিত ভাঙবে
OTP-র TTL ৩০০ সেকেন্ড হলেও ৩০০ × ১০০ = ৩০,০০০ চেষ্টা = ৩% সফলতার সম্ভাবনা প্রতি OTP-তে
১০০০ ইউজারে চালালে → ৩০ জনের অ্যাকাউন্ট ভাঙবে
```

**লিমিট দিলে:**

```
৫ চেষ্টা / challenge → 5 ÷ 1,000,000 = 0.0005% সম্ভাবনা
```

```
per-challenge : ৫ চেষ্টা, তারপর challenge অকার্যকর (নতুন OTP নিতে হবে)
per-ip        : ২০ / ১০ মিনিট
```

**অপরিহার্য নিয়ম:** ব্যর্থ চেষ্টার সীমা শেষ হলে **challenge টোকেন ধ্বংস করুন**, শুধু rate limit নয়। না হলে অ্যাটাকার অপেক্ষা করে করে চালিয়ে যাবে। এবং **constant-time comparison** ব্যবহার করুন (`hmac.compare_digest`) — timing attack ঠেকাতে।

---

### ইউজকেস ৪ — পাবলিক API (tier-ভিত্তিক)

```
Free       :  60/min,  burst 10,   1,000/দিন
Pro        : 1,000/min, burst 200, 500,000/মাস
Enterprise : কাস্টম + ডেডিকেটেড quota
```

**দুই স্তর একসাথে:** rate (burst নিয়ন্ত্রণ) + quota (বিলিং)। rate = token bucket, quota = মাসিক কাউন্টার।

```
rate limit শেষ  → 429 (কিছুক্ষণ পরে আবার পাবে)
quota শেষ       → 402 Payment Required / 403 (আপগ্রেড লাগবে)
```

দুটোকে একই স্ট্যাটাস দিলে ক্লায়েন্ট অনন্তকাল রিট্রাই করবে — ৪২৯ দেখে সে ভাববে অপেক্ষা করলেই হবে।

---

### ইউজকেস ৫ — সার্চ / অটোকমপ্লিট

| | |
|---|---|
| **হুমকি** | প্রতি কী-স্ট্রোকে ES কল, স্ক্র্যাপিং |

```
ক্লায়েন্ট : 300ms debounce (৭০% কল এখানেই কমে)
সার্ভার   : per-user 60/min, burst 20 (টাইপিং burst স্বাভাবিক)
           per-ip   120/min (anonymous সার্চ)
cost      : 5 (ES হিট ব্যয়বহুল)
```

**Debounce বনাম Throttle (ক্লায়েন্ট-সাইড):**

```
কী-স্ট্রোক:  r  a  k  i  b        (প্রতিটা ১০০ms ব্যবধানে)

Debounce(300ms): ─────────────────[rakib]   ← শেষ থামার পর ১টা কল
Throttle(300ms): [r]──────[kib]──────       ← নিয়মিত ব্যবধানে কল

সার্চ সাজেশনে debounce ✅  |  স্ক্রল/রিসাইজে throttle ✅
```

**প্রোডাকশন ইনসাইট:** আপনার Elasticsearch sync pipeline-এ ES cluster-ই বটলনেক। সার্চ rate limit শুধু abuse ঠেকায় না — এটা আসলে আপনার ES-এর জন্য admission control।

---

### ইউজকেস ৬ — ফাইল আপলোড

```
সংখ্যা   : 10 আপলোড / ঘণ্টা / user
বাইট     : 500 MB / দিন / user     ← token bucket, cost = ফাইল সাইজ
concurrency: 2 একসাথে / user
আকার     : সর্বোচ্চ 50 MB / ফাইল
```

**গুরুত্বপূর্ণ:** `Content-Length` হেডার দেখে **আপলোড শুরুর আগেই** reject করুন। পুরো ফাইল নিয়ে তারপর 429 দেওয়া মানে ব্যান্ডউইথ ইতিমধ্যেই খরচ হয়ে গেছে — অ্যাটাকার এটাকেই অস্ত্র বানাবে।

---

### ইউজকেস ৭ — পেমেন্ট ইনিশিয়েট

| | |
|---|---|
| **হুমকি** | কার্ড টেস্টিং (চুরি করা কার্ড যাচাই), ডুপ্লিকেট চার্জ |

```
per-user   : 5 / 5 মিনিট                 [fail-closed]
per-card   : 3 ব্যর্থ / ঘণ্টা (hash করা)
per-ip     : 10 / ঘণ্টা
ব্যর্থতার হার: একই user-এ >50% ব্যর্থ → ম্যানুয়াল রিভিউ
```

**অবশ্যই idempotency key** — না হলে রিট্রাইয়ে ডাবল চার্জ। এটা রেট লিমিটের সাথে অবিচ্ছেদ্য।

---

### ইউজকেস ৮ — ওয়েবহুক (দুই দিকই)

**ইনবাউন্ড (SSLCommerz/bKash আপনাকে কল করছে):**

```
⚠️ এখানে সাধারণ rate limit বিপজ্জনক — বৈধ কলব্যাক ফেলে দিলে টাকা হারাবেন

সঠিক পন্থা:
  ১. IP allowlist (প্রোভাইডারের রেঞ্জ)  ← মূল প্রতিরক্ষা
  ২. HMAC সিগনেচার যাচাই
  ৩. rate limit শুধু allowlist-এর বাইরের IP-তে, খুব কড়া
  ৪. allowlisted IP-তে উদার লিমিট (স্পাইক-এ যেন না ফেলে)
```

**আউটবাউন্ড (আপনি কাস্টমারকে কল করছেন):**

```
per-endpoint : 10 TPS (ধীর গ্রাহককে ডুবিয়ে দেবেন না)
রিট্রাই      : 1s, 2s, 4s, 8s... সর্বোচ্চ ২৪ ঘণ্টা, jitter সহ
circuit breaker: টানা ১০ ব্যর্থতা → endpoint সাসপেন্ড + ইমেইল
```

---

### ইউজকেস ৯ — থার্ড-পার্টি API কল (Google Places / Geocoding)

```
প্রোভাইডার লিমিট : 50 QPS, $5 প্রতি 1000 কল
আপনার লিমিট     : 40 QPS (হেডরুম রাখুন), দৈনিক $50 ক্যাপ

স্তর:
  per-user  : 30 / মিনিট
  global    : 40 QPS (leaky bucket — burst নয়)
  spend     : দৈনিক ১০,০০০ কল [fail-closed]
  cache     : ৭ দিনের ক্যাশ ← আসলে সবচেয়ে বড় সাশ্রয়
```

**হিসাব:** ৭০% ক্যাশ হিট রেট মানে ১০,০০০ ইউজার-রিকোয়েস্টে মাত্র ৩,০০০ প্রোভাইডার কল = $১৫ এর বদলে $৫০... মানে **৭০% খরচ কমল**। রেট লিমিটের আগে ক্যাশিং ভাবুন — এটা সবচেয়ে বেশি রিটার্ন দেয়।

---

### ইউজকেস ১০ — LLM API প্রক্সি

```
RPM  : 500 requests/min      → token bucket
TPM  : 200,000 tokens/min    → token bucket, cost = আনুমানিক টোকেন
concurrency : 20 (স্ট্রিমিং কানেকশন দীর্ঘ)
খরচ  : দৈনিক $100 ক্যাপ per tenant
```

আগে reserve, পরে আসল খরচ জেনে সমন্বয় — পর্ব ৮.১ দেখুন।

---

### ইউজকেস ১১ — স্ক্র্যাপার / বট প্রতিরোধ

```
সংকেত (শুধু rate নয়):
  - রিকোয়েস্টের ব্যবধানে অস্বাভাবিক নিয়মিততা (মানুষ এত নিখুঁত নয়)
  - User-Agent, TLS fingerprint (JA3)
  - Referer অনুপস্থিত
  - সব রিকোয়েস্ট ঠিক ক্রমানুসারে (id=1,2,3...)
  - JS চ্যালেঞ্জ ফেল

প্রতিক্রিয়ার সিঁড়ি:
  সন্দেহ কম   → নীরব (শুধু লগ)
  মাঝারি      → CAPTCHA
  বেশি        → tarpit (ধীরে ধীরে রেসপন্স)
  নিশ্চিত     → 429/403
```

**Tarpit কেন কার্যকর:** 403 দিলে অ্যাটাকার সাথে সাথে জানে, কৌশল বদলায়। ৩০ সেকেন্ড ধরে ধীরে রেসপন্স দিলে তার স্ক্র্যাপারের থ্রেড আটকে থাকে — তার খরচ বাড়ে, আপনার কমে।

---

### ইউজকেস ১২ — Kafka / Queue কনজিউমার থ্রটলিং

আপনার নোটিফিকেশন সিস্টেমের (১০০M+/দিন) কনটেক্সটে:

```
সমস্যা: কনজিউমার DB-র চেয়ে দ্রুত পড়লে DB ডুবে যাবে

সমাধানের স্তর:
  ১. max.poll.records            ← একবারে কত মেসেজ
  ২. কনজিউমার-সাইড token bucket  ← প্রতি সেকেন্ডে কত প্রসেস
  ৩. pause()/resume()            ← ডাউনস্ট্রিম ধীর হলে partition থামাও
  ৪. consumer lag মনিটর          ← lag বাড়লে অ্যালার্ট
```

```
                lag কম          lag বাড়ছে
                  │                 │
   consumer ──────┴──── DB ─────────┴──── pause(partition)
      ▲                                        │
      └────────── resume() যখন lag কমে ◀────────┘
```

**মূল পার্থক্য:** এখানে reject করার উপায় নেই (মেসেজ Kafka-তে আছেই)। তাই এটা **backpressure**, rate limit নয় — গতি নিয়ন্ত্রণ, প্রত্যাখ্যান নয়।

---

### ইউজকেস ১৩ — ডেটাবেজ সুরক্ষা

```
কানেকশন pool : সর্বোচ্চ 50 (PgBouncer-এ transaction pooling)
statement_timeout : 5s          ← runaway query কাটো
per-tenant query  : 100/min     ← একজন tenant DB দখল করবে না
ভারী রিপোর্ট      : read replica-তে পাঠাও + concurrency 2
```

**Little's Law মনে করুন:** 500 rps × 200ms = 100 concurrent, কিন্তু pool-এ ৫০। ৫০টা অপেক্ষা করছে → লেটেন্সি বাড়ছে → concurrency আরও বাড়ছে → **congestion collapse**। rate limiter দিয়ে ভেতরে ঢোকা কমানোই এখানে একমাত্র রক্ষা।

---

### ইউজকেস ১৪ — ইমেইল পাঠানো

```
per-recipient : 5 / ঘণ্টা (স্প্যাম হিসেবে চিহ্নিত হওয়া এড়াতে)
per-user      : 50 / দিন
global        : প্রোভাইডারের TPS (leaky bucket)
bounce rate   : > 5% হলে থামুন — না হলে ডোমেইন reputation নষ্ট
```

**ব্যবসায়িক ইনসাইট:** এখানে rate limit শুধু কারিগরি নয় — bounce/complaint rate বেশি হলে SES/SendGrid আপনার অ্যাকাউন্ট সাসপেন্ড করবে। রেট লিমিট এখানে **deliverability protection**।

---

### ইউজকেস ১৫ — ভোট / লাইক / রিভিউ (স্প্যাম)

```
per-user per-item   : 1 (idempotent — টগল, কাউন্ট নয়)
per-user global     : 100 লাইক / ঘণ্টা
per-item            : অস্বাভাবিক স্পাইক ডিটেকশন (১ মিনিটে ১০০০ লাইক?)
নতুন অ্যাকাউন্ট      : ২৪ ঘণ্টার আগে ভোট দিতে পারবে না
```

**মূল পাঠ:** এখানে সবচেয়ে ভালো "রেট লিমিট" আসলে **ডেটা মডেল** — `UNIQUE(user_id, item_id)` কনস্ট্রেইন্ট। একই লাইক দুইবার গোনার সুযোগই না রাখলে rate limit অনেক কম দরকার হয়। **যেখানে ইডেম্পোটেন্সি দিয়ে সমস্যা সমাধান করা যায়, সেখানে রেট লিমিট দ্বিতীয় পছন্দ।**

---

## পর্ব ১০ — বাইপাস ও সিকিউরিটি

### ১০.১ X-Forwarded-For স্পুফিং — সবচেয়ে কমন ভুল

```
অ্যাটাকার পাঠায়:
    X-Forwarded-For: 1.2.3.4

আপনার কোড লেখে:
    ip = request.headers["X-Forwarded-For"].split(",")[0]   ❌

ফল: অ্যাটাকার প্রতি রিকোয়েস্টে নতুন IP বসিয়ে দেয় → অসীম রেট লিমিট
```

**XFF কীভাবে জমা হয়:**

```
ক্লায়েন্ট (স্পুফড: "1.2.3.4")
   │  XFF: 1.2.3.4
   ▼
Cloudflare
   │  XFF: 1.2.3.4, <আসল ক্লায়েন্ট IP>
   ▼
আপনার Nginx
   │  XFF: 1.2.3.4, <আসল ক্লায়েন্ট IP>, <CF IP>
   ▼
অ্যাপ

বাম দিক = অ্যাটাকার যা খুশি লিখতে পারে ❌
ডান দিক = আপনার প্রক্সি যোগ করেছে ✅
```

**সঠিক নিয়ম:**

```python
TRUSTED_PROXIES = 2   # Cloudflare + Nginx

def client_ip(request):
    # Cloudflare-এর পেছনে থাকলে এটাই সবচেয়ে নিরাপদ
    cf = request.headers.get("cf-connecting-ip")
    if cf and from_cloudflare(request):
        return cf

    chain = [p.strip() for p in
             request.headers.get("x-forwarded-for", "").split(",") if p.strip()]
    if len(chain) >= TRUSTED_PROXIES:
        return chain[-TRUSTED_PROXIES]     # ডান দিক থেকে গুনুন
    return request.client.host
```

**টেস্ট:** নিজের API-তে `curl -H "X-Forwarded-For: 1.2.3.4"` দিয়ে ২০০ বার হিট করুন। ব্লক না হলে আপনার লিমিটার অকেজো।

### ১০.২ IPv6 — /128 নয়, /64 ধরুন

```
একজন IPv6 ইউজার সাধারণত পায় /64 বা /48 ব্লক

/64 ব্লক = 2^64 = 18,446,744,073,709,551,616 টা ঠিকানা

per-address লিমিট করলে অ্যাটাকার প্রতি রিকোয়েস্টে নতুন ঠিকানা ব্যবহার করবে
→ রেট লিমিট কার্যত অস্তিত্বহীন
```

```python
import ipaddress

def rl_key_for_ip(ip: str) -> str:
    addr = ipaddress.ip_address(ip)
    if addr.version == 6:
        return str(ipaddress.ip_network(f"{ip}/64", strict=False))
    return str(addr)
```

### ১০.৩ NAT / CGNAT — উল্টো সমস্যা

বাংলাদেশে অনেক ISP CGNAT ব্যবহার করে — হাজার হাজার গ্রাহক একই পাবলিক IP শেয়ার করে। কড়া per-IP লিমিট দিলে **বৈধ ইউজাররা একে অপরকে ব্লক করবে**।

```
সমাধান:
  - authenticated ইউজারে per-user লিমিট ব্যবহার করুন, per-IP নয়
  - per-IP লিমিট উদার রাখুন, শুধু ব্যাকস্টপ হিসেবে
  - 429 হার মনিটর করুন — নির্দিষ্ট ISP-তে হঠাৎ বাড়লে CGNAT সন্দেহ করুন
```

### ১০.৪ রেট লিমিট নিজেই একটা তথ্য ফাঁস (Oracle)

```
"এই ইমেইলে ৩টা OTP পাঠানো হয়ে গেছে" → নিশ্চিত হলো ইমেইলটা রেজিস্টার্ড ❌

সঠিক: রেজিস্টার্ড ও নন-রেজিস্টার্ড — দুই ক্ষেত্রেই একই আচরণ, একই সময়, একই মেসেজ
```

আপনার forgot-password ফ্লো-তে uniform 200 দেওয়া ঠিক এই কারণেই — কিন্তু খেয়াল রাখুন rate limit রেসপন্সও যেন uniform থাকে। "রেজিস্টার্ড হলে 429, নাহলে 200" — এটা একই ফাঁস, শুধু আলাদা পথে।

**টাইমিং:** নন-রেজিস্টার্ড ইমেইলে DB লুকআপ ৫ms, রেজিস্টার্ডে SMS পাঠাতে ৮০০ms — এই পার্থক্যও oracle। সমাধান: SMS পাঠানো async করুন, দুই পথেই একই সময়ে রেসপন্স দিন।

### ১০.৫ অন্যান্য বাইপাস

| বাইপাস | প্রতিকার |
|--------|----------|
| ইমেইল alias (`u+1@gmail.com`) | নরমালাইজ করুন |
| ফোন ফরম্যাট (`+880` / `880` / `0`) | E.164 canonical form |
| কেস (`Rakib@` vs `rakib@`) | lowercase |
| URL ভ্যারিয়েন্ট (`/api/v1/x` vs `/api/v1/x/`) | route নাম দিয়ে policy বাঁধুন, path দিয়ে নয় |
| HTTP মেথড (`POST` vs `PUT`) | মেথড-নিরপেক্ষ policy কী |
| নতুন অ্যাকাউন্ট খোলা | signup-এ device/IP লিমিট + বয়সভিত্তিক নিয়ম |
| ডিস্ট্রিবিউটেড botnet | global cap + anomaly detection + CAPTCHA |

### ১০.৬ Active Recall — পর্ব ১০

1. XFF চেইনের বাম দিক থেকে IP নিলে অ্যাটাকার ঠিক কী করবে?
2. IPv6-এ /64 ব্যবহার না করলে অ্যাটাকারের হাতে কতগুলো "নতুন ইউজার" থাকে?
3. rate limit রেসপন্স কীভাবে enumeration oracle হয়ে যায়?

---

## পর্ব ১১ — অ্যান্টি-প্যাটার্ন (যা করবেন না)

| ❌ ভুল | কেন খারাপ | ✅ সঠিক |
|-------|-----------|--------|
| শুধু in-memory limiter | pod সংখ্যা × limit | Redis + Lua |
| `INCR` তারপর আলাদা `EXPIRE` | অমর কী, মেমরি লিক | এক Lua স্ক্রিপ্ট |
| সবখানে fail-open | Redis ডাউনে অসীম abuse | সংবেদনশীলে fail-closed |
| সবখানে fail-closed | Redis hiccup = সাইট ডাউন | সাধারণ read-এ fail-open |
| 429-এ `Retry-After` না দেওয়া | ক্লায়েন্ট হাতুড়ি চালাবে | সবসময় দিন |
| jitter ছাড়া রিট্রাই | thundering herd | full jitter |
| রেট লিমিট = নিরাপত্তার একমাত্র স্তর | অ্যাটাকার লিমিটের ঠিক নিচে থাকবে | auth + anomaly detection সহ |
| ভুল রিকোয়েস্টও কোটায় গোনা | ৪০০ ভ্যালিডেশন এররে ইউজার ব্লক | ভ্যালিডেশন আগে, লিমিট পরে |
| ক্লায়েন্ট-সাইড লিমিটে ভরসা | বাইপাস করা তুচ্ছ | সার্ভারেই আসল প্রতিরক্ষা |
| ব্যর্থ ও সফল লগইন একসাথে গোনা | সাধারণ ইউজার ব্লক | শুধু ব্যর্থ গুনুন |
| রেট লিমিট মনিটর না করা | নীরবে ইউজার হারাবেন | মেট্রিক + অ্যালার্ট |
| একটাই global policy | সব endpoint সমান নয় | per-endpoint policy |
| policy কোডে হার্ডকোড | বদলাতে ডিপ্লয় লাগে | config/settings-এ |
| 429 আর 503 গুলিয়ে ফেলা | ক্লায়েন্ট ভুল আচরণ করবে | সেমান্টিক আলাদা রাখুন |

**সবচেয়ে সূক্ষ্ম অ্যান্টি-প্যাটার্ন:** রেট লিমিট বসিয়ে ভাবা কাজ শেষ। বাস্তবে সবচেয়ে বড় ঝুঁকি হলো **আপনার লিমিট আসলে কাজ করছে কি না তা কখনো যাচাই না করা।** পর্ব ১২ এজন্যই।

---

## পর্ব ১২ — টেস্টিং ও মনিটরিং

### ১২.১ যে মেট্রিকগুলো লাগবেই

```python
rate_limit_decisions_total{policy, scope, result="allow|deny"}   # counter
rate_limit_check_duration_seconds{policy}                        # histogram
rate_limit_backend_errors_total{backend="redis"}                 # counter
spend_budget_remaining{channel="sms|mail"}                       # gauge
spend_budget_exhausted_total{channel}                            # counter
```

**যে অনুপাতটা দেখবেন:**

```
deny_ratio = deny / (allow + deny)

< 0.1%   → ঠিক আছে
0.1 – 1% → স্বাভাবিক (কিছু abuse ধরছে)
> 5%     → হয় অ্যাটাক চলছে, নয় আপনার লিমিট খুব কড়া  ← তদন্ত করুন
```

**কে ব্লক হচ্ছে তা দেখুন:** deny-র বেশিরভাগ যদি একটা key থেকে আসে → অ্যাটাক। যদি হাজার key-তে ছড়ানো থাকে → **আপনার লিমিট ভুল**, ইউজার ভুল নয়।

### ১২.২ অ্যালার্ট

```yaml
- alert: RateLimitDenySpike
  expr: |
    sum(rate(rate_limit_decisions_total{result="deny"}[5m]))
    / sum(rate(rate_limit_decisions_total[5m])) > 0.05
  for: 5m

- alert: SmsBudgetLow
  expr: spend_budget_remaining{channel="sms"} < 500
  for: 1m

- alert: RateLimitBackendDown
  expr: rate(rate_limit_backend_errors_total[1m]) > 0
  for: 30s
```

শেষটা বিশেষ গুরুত্বপূর্ণ — fail-open থাকলে Redis ডাউন হলে সবকিছু "স্বাভাবিক" দেখাবে, অথচ আপনার সব প্রতিরক্ষা নিষ্ক্রিয়।

### ১২.৩ লোড টেস্ট (k6)

```javascript
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    burst: { executor: 'constant-arrival-rate',
             rate: 200, timeUnit: '1s', duration: '30s',
             preAllocatedVUs: 50 },
  },
};

export default function () {
  const res = http.get('https://api.example.com/api/search?q=test',
                       { headers: { 'Authorization': `Bearer ${__ENV.TOKEN}` }});
  check(res, {
    'allowed or limited': (r) => r.status === 200 || r.status === 429,
    '429 has Retry-After': (r) => r.status !== 429 || !!r.headers['Retry-After'],
    'never 5xx': (r) => r.status < 500,
  });
}
```

**প্রত্যাশিত ফল:** limit যদি 60/min হয়, 200 rps × 30s = 6000 রিকোয়েস্টে প্রায় ৩০টা 200 আর বাকি ৫৯৭০টা 429 পাওয়ার কথা। **যদি 5xx আসে — আপনার লিমিটার নিজেই বটলনেক।**

### ১২.৪ ইউনিট টেস্টে সময় নিয়ন্ত্রণ করুন

```python
def test_token_bucket_refill(fake_clock):
    limiter = TokenBucket(capacity=10, rate=5, clock=fake_clock)

    for _ in range(10):
        assert limiter.allow()          # ১০টা burst
    assert not limiter.allow()          # ১১তম DENY

    fake_clock.advance(1.0)             # ১ সেকেন্ড → +৫ টোকেন
    for _ in range(5):
        assert limiter.allow()
    assert not limiter.allow()
```

`time.sleep()` দিয়ে টেস্ট লিখবেন না — টেস্ট ধীর ও flaky হবে। ঘড়িটা সবসময় ইনজেক্ট করার মতো করে ডিজাইন করুন।

---

## পর্ব ১৩ — ডিজাইন ডিসিশন চিটশিট

```
┌─────────────────────────────────────────────────────────────┐
│ প্রশ্ন ১: কী রক্ষা করছি?                                      │
│   টাকা      → spend budget + fail-closed + sliding log      │
│   নিরাপত্তা  → কড়া, নিখুঁত, progressive backoff              │
│   ক্যাপাসিটি → token bucket + concurrency limit + shedding   │
│   ন্যায্যতা  → per-tenant + shuffle sharding                 │
│                                                             │
│ প্রশ্ন ২: কাকে চিনি?                                          │
│   authenticated → user/tenant key (নির্ভরযোগ্য)              │
│   anonymous     → ip + net + global (স্তরে স্তরে)             │
│                                                             │
│ প্রশ্ন ৩: burst দরকার?                                        │
│   হ্যাঁ → token bucket / GCRA                                │
│   না  → leaky bucket (queue) / sliding counter              │
│                                                             │
│ প্রশ্ন ৪: ভলিউম কত?                                           │
│   < 1000/দিন  → sliding log (নিখুঁত, সস্তা)                  │
│   > 1M/দিন    → sliding counter / token bucket + lease      │
│                                                             │
│ প্রশ্ন ৫: Redis মরলে?                                         │
│   টাকা/সিকিউরিটি → fail-closed                               │
│   সাধারণ read    → fail-open (+ local fallback)             │
└─────────────────────────────────────────────────────────────┘
```

**সংখ্যা বাছার ব্যবহারিক নিয়ম:**

```
১. আসল ট্রাফিক মাপুন — p50, p95, p99 per user
২. প্রাথমিক লিমিট = p99 × 3
   (উদাহরণ: p99 = 20 req/min → লিমিট 60/min)
৩. প্রথমে "shadow mode"-এ চালান — deny করবেন না, শুধু লগ করুন
৪. এক সপ্তাহ দেখুন কতজন বৈধ ইউজার ধরা পড়ত
৫. ০.১% এর কম হলে চালু করুন
৬. deny_ratio মনিটর করে টিউন করুন
```

**Shadow mode অপরিহার্য।** সরাসরি enforce করে বৈধ ইউজার ব্লক করে ফেলার চেয়ে এক সপ্তাহ অপেক্ষা করা অনেক সস্তা।

---

## পর্ব ১৪ — মাস্টারি রোডম্যাপ ও ইন্টারভিউ

### ১৪.১ চার ধাপের রোডম্যাপ

**Level 1 — Foundation (১–২ দিন)**
- [ ] rate limit vs throttle vs shed vs backpressure পার্থক্য বলতে পারা
- [ ] fixed window নিজে লিখে boundary burst ডেমো করা
- [ ] 429 + Retry-After সহ সঠিক রেসপন্স বানানো

**Level 2 — Core (৩–৫ দিন)**
- [ ] ৬টা অ্যালগরিদম কাগজে লিখতে পারা
- [ ] token bucket ইন-মেমরি ইমপ্লিমেন্ট + ইউনিট টেস্ট (fake clock)
- [ ] Redis + Lua দিয়ে ডিস্ট্রিবিউটেড ভার্সন
- [ ] exponential backoff + full jitter ক্লায়েন্ট

**Level 3 — Advanced (১ সপ্তাহ)**
- [ ] multi-scope policy (id + ip + net + global) সিস্টেম
- [ ] spend/budget reserve-release লেয়ার
- [ ] concurrency limiter + load shedding
- [ ] k6 দিয়ে লোড টেস্ট, Grafana ড্যাশবোর্ড

**Level 4 — Master (চলমান)**
- [ ] adaptive AIMD লিমিটার
- [ ] shuffle sharding দিয়ে tenant isolation
- [ ] local lease + global sync হাইব্রিড
- [ ] শূন্য ডাউনটাইমে policy migration
- [ ] shadow mode → gradual rollout প্রক্রিয়া

### ১৪.২ ইন্টারভিউ প্রশ্ন (উত্তরের সংকেতসহ)

1. **"একটা ডিস্ট্রিবিউটেড রেট লিমিটার ডিজাইন করুন, ১০ লক্ষ QPS."**
   → hierarchical: edge (মোটা, per-IP) + app (সূক্ষ্ম, per-user) + local lease। Redis Cluster, hot key এড়াতে key sharding, sliding counter (মেমরির জন্য)।

2. **"Token bucket আর leaky bucket কখন কোনটা?"**
   → burst চাইলে token; মসৃণ আউটপুট (partner TPS) চাইলে leaky। ইনবাউন্ড/আউটবাউন্ড ফ্রেমিং দিন।

3. **"Redis ডাউন হলে?"**
   → policy-ভিত্তিক fail mode + local fallback limiter; কোন endpoint কোনটা তা যুক্তি দিয়ে বলুন।

4. **"একজন ইউজার ঠিক লিমিটের নিচে থেকে abuse করছে।"**
   → rate limit যথেষ্ট নয়; behavioral anomaly detection, cost-based limit, concurrency limit, reputation score।

5. **"429 নাকি 503?"**
   → ক্লায়েন্টের আচরণ = 429; সার্ভারের অবস্থা = 503। এই পার্থক্য বলতে পারা সিনিয়রিটির সংকেত।

6. **"লিমিটের সংখ্যা কীভাবে ঠিক করবেন?"**
   → পরিমাপ → p99 × 3 → shadow mode → পর্যবেক্ষণ → enforce। "অনুমান করব" বলবেন না।

7. **"রেট লিমিটার নিজেই বটলনেক হলে?"**
   → প্রতি রিকোয়েস্টে Redis RTT, hot key; lease/batching, pipelining, local cache, async আপডেট।

---

## পর্ব ১৫ — কনসলিডেশন এক্সারসাইজ

খাতা-কলমে করুন, পরে কোডে।

### এক্সারসাইজ ১ — গণনা

```
(ক) limit=200/min, prev উইন্ডো=180, curr=50, বর্তমান উইন্ডোর ৪০% পার।
    Sliding window counter কী বলবে? ALLOW না DENY?

(খ) capacity=50, refill=10/s। t=0 তে ভর্তি। t=0 তে ৬০টা রিকোয়েস্ট এল,
    t=2 তে আরও ৩০টা। প্রতিটা ধাপে কয়টা পাস? t=2 এ DENY হলে Retry-After কত?

(গ) GCRA-তে limit=20/min, burst=4। T ও τ বের করুন। t=0 তে ৬টা রিকোয়েস্ট
    এলে কয়টা পাস করবে এবং ৬ষ্ঠটার Retry-After কত?

(ঘ) আপনার API-তে 800 rps, গড় লেটেন্সি 150ms। কত concurrent রিকোয়েস্ট?
    ডাউনস্ট্রিম ধীর হয়ে লেটেন্সি 1.2s হলে কত? DB pool 100 হলে কী ঘটবে?
```

### এক্সারসাইজ ২ — ডিজাইন

আপনার `aggame` প্রজেক্টের follow-up তালিকা থেকে **login/registration** এর জন্য একটা সম্পূর্ণ policy লিখুন:

```
- কয়টা scope? কোন কোনটা?
- প্রতিটার অ্যালগরিদম ও কেন
- fail-open না fail-closed?
- ব্যর্থ বনাম সফল — কীভাবে গুনবেন?
- CGNAT-এর ইউজাররা যেন ভুক্তভোগী না হয়, তার ব্যবস্থা
- সংখ্যাগুলো কীভাবে ঠিক করবেন (কোন ডেটা দেখে)?
```

### এক্সারসাইজ ৩ — ভাঙা সিস্টেম মেরামত

নিচের কোডে **৬টা** বাগ আছে। খুঁজে বের করুন:

```python
def check_rate_limit(request, limit=100, window=60):
    ip = request.headers.get("X-Forwarded-For", "").split(",")[0]
    key = f"rl:{ip}"
    count = redis.get(key)
    if count and int(count) >= limit:
        return JsonResponse({"error": "too many"}, status=503)
    redis.incr(key)
    redis.expire(key, window)
    return None
```

<details>
<summary>উত্তর দেখতে খুলুন</summary>

1. **XFF-এর বাম দিক** — অ্যাটাকার স্পুফ করতে পারে (১০.১)
2. **check-then-act রেস** — `get` ও `incr` আলাদা, দুই প্রসেস একসাথে পাস করবে (৪.২)
3. **প্রতিবার `expire`** — উইন্ডো কখনো শেষ হয় না, হাতুড়ি চালালে চিরস্থায়ী ব্লক
4. **স্ট্যাটাস 503, হওয়া উচিত 429** (১.৪)
5. **`Retry-After` হেডার নেই** (৬.১)
6. **Redis এরর হ্যান্ডলিং নেই** — Redis ডাউনে exception, fail mode অনির্ধারিত (২.৪)

বোনাস: IPv6 /64 হ্যান্ডলিং নেই, endpoint-ভিত্তিক scope নেই, মেট্রিক নেই।

</details>

### এক্সারসাইজ ৪ — বাস্তবায়ন

আপনার সিস্টেমে যোগ করুন:

1. `rate_limit_decisions_total` মেট্রিক (policy, scope, result লেবেলসহ)
2. Grafana প্যানেল: policy-প্রতি deny_ratio
3. একটা নতুন endpoint shadow mode-এ চালু করে ৭ দিন পর্যবেক্ষণ
4. k6 স্ক্রিপ্ট যা প্রমাণ করে `otp.send` লিমিট আসলেই কাজ করছে

---

## দ্রুত রেফারেন্স কার্ড

```
╔══════════════════════════════════════════════════════════════╗
║  অ্যালগরিদম বাছাই                                              ║
║    ডিফল্ট HTTP API      → Sliding Window Counter              ║
║    burst দরকার          → Token Bucket                       ║
║    টাকা/নিরাপত্তা        → Sliding Window Log                  ║
║    আউটবাউন্ড/partner    → Leaky Bucket (queue)                ║
║    বিশাল স্কেল           → GCRA                               ║
║                                                              ║
║  স্ট্যাটাস কোড                                                 ║
║    429 → ক্লায়েন্ট বেশি চাচ্ছে (Retry-After দিন)               ║
║    503 → সার্ভার পারছে না                                     ║
║    402/403 → quota শেষ (আপগ্রেড লাগবে)                        ║
║                                                              ║
║  সবসময় করবেন                                                  ║
║    ✓ Lua/atomic অপারেশন     ✓ Retry-After হেডার               ║
║    ✓ multi-scope স্তর        ✓ key নরমালাইজেশন                ║
║    ✓ মেট্রিক + অ্যালার্ট       ✓ shadow mode আগে                ║
║    ✓ full jitter ব্যাকঅফ     ✓ TTL সব কী-তে                   ║
║                                                              ║
║  কখনো করবেন না                                                ║
║    ✗ XFF-এর বাম দিক          ✗ INCR + আলাদা EXPIRE            ║
║    ✗ শুধু in-memory          ✗ ক্লায়েন্ট-সাইডে ভরসা             ║
║    ✗ reject-কেও ZADD করা     ✗ মনিটরিং ছাড়া চালু করা           ║
╚══════════════════════════════════════════════════════════════╝
```

---

## পরবর্তী ধাপ

এই ডকুমেন্টের সবচেয়ে বেশি রিটার্ন যেখানে:

1. **পর্ব ৩ (অ্যালগরিদম)** — কাগজে হাতে হিসাব করুন, শুধু পড়বেন না
2. **পর্ব ৪.২ (atomicity)** — আপনার বিদ্যমান কোডে এই বাগ আছে কি না চেক করুন
3. **পর্ব ১০.১ (XFF)** — আজই `curl -H "X-Forwarded-For: 1.2.3.4"` দিয়ে টেস্ট করুন
4. **পর্ব ৯-এর ইউজকেস ১** — আপনার login/registration follow-up-এর ব্লুপ্রিন্ট

শুভকামনা। 🚀
