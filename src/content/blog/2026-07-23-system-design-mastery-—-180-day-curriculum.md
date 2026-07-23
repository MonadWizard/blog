---
title: System Design Mastery — 180-Day Curriculum
description: "Target: Senior backend / FAANG-level system design interview
  readiness Duration: 180 days · 3 hours/day · ~540 hours Mocks: 20 scored mock
  interviews."
pubDate: 2026-07-24
draft: false
---
## Honest Framing

No curriculum guarantees an offer. Hiring outcomes depend on headcount, interviewer variance, coding rounds, behavioral loops, and referral strength. What this curriculum does is make you **consistently strong enough to convert the interviews you get**.

System design is roughly **one third** of a FAANG loop. See [Appendix C](#appendix-c--what-this-plan-does-not-cover) for the other two thirds.

---

## Table of Contents

- [How to Use This Document](#how-to-use-this-document)
- [Phase 1 — Foundations (Days 1–25)](#phase-1--foundations-days-125)
- [Phase 2 — Data Layer Mastery (Days 26–50)](#phase-2--data-layer-mastery-days-2650)
- [Phase 3 — Distributed Systems Theory (Days 51–75)](#phase-3--distributed-systems-theory-days-5175)
- [Phase 4 — Streaming & Event-Driven (Days 76–95)](#phase-4--streaming--event-driven-days-7695)
- [Phase 5 — Product Systems I (Days 96–120)](#phase-5--product-systems-i-days-96120)
- [Phase 6 — Product Systems II (Days 121–145)](#phase-6--product-systems-ii-days-121145)
- [Phase 7 — ML & Modern Infrastructure (Days 146–160)](#phase-7--ml--modern-infrastructure-days-146160)
- [Phase 8 — Reliability & Operations (Days 161–175)](#phase-8--reliability--operations-days-161175)
- [Phase 9 — Interview Craft & Loop Simulation (Days 176–180)](#phase-9--interview-craft--loop-simulation-days-176180)
- [Mock Interview Specification](#mock-interview-specification)
- [Appendix A — Scoring Rubric](#appendix-a--scoring-rubric)
- [Appendix B — Resource List](#appendix-b--resource-list)
- [Appendix C — What This Plan Does Not Cover](#appendix-c--what-this-plan-does-not-cover)
- [Appendix D — Progress Tracker](#appendix-d--progress-tracker)

---

## How to Use This Document

**Daily structure (3 hours):**

| Block | Time | Activity |
|---|---|---|
| Study | 90 min | Read/watch the day's topic material |
| Active recall | 30 min | Close notes. Explain the topic aloud as if teaching. Record yourself. |
| Application | 45 min | Sketch a design, work a numeric problem, or trace a real system |
| Notes | 15 min | Write 5–10 lines in your own words. Never copy-paste. |

**Rules that make the difference:**

1. **Explain aloud every day.** Interview failure is usually articulation failure, not knowledge failure.
2. **Draw by hand or on a whiteboard tool.** Typing hides the diagramming weakness that shows up live.
3. **Do the math.** Every estimation drill gets computed, not skimmed.
4. **Days marked ⭐ are your existing strengths** — treat those as *articulation rehearsal*, not learning.
5. **Never skip a mock.** The mocks are the measurement; without them this is just reading.
6. **Keep DSA running in parallel** at ~5 hrs/week. Do not let this crowd out coding prep.

---

## Phase 1 — Foundations (Days 1–25)

**Goal:** Fluency in estimation, networking, caching, and relational internals. These are the primitives every design answer rests on.

| Day | Topic | Focus / Deliverable |
|---|---|---|
| 1 | Latency numbers, orders of magnitude | Memorize the table cold; recite from blank page |
| 2 | Back-of-envelope: QPS, storage, bandwidth | 10 estimation drills, computed by hand |
| 3 | Estimation II: peak vs average, growth modeling | Photo service + chat service sizing |
| 4 | TCP internals: handshake, congestion control, Nagle | Explain why connection reuse matters |
| 5 | UDP, QUIC, when to abandon TCP | Gaming, video, DNS cases |
| 6 | TLS: handshake, session resumption, mTLS, cert chains | Where to terminate TLS and why |
| 7 | HTTP/1.1 → HTTP/2 → HTTP/3 | Multiplexing, head-of-line blocking |
| 8 | DNS deep dive: resolution, TTL, anycast, GeoDNS | Failover via DNS and its limits |
| 9 | CDN architecture: PoPs, origin shield, cache keys | Invalidation strategies |
| 10 | Load balancing L4 vs L7, algorithms, health checks | Consistent-hashing load balancer |
| 11 | Reverse proxies, API gateways, service mesh basics | Envoy and the sidecar model |
| 12 | REST design: resources, idempotency, status codes | Pagination patterns (offset vs cursor) |
| 13 | gRPC, protobuf, streaming RPC, schema evolution | When gRPC beats REST |
| 14 | GraphQL: resolvers, N+1, persisted queries, federation | Tradeoffs vs REST |
| 15 | API versioning, deprecation, backward compatibility | Contract testing |
| 16 | Caching strategies: aside, through, behind, refresh-ahead | Where each fits |
| 17 | Eviction: LRU, LFU, ARC, W-TinyLFU; TTL design | Hit-rate math |
| 18 | Cache failure modes: stampede, hot key, penetration | Mitigation for each |
| 19 | ⭐ Redis internals: data structures, memory model, persistence | RDB vs AOF tradeoffs |
| 20 | ⭐ Redis Cluster, Sentinel, Streams, Lua scripting | Articulate your production experience |
| 21 | Multi-tier caching: browser → CDN → app → DB | Coherence problems |
| 22 | ⭐ Relational internals: storage layout, MVCC, vacuum | Postgres specifics |
| 23 | Isolation levels, phantom reads, SSI, lock escalation | Build an anomaly catalog |
| 24 | ⭐ Indexing: B-tree, GIN, GiST, BRIN, partial, covering | Read query plans fluently |
| 25 | **🎯 MOCK #1 — URL Shortener** | [Mock spec](#mock-interview-specification) |

**Phase 1 exit criteria:** You can size any system to within an order of magnitude in under 5 minutes, and explain the full path of an HTTP request from browser to database and back without notes.

---

## Phase 2 — Data Layer Mastery (Days 26–50)

**Goal:** Choose the right storage engine for any access pattern and defend the choice under pressure.

| Day | Topic | Focus / Deliverable |
|---|---|---|
| 26 | ⭐ Connection pooling, PgBouncer modes, pool sizing math | Model pool saturation failure |
| 27 | Read replicas, replication lag, read-your-writes | Routing strategies |
| 28 | Postgres HA: streaming replication, Patroni, failover | Split-brain risks |
| 29 | ⭐ Query optimization: EXPLAIN ANALYZE, join strategies | Fix three slow queries live |
| 30 | Schema design: normalization vs denormalization | When duplication is correct |
| 31 | LSM trees: memtable, SSTable, compaction strategies | RocksDB, LevelDB |
| 32 | B-tree vs LSM: write/read/space amplification | Choose per workload |
| 33 | Cassandra: ring, tunable consistency, hinted handoff | Model data by query |
| 34 | DynamoDB: partition keys, GSI/LSI, adaptive capacity | Single-table design |
| 35 | Hot partition problems and mitigation | Write sharding techniques |
| 36 | Document stores: MongoDB, embedded vs referenced | Aggregation pipelines |
| 37 | Object storage: S3 internals, consistency, multipart | Lifecycle policies |
| 38 | Content-addressed storage, chunking, dedup | Rabin fingerprinting |
| 39 | Distributed file systems: GFS, HDFS, Colossus | Master/chunkserver split |
| 40 | Distributed SQL: Spanner, CockroachDB, TiDB, Vitess | Tradeoffs vs sharded Postgres |
| 41 | Inverted indexes: construction, postings, compression | Skip lists |
| 42 | Tokenization, analyzers, stemming, n-grams | Multilingual concerns (incl. Bangla) |
| 43 | Scoring: TF-IDF, BM25, relevance tuning | Precision vs recall |
| 44 | ⭐ Elasticsearch architecture: shards, replicas, coordination | Shard sizing math |
| 45 | ⭐ ES at scale: refresh interval, bulk indexing, hot-warm-cold | Your CDC pipeline as case study |
| 46 | Vector search: embeddings, HNSW, IVF, hybrid retrieval | Modern must-know |
| 47 | Probabilistic structures: Bloom, Cuckoo, quotient filters | False-positive math |
| 48 | Cardinality & frequency: HyperLogLog, Count-Min Sketch | Streaming estimation |
| 49 | Consistent hashing, jump hash, rendezvous hashing | Rebalancing cost analysis |
| 50 | **🎯 MOCK #2 — Distributed Key-Value Store** | [Mock spec](#mock-interview-specification) |

**Phase 2 exit criteria:** Given any access pattern, you name a storage engine, justify it against two alternatives, and state the specific cost of your choice.

---

## Phase 3 — Distributed Systems Theory (Days 51–75)

**Goal:** Reason correctly about consistency, consensus, and partial failure. This is what separates senior from mid-level answers.

| Day | Topic | Focus / Deliverable |
|---|---|---|
| 51 | CAP theorem — what it actually says and doesn't | Catalog common misuses |
| 52 | PACELC, latency/consistency tradeoff in practice | Classify five real systems |
| 53 | Consistency models: linearizable → eventual | Session guarantees |
| 54 | Single-leader replication mechanics, failover pitfalls | Lost update scenarios |
| 55 | Multi-leader replication, conflict detection | Geo-distributed writes |
| 56 | Leaderless: Dynamo-style, quorums, read repair | W+R>N math |
| 57 | Anti-entropy, Merkle trees, gossip protocols | Membership management |
| 58 | Partitioning + secondary indexes in partitioned data | Local vs global index |
| 59 | Rebalancing, request routing, service discovery | ZooKeeper/etcd role |
| 60 | Consensus: Paxos conceptually, why it's hard | Safety vs liveness |
| 61 | Raft: leader election, log replication, membership change | Walk the full protocol |
| 62 | Split brain, fencing tokens, STONITH | Study real outage postmortems |
| 63 | Distributed locks: correctness, lease expiry, Redlock debate | When not to use them |
| 64 | Time: NTP drift, monotonic vs wall clock | Clock skew bug catalog |
| 65 | Logical clocks: Lamport, vector clocks, version vectors | Causality tracking |
| 66 | Hybrid logical clocks, TrueTime, Spanner's approach | Bounded uncertainty |
| 67 | 2PC: protocol, blocking problem, coordinator failure | Why it's usually avoided |
| 68 | Sagas: choreography vs orchestration, compensation | Failure semantics |
| 69 | ⭐ Outbox pattern, transactional messaging, CDC correctness | Your Debezium work |
| 70 | Idempotency: keys, dedup windows, exactly-once illusion | "Effectively-once" framing |
| 71 | Failure detection, phi-accrual, timeouts vs correctness | Partial failure reasoning |
| 72 | Byzantine faults conceptually; when they matter | Usually they don't — know why |
| 73 | Invariants, safety and liveness properties | Design review skill |
| 74 | Consolidation & self-testing on Phase 3 | Explain all of it aloud, no notes |
| 75 | **🎯 MOCK #3 — Distributed Transaction / Booking System** | [Mock spec](#mock-interview-specification) |

**Phase 3 exit criteria:** You can state precisely what consistency guarantee any design provides, and what breaks under a network partition.

---

## Phase 4 — Streaming & Event-Driven (Days 76–95)

**Goal:** Design event-driven architectures with correct delivery semantics — a strength area worth making dominant.

| Day | Topic | Focus / Deliverable |
|---|---|---|
| 76 | Messaging patterns: queue vs pub-sub vs log | Semantics differ fundamentally |
| 77 | Delivery guarantees, ordering, backpressure | At-least / at-most / exactly |
| 78 | ⭐ Kafka architecture: partitions, segments, ISR, controller | Replication protocol |
| 79 | Kafka producers: batching, acks, idempotent producer | Throughput tuning |
| 80 | Consumer groups, rebalancing, offset management | Sticky assignment |
| 81 | Log compaction, retention, tiered storage | Compacted topics as state |
| 82 | Kafka Streams / Flink: stateful stream processing | Local state stores |
| 83 | Windowing: tumbling, sliding, session; watermarks | Late data handling |
| 84 | Event sourcing: append-only state, replay, snapshots | Tradeoffs |
| 85 | CQRS: read/write model separation, projection lag | When it pays off |
| 86 | Exactly-once in streams: transactions, 2PC sinks | Flink checkpointing |
| 87 | Schema registry, Avro/Protobuf evolution, compatibility | Breaking-change policy |
| 88 | Dead letter queues, poison pills, retry topics | Operational design |
| 89 | Alternatives: Pulsar, NATS, SQS/SNS, Kinesis | Selection criteria |
| 90 | Batch vs stream: Lambda, Kappa, unified architectures | Reprocessing strategy |
| 91 | Data lakes, lakehouse, Iceberg/Delta table formats | Modern analytics stack |
| 92 | Columnar formats: Parquet, ORC, predicate pushdown | Why analytics is fast |
| 93 | OLAP engines: ClickHouse, Druid, Pinot | Real-time analytics |
| 94 | Time-series: downsampling, cardinality, retention | Prometheus/M3 model |
| 95 | **🎯 MOCK #4 — Real-Time Analytics Pipeline** | [Mock spec](#mock-interview-specification) |

**Phase 4 exit criteria:** You can design an end-to-end event pipeline and state exactly where duplicates, reordering, and data loss can occur.

---

## Phase 5 — Product Systems I (Days 96–120)

**Goal:** The canonical interview questions. Pattern fluency, not memorization.

| Day | Topic | Focus / Deliverable |
|---|---|---|
| 96 | Feed systems: fanout-on-write vs read, hybrid | Celebrity problem |
| 97 | Feed ranking: freshness decay, engagement signals | Lightweight ranking |
| 98 | Social graph storage, adjacency, friend-of-friend | TAO-style design |
| 99 | Graph databases, traversal cost, denormalized edges | When a graph DB is right |
| 100 | **🎯 MOCK #5 — News Feed (Twitter/Instagram)** | [Mock spec](#mock-interview-specification) |
| 101 | Realtime transport: WebSocket, SSE, long-poll | Connection scaling |
| 102 | Connection gateways: sticky routing, 10M+ connections | The C10M problem |
| 103 | Chat: message IDs, ordering, gap detection | Sequence number design |
| 104 | Delivery receipts, read state sync, multi-device | Fanout to devices |
| 105 | Offline queues, message sync protocol, pull vs push | Cold start handling |
| 106 | Group messaging fanout, large groups, broadcast | Fanout amplification |
| 107 | Presence & typing indicators at scale | Cheap approximations |
| 108 | E2E encryption: Signal protocol, key exchange | Design implications |
| 109 | ⭐ Push infrastructure: APNs/FCM, tokens, retries, priorities | Your notification system |
| 110 | ⭐ Notification dedup, batching, digest, quiet hours | 100M+/day architecture |
| 111 | **🎯 MOCK #6 — WhatsApp / Messenger** | [Mock spec](#mock-interview-specification) |
| 112 | Search autocomplete: tries, top-k, prefix sharding | Personalization |
| 113 | Search ranking pipeline: retrieval → ranking → blending | Two-stage architecture |
| 114 | Web crawler: frontier, politeness, dedup, freshness | Distributed crawl |
| 115 | Near-duplicate detection: SimHash, MinHash, shingling | Dedup at scale |
| 116 | Rate limiting: token/leaky bucket, sliding window | Algorithm comparison |
| 117 | Distributed rate limiting: Redis-based, local+global hybrid | Accuracy vs latency |
| 118 | API abuse: bot detection, fingerprinting, CAPTCHA | Adversarial thinking |
| 119 | DDoS mitigation layers, scrubbing, edge rules | Defense in depth |
| 120 | **🎯 MOCK #7 — Distributed Rate Limiter + Abuse Defense** | [Mock spec](#mock-interview-specification) |

**Phase 5 exit criteria:** You can design a feed, a chat system, and a rate limiter from cold start in 45 minutes each.

---

## Phase 6 — Product Systems II (Days 121–145)

**Goal:** The harder, less-rehearsed problems where most candidates thin out.

| Day | Topic | Focus / Deliverable |
|---|---|---|
| 121 | Video upload, chunked resumable upload, validation | Ingest pipeline |
| 122 | Transcoding: ladders, codecs, GPU farms, orchestration | Cost optimization |
| 123 | Packaging: HLS, DASH, CMAF, DRM basics | Segment design |
| 124 | Adaptive bitrate: player heuristics, buffer models | QoE metrics |
| 125 | CDN at Netflix scale: Open Connect, ISP embedding | Why they built it |
| 126 | Live streaming: ingest, LL-HLS, WebRTC, fanout tree | Latency budget |
| 127 | **🎯 MOCK #8 — YouTube / Netflix** | [Mock spec](#mock-interview-specification) |
| 128 | Geospatial indexing: geohash, quadtree, S2, H3 | Query patterns |
| 129 | Proximity search, k-nearest, dynamic objects | Index update cost |
| 130 | Ride matching: supply/demand, dispatch, surge | Optimization loop |
| 131 | ETA prediction, routing, map-matching | Data dependencies |
| 132 | **🎯 MOCK #9 — Uber / Lyft Dispatch** | [Mock spec](#mock-interview-specification) |
| 133 | Inventory & booking: holds, TTL reservations, oversell | Consistency choices |
| 134 | Payments: double-entry ledger, immutability, reconciliation | Correctness first |
| 135 | Payment flows: authorization, capture, refund, chargeback | Idempotency keys |
| 136 | Fraud detection: rules + ML, velocity checks, graph signals | Realtime scoring |
| 137 | **🎯 MOCK #10 — Payment / Ledger System** | [Mock spec](#mock-interview-specification) |
| 138 | Collaborative editing: operational transform mechanics | Google Docs lineage |
| 139 | CRDTs: state-based vs op-based, common types | Convergence properties |
| 140 | Cursor/presence sync, undo in collaborative context | Hard edge cases |
| 141 | File sync: delta sync, conflict resolution, versioning | Dropbox model |
| 142 | Distributed cron & job scheduling, DAG engines, backfills | Airflow-class systems |
| 143 | Workflow engines: Temporal/Cadence, durable execution | Modern pattern |
| 144 | Multi-tenancy: isolation models, noisy neighbor, quotas | SaaS architecture |
| 145 | **🎯 MOCK #11 — Google Drive / Collaborative Docs** | [Mock spec](#mock-interview-specification) |

**Phase 6 exit criteria:** No common FAANG design question is unfamiliar territory.

---

## Phase 7 — ML & Modern Infrastructure (Days 146–160)

**Goal:** Cover the topics that increasingly appear in 2026-era loops and that most candidates cannot handle.

| Day | Topic | Focus / Deliverable |
|---|---|---|
| 146 | Recommendation architecture: candidate gen → ranking → policy | Multi-stage design |
| 147 | Feature stores: online/offline parity, point-in-time correctness | Training-serving skew |
| 148 | Embedding retrieval at scale, ANN serving | Vector DB in production |
| 149 | Model serving: batching, GPU utilization, latency budgets | Inference infrastructure |
| 150 | A/B testing infra: assignment, metrics, guardrails, interference | Experimentation platform |
| 151 | **🎯 MOCK #12 — Recommendation System** | [Mock spec](#mock-interview-specification) |
| 152 | LLM serving: KV cache, continuous batching, speculative decoding | Increasingly asked |
| 153 | RAG architecture: chunking, retrieval, reranking, evaluation | Modern design question |
| 154 | Vector DB internals: HNSW tuning, filtering, freshness | Tradeoffs |
| 155 | Prompt/context pipelines, caching, cost control | Practical concerns |
| 156 | **🎯 MOCK #13 — LLM-Powered Product (RAG at scale)** | [Mock spec](#mock-interview-specification) |
| 157 | Kubernetes for design interviews: scheduling, HPA, operators | Infra literacy |
| 158 | Service mesh, sidecars, mTLS, traffic shaping | When it's overkill |
| 159 | Serverless architecture, cold starts, edge compute | Fit and misfit |
| 160 | Cost engineering: unit economics, egress, tiering, spot | Senior-level signal |

**Phase 7 exit criteria:** You can design an ML-serving or RAG system without hedging, and you discuss cost unprompted.

---

## Phase 8 — Reliability & Operations (Days 161–175)

**Goal:** Demonstrate the operational maturity that distinguishes senior candidates. Strong area for you — make it dominant.

| Day | Topic | Focus / Deliverable |
|---|---|---|
| 161 | SLI/SLO/SLA, error budgets, nines math | Availability arithmetic |
| 162 | Observability: metrics vs logs vs traces, cardinality traps | Cost of telemetry |
| 163 | Distributed tracing, sampling, context propagation | OpenTelemetry |
| 164 | Alerting design, symptom vs cause, on-call, runbooks | Incident command |
| 165 | Cascading failures, retry storms, thundering herd | Jitter, retry budgets |
| 166 | Load shedding, admission control, priority queues, brownout | Graceful degradation |
| 167 | Circuit breakers, bulkheads, timeout hierarchies | Latency budgets |
| 168 | Chaos engineering, fault injection, game days | Netflix lineage |
| 169 | Capacity planning, autoscaling, headroom, load testing | Forecasting |
| 170 | Zero-downtime deploys: blue-green, canary, progressive rollout | Automated rollback |
| 171 | ⭐ Online schema migration, expand-contract, dual-write, backfill | Your Postgres depth |
| 172 | DR: RPO/RTO, backup strategy, region evacuation, drills | Testing recovery |
| 173 | Security: OAuth2/OIDC, JWT pitfalls, session design, zero trust | AuthN/AuthZ design |
| 174 | Encryption at rest/transit, KMS, key rotation, PII handling | Compliance-aware design |
| 175 | **🎯 MOCK #14 — Monitoring / Observability Platform** | [Mock spec](#mock-interview-specification) |

**Phase 8 exit criteria:** Every design you produce handles partial failure by default, without being asked.

---

## Phase 9 — Interview Craft & Loop Simulation (Days 176–180)

**Goal:** Convert knowledge into performance under time pressure.

| Day | Topic | Focus / Deliverable |
|---|---|---|
| 176 | 45-min framework, timeboxing, diagram discipline, pushback handling | Drill to reflex |
| 177 | Your systems as stories: notification platform, CDC/ES pipeline | 5-min narratives with real numbers |
| 178 | **🎯 MOCK #15 — Google-style** + **🎯 MOCK #16 — Amazon-style (LP-integrated)** | Back-to-back |
| 179 | **🎯 MOCK #17 — Meta-style** + **🎯 MOCK #18 — Netflix-style (resilience)** | Back-to-back |
| 180 | **🎯 MOCK #19 + #20 — Full onsite loop, unseen problems, scored** | Final calibration |

### Company-Specific Emphasis

| Company | What they weight | How to adapt |
|---|---|---|
| **Google** | Scale, algorithmic depth, precision | Show data structure reasoning; be exact with numbers |
| **Amazon** | Operational excellence, ownership, Leadership Principles | Weave LPs into design narrative; discuss on-call and cost |
| **Meta** | Product sense, speed, pragmatism | Move fast, prioritize ruthlessly, justify scope cuts |
| **Netflix** | Resilience, autonomy, microservices | Lead with failure modes and degradation |

---

## Mock Interview Specification

Every mock runs the same 60-minute protocol so your performance becomes measurable across the 180 days.

### Structure

| Segment | Time | What happens |
|---|---|---|
| Problem statement | 2 min | A deliberately vague one-liner, as a real interviewer gives |
| Requirements gathering | 5–8 min | You ask clarifying questions. Only what you ask gets answered. Silence costs you. |
| Estimation | 5 min | You compute scale aloud. Arithmetic and assumptions are checked. |
| High-level design | 10–12 min | Box diagram, named components, justification for each |
| Deep dive | 15–20 min | 2–3 components chosen — often the ones you seem least comfortable with |
| Curveball | 5 min | A constraint changes mid-interview (10× traffic, new region, component failure) |
| Bottlenecks & wrap | 5 min | You self-identify weaknesses before they're pointed out |
| Scoring & feedback | 10 min | Full rubric, specific fixes, next assignment |

### Interviewer Behavior Simulated

- Mostly silent — **you drive the interview**
- Interrupts with "why not X instead?" and pushes until you defend or correctly concede
- Lets you go down a wrong path for a while before questioning it (real interviewers do this)
- Asks "what breaks first at 100×?" on nearly every design
- At least one question per mock lands outside your comfort zone
- Occasionally proposes a *worse* alternative to test whether you cave under confident pushback

### Complete Mock Schedule

| # | Day | Problem | Primary skills tested |
|---|---|---|---|
| 1 | 25 | URL Shortener | Estimation, hashing, cache design, read-heavy scaling |
| 2 | 50 | Distributed Key-Value Store | Partitioning, replication, consistency, storage engine choice |
| 3 | 75 | Distributed Transaction / Booking System | Sagas, isolation, inventory consistency, failure handling |
| 4 | 95 | Real-Time Analytics Pipeline | Streaming, windowing, OLAP storage, late data |
| 5 | 100 | News Feed (Twitter/Instagram) | Fanout strategy, ranking, celebrity problem, cache layers |
| 6 | 111 | WhatsApp / Messenger | Connection scaling, ordering, multi-device sync, offline |
| 7 | 120 | Distributed Rate Limiter + Abuse Defense | Consistency vs latency, adversarial design |
| 8 | 127 | YouTube / Netflix | Transcoding pipeline, CDN strategy, ABR, storage economics |
| 9 | 132 | Uber / Lyft Dispatch | Geospatial indexing, matching, realtime updates |
| 10 | 137 | Payment / Ledger System | Correctness, idempotency, double-entry, reconciliation |
| 11 | 145 | Google Drive / Collaborative Docs | Sync protocol, conflict resolution, CRDT/OT, versioning |
| 12 | 151 | Recommendation System | Multi-stage retrieval, feature stores, serving latency |
| 13 | 156 | LLM-Powered Product (RAG at scale) | Retrieval, cost, latency, evaluation |
| 14 | 175 | Monitoring / Observability Platform | Write volume, cardinality, time-series storage, query |
| 15 | 178 | Google-style (unseen) | Scale + algorithmic depth |
| 16 | 178 | Amazon-style (unseen) | Ops excellence + Leadership Principles woven in |
| 17 | 179 | Meta-style (unseen) | Product sense + speed |
| 18 | 179 | Netflix-style (unseen) | Resilience + degradation |
| 19 | 180 | Full loop — design 1 (unseen) | Everything |
| 20 | 180 | Full loop — design 2 (unseen) | Everything, under fatigue |

### Progression Targets

| Mock range | Target average | Meaning |
|---|---|---|
| 1–5 | ≥ 3.0 | Competent, gaps expected |
| 6–11 | ≥ 3.7 | Approaching hire signal |
| 12–18 | ≥ 4.2 | Solid hire signal |
| 19–20 | No dimension below 4 | Ready |

---

## Appendix A — Scoring Rubric

Each dimension scored 1–5. **4+ = hire signal.**

| Dimension | 1–2 (No hire) | 3 (Borderline) | 4–5 (Hire) |
|---|---|---|---|
| **Requirements & scoping** | Starts designing immediately | Asks basic questions | Surfaces hidden constraints, sets explicit non-goals, confirms scale |
| **Estimation** | Avoids numbers or errs wildly | Rough numbers, some errors | Fast, correct, states assumptions, sanity-checks results |
| **High-level design** | Missing components, confused flow | Workable but generic | Clean, complete, appropriately simple for stated requirements |
| **Data modeling** | Schema by habit | Reasonable schema | Access patterns drive schema; storage choice explicitly justified |
| **Deep dive depth** | Stays at surface | One layer down when prompted | Three layers down unprompted; knows real failure modes |
| **Tradeoff articulation** | States one option as fact | Mentions alternatives | Names both sides, picks one, states the cost of the choice |
| **Scalability & bottlenecks** | Misses the bottleneck | Finds obvious bottleneck | Identifies the *true* bottleneck, not the obvious one |
| **Reliability & failure** | Ignores failure | Adds redundancy when asked | Designs for partial failure by default |
| **Adaptability** | Design collapses under curveball | Patches awkwardly | Absorbs the change cleanly, revisits earlier decisions |
| **Communication** | Rambles, jumps around | Understandable | Structured, well-paced, effective diagramming |

**Feedback after each mock includes:**
1. Score per dimension with justification
2. The three specific things that cost you the most
3. Exact replacement phrasing for weak statements you made
4. A targeted assignment to complete before the next mock

---

## Appendix B — Resource List

### Core Books

| Book | Use it for | When |
|---|---|---|
| *Designing Data-Intensive Applications* — Kleppmann | The single most important book here | Phases 2–4, read throughout |
| *Database Internals* — Petrov | Storage engines, distributed algorithms | Phase 2–3 |
| *Site Reliability Engineering* — Google | Operations, SLOs, incident response | Phase 8 |
| *System Design Interview* Vol 1 & 2 — Alex Xu | Interview-shaped practice | Phases 5–6 |
| *Understanding Distributed Systems* — Vitillo | Accessible theory reinforcement | Phase 3 |

### Engineering Blogs (read weekly)

- Netflix Tech Blog — resilience, streaming, CDN
- Uber Engineering — geospatial, realtime, data platform
- Meta Engineering — social graph, scale
- Discord Engineering — realtime messaging at scale
- Cloudflare Blog — networking, edge, DDoS
- AWS Architecture Blog + re:Invent deep-dive talks
- Stripe Engineering — payments, idempotency, correctness

### Papers Worth Reading

| Paper | Phase |
|---|---|
| Dynamo (Amazon, 2007) | 3 |
| Bigtable (Google, 2006) | 2 |
| Spanner (Google, 2012) | 3 |
| Kafka: a Distributed Messaging System | 4 |
| In Search of an Understandable Consensus Algorithm (Raft) | 3 |
| The Google File System | 2 |
| TAO: Facebook's Distributed Data Store for the Social Graph | 5 |
| MapReduce | 4 |

### Tools

- **Diagramming:** Excalidraw (closest to whiteboard feel) or draw.io
- **Notes:** Obsidian or plain markdown in git
- **Recording:** Record yourself explaining. Watching it back is uncomfortable and extremely effective.

---

## Appendix C — What This Plan Does Not Cover

System design is one loop of three. Budget for the others.

### 1. DSA / Coding (~40% of loop weight)

Run in parallel, **~5 hours/week minimum** throughout all 180 days. You already have The Grand Algorithm project as a vehicle. Target: NeetCode 150 solved twice, second pass under time pressure. Do not let system design crowd this out — it's the most common rejection reason.

### 2. Behavioral / Leadership Principles (~25% of loop weight)

- Amazon requires **15–20 rehearsed STAR stories** mapped to Leadership Principles
- Google, Meta, Netflix use lighter but real behavioral rounds
- Days 177–178 touch this, but it needs its own dedicated ~30 hours
- Source stories from real work: the notification platform, the CDC pipeline, production incidents you've handled

### 3. Getting the Interview

The best preparation is worthless without a callback.

- **Referrals** convert dramatically better than cold applications
- **Resume** should quantify: "100M+ notifications/day", not "worked on notifications"
- **Open source / writing** — your Bangla technical content and GitHub presence are differentiators; keep them active
- Start applying around **Day 120**, not Day 180. Interview loops take 6–10 weeks, and early interviews are themselves practice.

---

## Appendix D — Progress Tracker

Copy this into your notes and fill it in.

### Phase Completion

| Phase | Days | Started | Completed | Exit criteria met? |
|---|---|---|---|---|
| 1 — Foundations | 1–25 | | | ☐ |
| 2 — Data Layer | 26–50 | | | ☐ |
| 3 — Distributed Theory | 51–75 | | | ☐ |
| 4 — Streaming | 76–95 | | | ☐ |
| 5 — Product Systems I | 96–120 | | | ☐ |
| 6 — Product Systems II | 121–145 | | | ☐ |
| 7 — ML & Modern Infra | 146–160 | | | ☐ |
| 8 — Reliability & Ops | 161–175 | | | ☐ |
| 9 — Interview Craft | 176–180 | | | ☐ |

### Mock Scores

| # | Problem | Date | Req | Est | HLD | Data | Deep | Trade | Scale | Rel | Adapt | Comm | Avg |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | URL Shortener | | | | | | | | | | | | |
| 2 | Distributed KV Store | | | | | | | | | | | | |
| 3 | Booking / Txn | | | | | | | | | | | | |
| 4 | Analytics Pipeline | | | | | | | | | | | | |
| 5 | News Feed | | | | | | | | | | | | |
| 6 | WhatsApp | | | | | | | | | | | | |
| 7 | Rate Limiter | | | | | | | | | | | | |
| 8 | YouTube/Netflix | | | | | | | | | | | | |
| 9 | Uber Dispatch | | | | | | | | | | | | |
| 10 | Payment/Ledger | | | | | | | | | | | | |
| 11 | Google Drive | | | | | | | | | | | | |
| 12 | Recommendations | | | | | | | | | | | | |
| 13 | RAG at Scale | | | | | | | | | | | | |
| 14 | Observability | | | | | | | | | | | | |
| 15 | Google-style | | | | | | | | | | | | |
| 16 | Amazon-style | | | | | | | | | | | | |
| 17 | Meta-style | | | | | | | | | | | | |
| 18 | Netflix-style | | | | | | | | | | | | |
| 19 | Full loop 1 | | | | | | | | | | | | |
| 20 | Full loop 2 | | | | | | | | | | | | |

### Parallel Tracks

| Track | Weekly target | Week 1–12 | Week 13–26 |
|---|---|---|---|
| DSA problems solved | 8–10 | | |
| Behavioral stories written | 2 | | |
| Applications / referrals sent | — | Start Day 120 | |
