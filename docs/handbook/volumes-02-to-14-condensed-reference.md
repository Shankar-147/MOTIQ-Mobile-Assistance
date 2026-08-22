# VOLUME I — FOUNDATIONS: VISION, MARKET & BUSINESS ARCHITECTURE (continued)

### Chapter 8 — Pricing Strategy & Transparent Fare Engine (Business View)
*Purpose:* Defines the business rules behind MOTIQ's fare, so Chapter 56 has a specification to implement, not a blank page.

**Key decisions & constraints:**

- Fare = base fare + distance component + optional surge multiplier. All three must be individually visible to the user before confirmation (Ch1 vision: never make the user guess price).
- Surge multiplier must be capped and explainable — no opaque "dynamic pricing" the user can't reason about; Indian surge-pricing precedent (ride-hailing regulatory scrutiny) makes an uncapped multiplier a legal and trust risk.
- Provider payout formula must be visible to the provider separately from the user-facing price (see Ch6's commission-split requirement).
- Promotions/discounts are modeled as a separate ledger line, never silently baked into the base fare, so "quoted vs. paid" stays auditable (Ch2, Ch4 research debt item).

### Chapter 9 — Product Strategy & Prioritization Framework
*Purpose:* Defines how MOTIQ decides what to build next, and formally owns the "strategy layer" Chapter 1 deferred here.

**Key decisions & constraints:**

- Use a lightweight RICE/ICE-style scoring for feature prioritization; document scores in `docs/decisions/`.
- MVP scope = Ch7's Phase 1–2 needs only: request creation, matching, tracking, payment, rating. AI assistant (Ch90), subscriptions (Ch5), and B2B fleet (Ch5) are explicitly post-MVP.
- Build vs. buy default: buy/integrate for maps, payments, SMS, auth-adjacent infra; build for matching, pricing, and trust systems (the actual moat, per Ch3.6).
- Strategy statements must be dated and versioned — they are expected to change every 12–24 months (Ch1, Section 1.4.3).

### Chapter 10 — Stakeholder & Team Operating Model
*Purpose:* Defines roles and decision rights as the team grows past the current 3-person founding team.

**Key decisions & constraints:**

- RACI defined per major decision type (architecture, pricing, provider policy, legal).
- Engineering owns technical ADRs (Ch36); product/business owns strategy (Ch9); both must jointly sign off on anything touching the vision/mission (Ch1).
- This handbook itself is a shared artifact — ownership of keeping it current is assigned in Ch145, not left ambiguous.

### Chapter 11 — Startup Growth Strategy
*Purpose:* Sequences geographic and vertical expansion using Ch7's city-launch playbook as the atomic unit of growth.

**Key decisions & constraints:**

- City sequencing prioritizes markets matching Ch3's "best wedge" profile (highway corridors, high-transience urban areas) before purely large-population cities.
- Vertical expansion (EV assistance, insurance bundling, fleet contracts) is explicitly sequenced after 2–3 cities reach Ch7's "steady state" phase, not in parallel with initial cold-start.
- International expansion (Ch144) is out of scope until domestic unit economics (Ch6) are validated in at least 2 independent cities.

### Chapter 12 — Cost Estimation & Infrastructure Budgeting
*Purpose:* Converts Ch6's per-job cost model into an actual multi-stage budget.

**Key decisions & constraints:**

- Budget modeled at 1K / 10K / 100K / 1M MAU checkpoints, matching Ch1's success-at-scale table.
- Cloud, third-party API (Maps, SMS, payments, LLM), and headcount costs tracked as separate line items, not blended.
- Every AI/ML feature (Ch80–91) must have a cost-per-call estimate attached before it ships, per the sensitivity analysis in Ch6.6.2.

***
# VOLUME II — REQUIREMENTS ENGINEERING & SYSTEM MODELING

### Chapter 13 — Requirements Engineering Process
*Purpose:* Establishes how requirements are written, IDed, and traced back to Ch1's problem table.

**Key decisions & constraints:**

- Every FR/NFR gets an ID (`FR-###`, `NFR-###`) and must cite which Ch1 objective category (Section 1.5.2) it serves.
- Acceptance criteria required before a requirement is considered implementable — no "vibes-based" tickets.
- Change management: requirement changes require a note on what triggered the change (research finding, incident, strategy shift).

### Chapter 14 — Functional Requirements Specification
*Purpose:* The full FR catalog, organized by module (auth, request, matching, tracking, SOS, payments, ratings).

**Key decisions & constraints:**

- FRs tagged MVP / V1 / V2 per Ch9's prioritization.
- Every FR touching money (pricing, payout, refund) must specify the exact rounding and currency-handling rule (paise-level precision, no float arithmetic for money).
- Cross-module dependencies documented explicitly (e.g., "Payment FR-devs depend on Matching FR-### being complete first").

### Chapter 15 — Non-Functional Requirements Specification
*Purpose:* Defines the quality bar — performance, availability, security, usability, scalability — as testable numbers, not adjectives.

**Key decisions & constraints:**

- Matching latency target: provider offer sent within a bounded time of request creation (exact number pending Ch4 research + Ch121 load testing; do not hardcode an unvalidated number as a hard SLA yet — mark as provisional).
- Availability target for the request-creation and SOS paths is higher than for secondary features (dashboard, analytics) — tiered NFRs, not one blanket uptime number.
- Every NFR must map to one of Ch1's four success layers (Trust, Safety, Business viability, Technical reliability).

### Chapter 16 — User Personas
*Purpose:* Turns Ch1's "every driver" vision and Ch2's demographic sketch into concrete, usable personas.

**Key decisions & constraints:**

- Minimum personas: urban car owner, highway/intercity driver, independent mechanic provider, fleet/garage provider, admin/ops, and an explicit low-digital-literacy edge persona.
- Each persona must specify connectivity assumptions (relevant to Ch67 offline design) and language preference (English/Hindi/Tamil per the original V0 stack).
- Personas are inputs to every UX chapter in Volume XIII — do not let Volume XIII invent new personas ad hoc.

### Chapter 17 — Customer Journey Mapping
*Purpose:* Maps the emotional and functional journey across pre-, during-, and post-breakdown phases, for both drivers and providers.

**Key decisions & constraints:**

- The breakdown-moment journey must explicitly account for high-stress, possibly low-connectivity conditions (feeds Ch67, Ch135).
- Provider journey mapped with equal depth to the user journey (correcting the V0 gap flagged in the original audit).

### Chapter 18 — Use Case Modeling
*Purpose:* Formal use-case diagrams/specs for User, Provider, Admin, and System/AI actors.

**Key decisions & constraints:**

- Every use case has explicit preconditions, main flow, and at least one exception flow.
- The AI actor's use cases explicitly include "AI unavailable" as a first-class exception path (ties to Ch90/Section 5 AI-interface-not-implementation rule).

### Chapter 19 — The Service Request State Machine
*Purpose:* The single most load-bearing artifact in the handbook (per Ch1). Full canonical state machine for a request.

**Key decisions & constraints:**

- Canonical states: `REQUESTED → MATCHING → ASSIGNED → PROVIDER_ACCEPTED → PROVIDER_EN_ROUTE → ARRIVED → SERVICE_IN_PROGRESS → COMPLETED`, plus `CANCELLED_BY_CUSTOMER`, `CANCELLED_BY_PROVIDER`, `EXPIRED`, `FAILED`.
- State transitions must be enforced in code (a guarded transition function/state machine library), not just convention — invalid transitions must be structurally impossible.
- Timeout-driven transitions (e.g., `MATCHING` → reassignment or `EXPIRED`) must be explicit, with a defined timeout value (provisional until Ch53 finalizes).
- Every other backend, mobile, and notification chapter assumes this exact state list — do not invent parallel status vocabularies elsewhere.

### Chapter 20 — Activity Diagrams for Core Workflows
*Purpose:* Visual/logical flow for request-to-match, payment, SOS activation, and provider onboarding.

**Key decisions & constraints:**

- Diagrams must reconcile exactly with Ch19's state names — no renamed states in diagrams.

### Chapter 21 — Sequence Diagrams for Critical Flows
*Purpose:* Full request→match→track→complete sequence; timeout→reassignment; payment settlement; SOS→emergency contact.

**Key decisions & constraints:**

- Each sequence diagram must show both the happy path and at least one failure path (timeout, payment failure, no-provider-available).

### Chapter 22 — Data Flow Diagrams, Revised
*Purpose:* Reconciles the original DFDs with Ch19's state machine; Level 2 decomposition for Matching and Payment Processing.

### Chapter 23 — Domain Glossary & Ubiquitous Language
*Purpose:* Canonical vocabulary — Request vs. Job vs. Assignment, status terms — used consistently in code, schema, and docs.

**Key decisions & constraints:**

- This glossary is binding for naming in the domain model (Ch37) and codebase; deviations require an ADR.

### Chapter 24 — Bounded Context Mapping
*Purpose:* Identifies candidate bounded contexts (Request, Matching, Provider, Payment, Notification, Identity) that Ch25/26 will use to draw module boundaries.

**Key decisions & constraints:**

- Context map notes which contexts share data (shared kernel) vs. which need an anti-corruption layer (e.g., between MOTIQ's domain model and the external Maps/Payment provider's data shapes).

***
# VOLUME III — SYSTEM ARCHITECTURE & DESIGN DECISIONS

### Chapter 25 — Monolith vs. Microservices — The MOTIQ Decision (ADR)
*Purpose:* The foundational architecture-style decision.

**Key decisions & constraints:**

- **Decision: modular monolith for V1.** A 3-person team and unproven traffic do not justify microservices' operational overhead.
- Module boundaries follow Ch24's bounded contexts exactly, enforced via internal package/module structure even inside one deployable.
- Common failure to avoid: extracting services prematurely "for scalability" before there's a real scaling or team-ownership pressure forcing it.

### Chapter 26 — Modular Monolith Internal Design
*Purpose:* Defines how module boundaries are actually enforced inside the NestJS codebase.

**Key decisions & constraints:**

- No module reaches directly into another module's database tables/repositories — access only through the owning module's service interface.
- Shared kernel limited to genuinely cross-cutting concerns (auth context, money/currency value objects).

### Chapter 27 — Service Extraction Roadmap
*Purpose:* Defines the future trigger conditions for splitting the monolith.

**Key decisions & constraints:**

- Candidate extraction order: Matching Engine first (highest scaling/compute-isolation pressure), then Notifications, then AI/ML serving.
- Extraction requires a documented trigger (team ownership conflict, independent scaling need, or deployment-blast-radius incident) — not extracted speculatively.

### Chapter 28 — High-Level System Architecture, Revised
*Purpose:* Full layer-by-layer architecture narrative reconciling the original diagram with the Ch25 monolith decision.

### Chapter 29 — API Design Standards
*Purpose:* REST conventions binding across all backend chapters.

**Key decisions & constraints:**

- URI versioning (`/api/v1/...`); deprecation requires a minimum notice window before removal.
- Standard error envelope (RFC 7807-style: type, title, status, detail, instance).
- Idempotency-Key header required on all unsafe (POST/PATCH) endpoints that create money-movement or job-creation side effects.

### Chapter 30 — Synchronous vs. Asynchronous Communication Design
*Purpose:* Rules for when REST suffices vs. when the event backbone (Ch31) is required.

**Key decisions & constraints:**

- Matching, notification fan-out, and analytics ingestion are async by default. Auth, request creation acknowledgment, and payment confirmation are sync.

### Chapter 31 — Event-Driven Backbone Design
*Purpose:* Closes the V0 gap — defines MOTIQ's message queue.

**Key decisions & constraints:**

- Event catalog (minimum): `RequestCreated`, `ProviderAssigned`, `ProviderTimedOut`, `PaymentSettled`, `JobCompleted`, `RatingSubmitted`.
- Dead-letter queue required for every consumer; no silent event drops.
- Queue technology choice (SQS vs. RabbitMQ vs. Kafka) is an explicit ADR — default recommendation for V1 scale is a managed queue (SQS-class) over self-hosted Kafka, given team size.

### Chapter 32 — Third-Party Integration Architecture
*Purpose:* Integration boundaries for Maps, Payments (Razorpay), SMS/Email, Cloud storage.

**Key decisions & constraints:**

- Every third-party call wrapped in an internal adapter interface — no direct SDK calls from domain/service code (protects against vendor lock-in and enables the circuit-breaker pattern from Ch35).
- Each integration has a documented outage playbook (what MOTIQ does when Maps/Payments/SMS is down).

### Chapter 33 — Authentication & Authorization Architecture
*Purpose:* JWT/OAuth2 design, RBAC model, session handling across mobile and web.

**Key decisions & constraints:**

- Roles: Customer, Provider, Admin, Support — each with a distinct permission set; no shared "user" role with ad hoc flags.
- Refresh-token rotation required; access tokens short-lived.

### Chapter 34 — Configuration & Secrets Management Architecture
*Purpose:* Environment-based config strategy and feature-flag precursor.

**Key decisions & constraints:**

- All money-related constants (commission rate, surge caps) are configuration, not code constants — directly enforces Ch6's requirement.

### Chapter 35 — Resilience Patterns
*Purpose:* Timeout/retry/circuit-breaker/bulkhead standards.

**Key decisions & constraints:**

- Matching engine and payment service both require circuit breakers with a defined fallback (e.g., distance-sort fallback when the ranking model, Ch84, is degraded — this is binding, not optional, per Ch1's safety commitments).

### Chapter 36 — Architecture Decision Record (ADR) Process
*Purpose:* Formalizes the ADR template used informally since Ch1.

**Key decisions & constraints:**

- ADR template: Context → Decision → Alternatives Considered → Consequences → Status → **Mission commitment served (Ch1, Section 1.4.2)**.
- All ADRs indexed in `docs/decisions/README.md`.

***
# VOLUME IV — DATA & DATABASE ARCHITECTURE

### Chapter 37 — Conceptual Data Model, Revised
*Purpose:* Fixes the original ER model's Vehicle/ServiceVehicle naming collision using Ch23's glossary.

**Key decisions & constraints:**

- Rename provider's tow vehicle to `ProviderFleetVehicle`, distinct from the customer's `Vehicle`.

### Chapter 38 — Logical & Physical Schema Design
*Purpose:* Full relational schema, normalized (3NF) with deliberate, documented denormalization points.

**Key decisions & constraints:**

- Enums stored as Postgres enums or lookup tables (documented choice per field) — not free-text status columns.
- Every schema migration is versioned and reversible.

### Chapter 39 — Geospatial Data Architecture
*Purpose:* Closes the biggest V0 database gap.

**Key decisions & constraints:**

- PostGIS `geography` columns with GiST spatial index for provider and request locations — plain lat/lng decimal columns are explicitly disallowed for any "nearest provider" query path.
- Geofencing (arrival detection, SOS zones) modeled as PostGIS polygons, not manual radius math in application code.

### Chapter 40 — Time-Series Data Architecture
*Purpose:* GPS ping history storage.

**Key decisions & constraints:**

- TimescaleDB hypertable for `location_pings`; downsampling policy after a defined retention window (e.g., raw pings kept 90 days, then downsampled).

### Chapter 41 — Indexing & Query Performance Strategy
*Purpose:* Named index catalog.

**Key decisions & constraints:**

- Minimum required indexes: `ServiceRequests.status`, composite `(provider_id, status)` on Assignments, spatial index on provider location.

### Chapter 42 — Data Partitioning, Archival & Retention
*Purpose:* Retention policy per data category, reconciled later with Ch131's legal erasure requirements.

### Chapter 43 — Data Consistency & Idempotency Patterns
*Purpose:* Idempotency-key design for payments and job creation; locking strategy for concurrent provider assignment.

**Key decisions & constraints:**

- Optimistic locking (version column) on Assignment records to prevent double-assignment race conditions during matching.

### Chapter 44 — Caching Strategy
*Purpose:* Redis cache-aside vs. write-through decisions by data type.

**Key decisions & constraints:**

- Provider availability: short-TTL cache-aside with explicit invalidation on status change — never a stale-tolerant long TTL, since this directly affects matching correctness.

### Chapter 45 — Data Warehouse & Analytics Data Architecture
*Purpose:* Separates operational DB from analytics DB; feeds Ch139.

### Chapter 46 — Master Data Management
*Purpose:* Canonical provider/service-type reference data and data-quality rules.

### Chapter 47 — Database Reliability Engineering
*Purpose:* Backup, replica, and PITR strategy.

**Key decisions & constraints:**

- Backup restore must be tested on a real schedule (not just configured and assumed to work) — closes a named V0 gap.


***
# VOLUME V — BACKEND ENGINEERING (NESTJS SERVICES)

### Chapter 48 — Backend Architecture Overview
*Purpose:* NestJS module structure mapped 1:1 to Ch24's bounded contexts.

**Key decisions & constraints:**

- One NestJS module per bounded context (Request, Matching, Provider, Payment, Notification, Identity); controller → service → repository layering enforced in every module.

### Chapter 49 — API Layer Implementation Strategy
*Purpose:* DTO/validation/exception-filter conventions.

**Key decisions & constraints:**

- class-validator DTOs on every endpoint; global exception filter maps domain errors to Ch29's RFC 7807 envelope.

### Chapter 50 — Authentication Service Design
*Purpose:* Registration/login, OTP for phone-first users, token issuance.

### Chapter 51 — Authorization & RBAC Implementation
*Purpose:* Guard-level enforcement of Ch33's role model at both controller and data-access layers.

### Chapter 52 — Service Request Module Design
*Purpose:* Implements Ch19's state machine as the actual domain logic.

**Key decisions & constraints:**

- State transitions live in one guarded function/class, called by every code path that changes request status — never mutated directly via a raw update elsewhere.

### Chapter 53 — Matching & Dispatch Engine Design
*Purpose:* The core value-delivery engine.

**Key decisions & constraints:**

- Candidate retrieval via Ch39's geospatial index; ranking via Ch84's model with a hard fallback to simple distance-sort if the model is unavailable (non-negotiable per Ch35).
- Timeout-driven reassignment: a provider who doesn't respond within a configured window (provisional default, to be tuned) triggers automatic reassignment to the next candidate, not a stuck request.
- Broadcast-to-multiple vs. single-offer dispatch is a config-level decision per city/phase (ties to Ch7's cold-start phases — broadcast may suit thin early-supply cities better).

### Chapter 54 — Real-Time Tracking Service Design
*Purpose:* Location ingestion from mobile, write path to Ch40's time-series store, ETA recomputation triggers.

### Chapter 55 — SOS & Safety Service Design
*Purpose:* SOS trigger handling — the platform's highest-priority path.

**Key decisions & constraints:**

- SOS requests bypass normal matching-queue priority entirely.
- Rate-limiting/abuse-prevention on SOS must never delay a genuine trigger — err toward false positives, not false negatives, on this path specifically.

### Chapter 56 — Transparent Pricing Engine Implementation
*Purpose:* Implements Ch8's fare formula as a deterministic, testable function.

**Key decisions & constraints:**

- Fare calculation is a pure function of (distance, base rate, surge multiplier, promotions) — fully unit-testable, fully reproducible for audit/dispute purposes.

### Chapter 57 — Payment Processing Service Design
*Purpose:* Razorpay integration, webhook handling, commission split.

**Key decisions & constraints:**

- Every payment record stores total charged, platform commission amount, and provider payout amount as separate fields (binding per Ch6).
- Webhook signature verification mandatory; idempotent payment-intent creation using Ch43's idempotency keys.

### Chapter 58 — Ratings, Reviews & Trust Score Service
*Purpose:* Rating aggregation and provider trust-score computation, feeding Ch84's ranking model.

### Chapter 59 — Notification Service Design
*Purpose:* Multi-channel (push/SMS/email) abstraction with preference and quiet-hours handling.

### Chapter 60 — User Dashboard & History Service
*Purpose:* Booking history, invoice generation, data-export endpoint (feeds Ch131's erasure/portability rights).

### Chapter 61 — Admin & Operations Service Design
*Purpose:* Admin panel backend, manual dispatch override, provider-verification workflow backend (feeds Ch98).

### Chapter 62 — Background Jobs & Scheduled Task Architecture
*Purpose:* Worker/queue design for stale-request cleanup and scheduled analytics refresh.

### Chapter 63 — Backend Performance Optimization Practices
*Purpose:* N+1 prevention, connection pooling, pagination standards as binding code conventions.

***
# VOLUME VI — MOBILE ENGINEERING (FLUTTER / REACT NATIVE)

### Chapter 64 — Mobile Architecture Overview
*Purpose:* Feature-based folder structure; Zustand state management rationale.

### Chapter 65 — Mobile Navigation & Information Architecture
*Purpose:* Navigation stacks for User and Provider apps; deep-linking design.

### Chapter 66 — Mobile API Integration Layer
*Purpose:* Axios conventions, token-refresh handling, offline-state handling at the API layer.

### Chapter 67 — Offline-First Design
*Purpose:* The single most safety-critical mobile chapter, per Ch2's finding that breakdowns disproportionately happen in low-signal areas.

**Key decisions & constraints:**

- Local request queuing with sync-on-reconnect is mandatory for request creation — a user must be able to submit a request attempt even mid-connectivity-loss.
- SMS-based SOS fallback required when data connectivity fails entirely (non-negotiable, ties to Ch55).
- Cached last-known-location used as fallback when live GPS/data is unavailable.

### Chapter 68 — Background Location Tracking Architecture
*Purpose:* iOS/Android background location constraints, battery/accuracy tradeoffs, geofencing triggers.

### Chapter 69 — Real-Time Communication on Mobile
*Purpose:* WebSocket client lifecycle, reconnection/backoff, presence handling.

### Chapter 70 — Push Notification Architecture (Mobile Side)
*Purpose:* Notification categories, silent push for state sync.

### Chapter 71 — User App Feature Architecture
*Purpose:* Request creation, live tracking, payment/rating flow implementation.

### Chapter 72 — Provider App Feature Architecture
*Purpose:* Job offer/accept flow, navigation-to-customer, status updates — built to equal depth with the user app (correcting a named V0 gap).

### Chapter 73 — Mobile Accessibility Implementation
*Purpose:* Screen-reader support, high-contrast/night mode, voice-guided interaction for hands-busy scenarios.

### Chapter 74 — Mobile Release Engineering
*Purpose:* App-store release process, forced-update strategy for safety-critical fixes, crash reporting.

***
# VOLUME VII — REAL-TIME SYSTEMS & COMMUNICATION

### Chapter 75 — Real-Time Architecture Overview
*Purpose:* WebSocket gateway design within NestJS; horizontal scaling via Redis adapter (closes a named V0 gap — the original diagram showed WebSocket support with no scaling story).

### Chapter 76 — Presence & Connection State Management
*Purpose:* Provider online/offline/busy state machine, heartbeat, reconnection-storm mitigation.

### Chapter 77 — Live Location Streaming Pipeline
*Purpose:* Mobile→gateway→subscriber pipeline with throttling/batching and multi-subscriber fan-out (user, admin, analytics).

### Chapter 78 — In-App Chat System Design
*Purpose:* Chat data model, delivery guarantees, moderation.

### Chapter 79 — Cross-Channel Notification Orchestration
*Purpose:* Unifies push/SMS/email/in-app decisioning with delivery-guarantee tiers (best-effort vs. critical/SOS).

***
# VOLUME VIII — ARTIFICIAL INTELLIGENCE & MACHINE LEARNING SYSTEMS

### Chapter 80 — ML Architecture Overview & Platform Strategy
*Purpose:* Unifies the four V0 models under one serving architecture; build-vs-buy per model.

### Chapter 81 — Feature Engineering & Feature Store Design
*Purpose:* Shared feature-serving layer preventing training-serving skew (a named V0 gap).

### Chapter 82 — Data Pipeline for ML, Revised
*Purpose:* Reconciles the original 8-stage pipeline with Volume IV's data architecture.

### Chapter 83 — Service Category Classifier — Design Deep Dive
*Purpose:* Naive Bayes classifier against Ch2's exact issue taxonomy, with a confidence-threshold fallback to manual category selection.

### Chapter 84 — Provider Matching & Ranking Model — Design Deep Dive
*Purpose:* Learning-to-rank model; explainability required for provider-dispute resolution; hard fallback to distance-sort (binding, referenced by Ch53/Ch35).

### Chapter 85 — ETA Prediction Model — Design Deep Dive
*Purpose:* Regression model for arrival time; error-tolerance communicated honestly to the user (ties to Ch1's "never guess" vision — show a range/confidence, not false precision).

### Chapter 86 — Demand Forecasting Model — Design Deep Dive
*Purpose:* Time-series forecasting with an explicit cold-start strategy for new cities with no history yet (ties directly to Ch7).

### Chapter 87 — Model Training Pipeline & Experimentation
*Purpose:* Standardized train/validation/test process and experiment tracking.

### Chapter 88 — Model Registry & Versioning
*Purpose:* Actual tooling/process for model versioning and rollback (closes a named V0 gap — "models are versioned" with no mechanism).

### Chapter 89 — Model Monitoring, Drift Detection & Retraining
*Purpose:* Defines drift metrics and retraining triggers per model type.

### Chapter 90 — AI Assistant (Chatbot) Architecture
*Purpose:* The highest-stakes AI chapter — closes a critical V0 safety gap.

**Key decisions & constraints:**

- Emergency-intent detection is mandatory and runs before any conversational response — if detected, the chatbot must redirect to the SOS path (Ch55), never attempt to "handle" an emergency conversationally.
- Grounding/RAG against MOTIQ's own policy content only; hallucination guardrails scope the assistant to roadside-assistance topics.
- Cost-per-conversation tracked and capped (ties to Ch6's AI-cost sensitivity finding).
- Escalation-to-human-agent path required for anything outside the assistant's competence.

### Chapter 91 — AI Governance & Responsible AI Practices
*Purpose:* Bias/fairness review for the ranking model, audit trail for disputes, AI-specific incident response.


***
# VOLUME IX — SECURITY, TRUST & SAFETY ENGINEERING

### Chapter 92 — Threat Modeling for MOTIQ
*Purpose:* STRIDE analysis against MOTIQ's specific attack surface (fake SOS, location spoofing, provider account takeover, payment fraud, fake job completion).

### Chapter 93 — Identity & Access Security
*Purpose:* Credential hashing standards, MFA strategy, session/token hardening.

### Chapter 94 — Data Protection & Encryption Architecture
*Purpose:* KMS-based key management for encryption at rest (closes a named V0 gap — "AES-256" stated with no key-management design); field-level encryption for sensitive PII.

### Chapter 95 — Network & Application Security
*Purpose:* WAF/DDoS config principles; per-user/per-provider API rate limiting (not just generic gateway-level limiting).

### Chapter 96 — Mobile Application Security
*Purpose:* Certificate pinning, root/jailbreak detection, secure local token storage.

### Chapter 97 — Payment Security & PCI Scoping
*Purpose:* Tokenization boundary with Razorpay; PCI-DSS scope minimization; payment-fraud detection.

### Chapter 98 — Provider Verification & KYC Architecture
*Purpose:* Core to MOTIQ's competitive moat (Ch3.6), not just a safety checkbox.

**Key decisions & constraints:**

- Two-tier verification status required: `PROVISIONAL` (fast-track, per Ch7's cold-start needs) and `FULLY_VERIFIED` — never a single boolean.
- Ongoing re-verification cadence defined, with clear de-listing triggers for lapsed or failed re-checks.

### Chapter 99 — Fraud Detection Systems
*Purpose:* GPS-spoofing detection for fake job completion; fake-account/collusion detection.

### Chapter 100 — Incident Response & Security Operations
*Purpose:* Severity classification, breach response procedure (ties to Ch126's legal obligations), post-incident review.

***
# VOLUME X — INFRASTRUCTURE, DEVOPS & SITE RELIABILITY ENGINEERING

### Chapter 101 — Cloud Architecture & Provider Strategy
*Purpose:* AWS service selection rationale; region selection aligned with Ch127's data-localization requirements.

### Chapter 102 — Networking & VPC Design
*Purpose:* VPC/subnet/security-group topology; zero-trust principles.

### Chapter 103 — Compute & Container Orchestration
*Purpose:* Docker/Kubernetes design; autoscaling tied to real load signals, not guesswork.

### Chapter 104 — Environment Strategy
*Purpose:* Dev/staging/prod parity; ephemeral preview environments for PRs.

### Chapter 105 — CI Pipeline Design
*Purpose:* Build/lint/test gating stages as pipeline-as-code.

### Chapter 106 — CD & Deployment Strategy
*Purpose:* Blue-green/canary/rolling deployment decision for a real-time, safety-adjacent system; automated rollback triggers.

### Chapter 107 — Feature Flag & Progressive Delivery
*Purpose:* Flag platform integration; A/B testing framework for ML model changes; kill-switches for risky features.

### Chapter 108 — Secrets & Configuration Management
*Purpose:* AWS SSM/Secrets Manager conventions; rotation policy.

### Chapter 109 — Monitoring Architecture & SLIs/SLOs
*Purpose:* Closes the V0 "99.4% uptime, no stated target" gap.

**Key decisions & constraints:**

- SLIs/SLOs defined per critical journey (request creation, matching, SOS) before any uptime number is reported as an achievement.
- Technical dashboards (latency, error rate) kept separate from business dashboards (active requests, provider utilization).

### Chapter 110 — Logging Architecture
*Purpose:* Structured logging standard; centralized aggregation; PII scrubbing (ties to Ch126/Ch131).

### Chapter 111 — Distributed Tracing & Debugging
*Purpose:* OpenTelemetry integration; correlation-ID propagation across the request→match→track→pay flow.

### Chapter 112 — Alerting & On-Call Practice
*Purpose:* Actionable-alert design; on-call rotation; runbook-linked alerting.

### Chapter 113 — Synthetic & Real-User Monitoring
*Purpose:* Scripted end-to-end health checks simulating the full request→match flow; mobile RUM.

### Chapter 114 — Backup & Restore Engineering
*Purpose:* Verified, tested restore cadence — not just configured backups assumed to work.

### Chapter 115 — Disaster Recovery Runbooks
*Purpose:* Named runbooks: DB failover, matching-service-down, payment-gateway-outage, full-region-outage.

### Chapter 116 — Chaos Engineering Practice
*Purpose:* Fault-injection program and game-day exercises, since DR numbers untested are aspirational, not real (per the original audit's finding on V0's RTO/RPO claims).

### Chapter 117 — Infrastructure Cost Optimization
*Purpose:* Reserved/spot strategy tied back to Ch12's budget model.

***
# VOLUME XI — QUALITY ENGINEERING & TESTING

### Chapter 118 — Test Strategy & Test Pyramid
*Purpose:* Coverage targets and CI gating policy per test type (replacing V0's "all tests passed" checklist with a real, tiered strategy).

### Chapter 119 — Unit & Integration Testing Standards
*Purpose:* Backend unit-test conventions; contract testing between modules.

### Chapter 120 — End-to-End & System Testing
*Purpose:* Critical-journey E2E catalog (request→match→complete→pay→rate); test-data management.

### Chapter 121 — Performance & Load Testing
*Purpose:* Defines real breaking-point targets per growth milestone (Ch12), beyond V0's limited 4-point load chart; stress/soak/spike testing.

### Chapter 122 — Security Testing Practice
*Purpose:* Vulnerability scanning cadence, penetration testing program, dependency scanning.

### Chapter 123 — ML Model Testing
*Purpose:* Data validation tests, model regression testing against a fixed eval set, fairness/bias testing for the ranking model.

### Chapter 124 — Mobile Testing
*Purpose:* Device/OS fragmentation matrix; offline-mode and background-location test scenarios.

### Chapter 125 — Accessibility Testing
*Purpose:* Screen-reader and contrast compliance testing; assistive-technology matrix.

***
# VOLUME XII — LEGAL, PRIVACY & REGULATORY COMPLIANCE

### Chapter 126 — Digital Personal Data Protection Act (DPDP) Compliance
*Purpose:* The single largest gap identified in the original audit — India's primary data-privacy law.

**Key decisions & constraints:**

- Consent management framework required for all location and personal-data collection.
- Data Principal rights (access, correction, erasure) must be implementable via real endpoints, not just policy language (ties to Ch60's export endpoint and Ch131).

### Chapter 127 — Data Localization & Residency
*Purpose:* Primary-region data-storage commitments; reconciled with Ch101's AWS region strategy.

### Chapter 128 — Consent & Location-Tracking Compliance
*Purpose:* Background-location consent design for both users and providers; consent versioning and audit trail.

### Chapter 129 — Terms of Service & Marketplace Liability
*Purpose:* MOTIQ's liability posture as a marketplace vs. the provider's own liability; vehicle-damage/injury framework; provider insurance requirements.

### Chapter 130 — Gig-Worker Classification & Provider Contracts
*Purpose:* Employment-classification risk under Indian law; provider contract structure; minimum-payout considerations.

### Chapter 131 — Data Retention & Right-to-Erasure Policy
*Purpose:* Reconciles Ch42's retention rules with Ch126's erasure rights; resolves soft-delete vs. hard-delete.

### Chapter 132 — Accessibility & Regulatory Compliance (RPwD Act)
*Purpose:* Legal accessibility obligations for a safety-relevant product; compliance audit checklist.

***
# VOLUME XIII — PRODUCT, UX & ACCESSIBILITY DESIGN

### Chapter 133 — Design System & Visual Language
*Purpose:* Component library principles; multi-language typography (English/Hindi/Tamil).

### Chapter 134 — Trust-Building Onboarding Design
*Purpose:* First-use trust experience; progressive disclosure of verification signals; low-digital-literacy onboarding.

### Chapter 135 — Failure-Path & Edge-Case UX
*Purpose:* Designs the "no provider available" and mid-route cancellation experiences explicitly flagged as needed by Ch7.5.3 and Ch7.6.3.

### Chapter 136 — Provider-Side UX Design
*Purpose:* Full design parity with the user app; earnings transparency; job-queue UX.

### Chapter 137 — Admin & Operations Console UX
*Purpose:* Dispatcher override interface; verification-review workflow UX.

### Chapter 138 — Accessibility & Inclusive Design
*Purpose:* Voice-first interaction for hands-busy/stressed users; night-driving mode; motor/cognitive accessibility.

***
# VOLUME XIV — ANALYTICS, GROWTH & FUTURE EVOLUTION

### Chapter 139 — Product Analytics Architecture
*Purpose:* Replaces V0's placeholder metrics with a real event-tracking taxonomy and North Star dashboard, formalizing Ch1's provisional North Star metric.

### Chapter 140 — Business Intelligence & Reporting
*Purpose:* Executive, city-level operational, and provider-earnings/marketplace-health reporting.

### Chapter 141 — Technical Debt Management
*Purpose:* Debt tracking process tied to Ch27's service-extraction roadmap.

### Chapter 142 — Future Roadmap & Emerging Capabilities
*Purpose:* EV-specific assistance, insurance bundling, predictive/preventive breakdown alerts.

### Chapter 143 — Patent & IP Opportunity Assessment
*Purpose:* Novel-contribution identification (matching algorithm, pricing engine); defensive publication vs. patent tradeoffs.

### Chapter 144 — International Expansion Architecture Considerations
*Purpose:* Multi-currency/multi-regulatory design implications; localization beyond language.

### Chapter 145 — Handbook Governance & Maintenance Process
*Purpose:* Closes the loop — how this handbook stays synchronized with the evolving codebase.

**Key decisions & constraints:**

- Every ADR (Ch36) must be reconciled against its cited handbook chapter when that chapter is eventually written in full.
- The research-debt list (Ch4.6.2) and the "Reconciliation Notes" produced by any Claude Code bootstrap session must be reviewed and closed out systematically, not left to accumulate silently.

