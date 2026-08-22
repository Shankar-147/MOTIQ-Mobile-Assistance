# Chapter 6 — Unit Economics & Financial Modeling

**Volume I — Foundations: Vision, Market & Business Architecture**
**Part 2 — Business Model & Economics**
**Chapter dependencies:** Builds directly on Chapter 5 (Business Model Canvas), especially its revenue streams (Section 5.3) and cost categories (Section 5.4). Also depends on Chapter 2's market sizing and Chapter 4's research debt list.
**Note on style:** Written in plain English, continuing the approach used since Chapter 2.
**Provenance key:** `[V0]` = from the original MOTIQ pitch deck. `[NEW]` = added for this handbook. `[REVISED]` = changed from the original, with the reason explained.

***

## 6.1 Why This Chapter Exists

Chapter 5 named MOTIQ's revenue streams and cost categories, but it never put real numbers next to them. This chapter does that. It answers the most basic question any real business has to answer before it can grow responsibly: **does a single completed job make money, lose money, or break even — and how does that change as MOTIQ grows?**

This might sound like a finance topic that engineers can skip. It isn't. The answer to this question directly decides things engineers build: how strict the fraud-detection system needs to be (Chapter 99), whether MOTIQ can afford to subsidize early cities (Chapter 7), and how much budget exists for AI features like the chatbot (Chapter 90), which cost real money every time they're used.

One thing to say clearly before starting: almost every number in this chapter is an estimate, not a confirmed fact. Chapter 4 already listed several of MOTIQ's core assumptions as "research debt" — things believed but not yet properly checked. This chapter builds a financial model on top of those same unconfirmed numbers, so the model itself should be treated as a **calculator that shows how the pieces connect**, not as a set of guaranteed outcomes. Once Chapter 4's research is actually done, the real numbers should be dropped into this same structure.

***

## 6.2 Two Numbers Every Marketplace Needs to Know: CAC and LTV

### 6.2.1 What these two terms mean, in plain words

`[NEW]` These two terms come up constantly in any discussion of a growing business, so it's worth explaining them clearly, in MOTIQ's own context.

- **CAC (Customer Acquisition Cost):** How much money it takes, on average, to get one new person to start using MOTIQ. If MOTIQ spends money on ads, referral bonuses, or partnerships to bring in new users, and it spends a certain amount to bring in a certain number of new users, dividing the total spend by the number of new users gives the CAC.

- **LTV (Lifetime Value):** How much money MOTIQ expects to earn, in total, from one user over the entire time they keep using the app — not just their first job, but every job they do for as long as they stay a MOTIQ user.

### 6.2.2 Why the relationship between these two numbers matters so much

`[NEW]` Here's the simple rule that makes these two numbers useful together: **if it costs more to bring in a user (CAC) than that user will ever earn MOTIQ back (LTV), the business loses money every time it gets a new user — and it will keep losing money no matter how many users it gets.** Growth, in that situation, doesn't fix the problem; it makes the loss bigger, faster.

`[NEW]` So a healthy marketplace business needs LTV to be clearly bigger than CAC — not just slightly bigger, but bigger by enough of a margin to also cover the cost of actually running the service (Chapter 5's cost categories) and still leave something over. A commonly used rough guideline in other marketplace businesses is that LTV should be at least three times CAC, though this exact number depends heavily on the specific business and should not be treated as a fixed rule — it is mentioned here only as a sanity check, not a target MOTIQ must hit precisely.

### 6.2.3 MOTIQ has two of these calculations to do, not one

`[NEW]` Because MOTIQ is a two-sided marketplace (as established in Chapter 5), it actually needs to track CAC and LTV separately for drivers and for providers — bringing in a new driver and bringing in a new provider are two completely different efforts with two completely different costs and payoffs.

| | Driver CAC/LTV | Provider CAC/LTV |
|---|---|---|
| What "acquisition cost" looks like | Marketing spend, referral bonuses, app-store costs | Time spent recruiting and verifying (Chapter 98), possible sign-up incentives |
| What "lifetime value" looks like | Commission earned across every job that driver ever books | Commission earned across every job that provider ever completes, over their time on the platform |
| Special note | A driver might use MOTIQ rarely (only when something breaks), so LTV depends heavily on how long they stay a MOTIQ user, not just how often they use it in a given month | A provider might complete many jobs a month, so provider LTV can be large even if provider CAC (verification cost) is also higher than driver CAC |

`[NEW]` This split matters because a business decision that looks good for one side can look bad for the other. For example, spending a lot of money to verify a provider thoroughly (raising provider CAC) might be worth it if that provider stays active and reliable for years (raising provider LTV) — but it would be a mistake to apply that same generous spending logic to acquiring a driver who might only need MOTIQ once every year or two.

***

## 6.3 Deciding the Take Rate and the Provider Payout

### 6.3.1 What "take rate" means

`[NEW]` The take rate is simply the percentage of each job's total payment that MOTIQ keeps as its commission, with the rest going to the provider. If a job costs the driver ₹1,000 total, and MOTIQ's take rate is 15%, MOTIQ keeps ₹150 and the provider receives ₹850.

### 6.3.2 The tension this creates, and why it can't be solved with a spreadsheet alone

`[NEW]` Chapter 4 already flagged that the right take rate depends on real provider research that hasn't happened yet — this section explains exactly why that research matters so much. There is a real tug-of-war built into this one number:

- **A higher take rate** means more revenue for MOTIQ per job, which helps the business become profitable faster (Section 6.4). But it also means less money reaching the provider for the same job, which — as Chapter 3 pointed out — could push providers to just keep working through the informal network instead, where they keep 100% of what the customer pays.
- **A lower take rate** keeps providers happier and more willing to join and stay active, which strengthens MOTIQ's long-term "moat" (Chapter 3, Section 3.6). But it also means MOTIQ needs far more completed jobs to cover its costs, which takes longer and requires more funding to survive until then.

### 6.3.3 A simple way to think about setting the take rate

`[NEW]` Rather than picking a number out of thin air, this handbook recommends building the take rate around one clear, testable rule: **a provider should end up earning noticeably more through MOTIQ than they would working independently, even after MOTIQ's cut is taken out** — because MOTIQ is offering the provider something valuable in return: more job volume, faster payment, and less time spent finding work themselves. If MOTIQ can genuinely bring a provider more total jobs than they'd get on their own, a provider can still come out ahead in total earnings, even while giving up a percentage on each individual job.

This means the real question Chapter 4's provider research needs to answer isn't just "what take rate feels fair," but **"how many extra jobs can MOTIQ realistically bring a provider, and does that extra volume outweigh the commission taken?"** A take rate that looks reasonable on paper can still fail if MOTIQ can't actually deliver enough job volume to make up for it — which directly connects back to Chapter 2's SAM/SOM sizing and Chapter 7's cold-start plan.

### 6.3.4 A placeholder number, clearly marked as provisional

`[NEW]` For the rest of this chapter's calculations to work with concrete numbers, this handbook uses an illustrative take rate of **15%**, chosen because it sits in a range commonly seen in comparable service-marketplace businesses — not because it has been confirmed through MOTIQ's own research. This number should be replaced the moment Chapter 4's provider research produces a better-informed answer, and every calculation below that depends on it should be re-run at that point.

***

## 6.4 Does a Single Job Actually Make Money? (Contribution Margin)

### 6.4.1 What "contribution margin" means

`[NEW]` Contribution margin, in plain terms, is the money left over from one completed job after subtracting only the costs that are directly tied to that specific job — not the company's overall fixed costs like salaries or office rent, just the costs that wouldn't exist if that one job hadn't happened.

### 6.4.2 Building the calculation for one illustrative job

`[NEW]` Let's walk through one example job, using the 15% take rate from Section 6.3.4 and the variable cost categories named in Chapter 5, Section 5.4.3. All numbers below are illustrative placeholders, clearly marked, meant to show the shape of the calculation rather than a confirmed real result.

Assume a job with a total price to the driver of ₹1,000.

| Line item | Amount | Explanation |
|---|---|---|
| Total job price | ₹1,000 | What the driver pays |
| MOTIQ's commission (15%) | ₹150 | This is MOTIQ's revenue from the job |
| Provider payout (85%) | ₹850 | Goes to the provider, not a MOTIQ cost — this is a pass-through |
| Payment gateway fee | ~₹15–20 | A small percentage typically charged by payment processors like Razorpay |
| SMS/notification costs | ~₹1–3 | Small, but adds up at scale |
| Maps/routing API cost | ~₹1–2 | Cost of the location and routing calls made during the job |
| AI/ML costs (matching, ETA) | ~₹1–3 | Cost of running the matching and ETA prediction models for this job |
| **Contribution margin (illustrative)** | **≈ ₹125–130** | MOTIQ's commission minus the direct variable costs tied to this one job |

### 6.4.3 What this table is actually useful for

`[NEW]` The exact numbers here matter far less than the structure. What this table shows is that **MOTIQ's commission alone is not automatically the same as profit on a job** — a meaningful slice of that ₹150 commission gets eaten by payment processing, notifications, maps calls, and AI costs before anything is left over. This is exactly why Chapter 5's cost-category list mattered: if any of these small per-job costs had been forgotten, this table would have overstated how profitable a single job actually is.

It also shows something useful for engineering decisions specifically: **AI and API costs are not free just because they happen in the background.** Every time Chapter 84's matching model runs, or Chapter 85's ETA prediction runs, or Chapter 32's maps API gets called, it costs a small amount of real money. At a small scale, this is trivial. At millions of jobs a year — the scale Chapter 2's TAM discussion described — these small per-job costs become a real budget line, which is why Chapter 12 (Cost Estimation) needs to model this properly at scale, not just per job.

***

## 6.5 When Does a City Actually Become Profitable? (Break-Even Modeling)

### 6.5.1 Why this needs to be modeled city by city, not nationally

`[NEW]` Chapter 3's competitive analysis found that MOTIQ's strength (a verified provider network) has to be built city by city, and Chapter 7 will cover the cold-start strategy in depth. This means it doesn't make sense to ask "when does MOTIQ become profitable?" as one single national question — a more useful question is "when does one specific city become profitable, on its own?" A city that's still building up its provider network and its user base will lose money for a while, even if a more established city elsewhere is already comfortably profitable. Treating the whole company as one blended number can hide a city that's quietly failing behind a city that's doing very well.

### 6.5.2 The basic shape of a break-even calculation

`[NEW]` In plain terms, break-even for a city happens when:

**(Number of completed jobs per month) × (Contribution margin per job, from Section 6.4) = (The city's fixed monthly costs)**

The fixed monthly costs for a single city would typically include things like local marketing spend to attract users and providers, any local support staff, and a share of company-wide costs (like engineering salaries) allocated across all active cities.

### 6.5.3 What this means in practice

`[NEW]` Using the illustrative contribution margin of about ₹125–130 per job from Section 6.4.2, and an illustrative (not confirmed) city-level fixed monthly cost, this handbook can sketch — without pretending to have real numbers yet — the kind of relationship a real model needs to capture:

| Illustrative monthly fixed cost for one city | Jobs needed per month to break even (at ~₹125 margin/job) | Roughly, jobs needed per day |
|---|---|---|
| ₹1,00,000 | ~800 jobs/month | ~27 jobs/day |
| ₹3,00,000 | ~2,400 jobs/month | ~80 jobs/day |
| ₹5,00,000 | ~4,000 jobs/month | ~133 jobs/day |

`[NEW]` Again, the specific numbers here are illustrative placeholders meant to show the shape of the model, not real projections. What this table makes clear is the actual purpose of this section: **it turns "become profitable" from a vague hope into a specific, trackable daily job-count target for each city** — a number that Chapter 7's cold-start strategy and Chapter 139's analytics dashboards can actually monitor and report on in real time, rather than treating profitability as something only found out at the end of the year.

***

## 6.6 What Happens If the Assumptions Are Wrong? (Sensitivity Analysis)

### 6.6.1 Why this section exists

`[NEW]` Every number used so far in this chapter — the take rate, the cost per job, the fixed costs per city — is an estimate. A responsible financial model doesn't just show one version of the future assuming everything goes exactly as planned; it also shows what happens if key assumptions turn out to be wrong, in either direction. This is called sensitivity analysis, and it's especially important here given Chapter 4's honest admission that several of these numbers are still "research debt."

### 6.6.2 The assumptions most worth stress-testing

`[NEW]` Not every number matters equally. Some of MOTIQ's assumptions would only cause small problems if they turned out to be wrong; others would cause serious ones. This handbook highlights three assumptions worth the most attention:

- **The take rate (Section 6.3.4).** If real provider research (Chapter 4) finds that providers will only accept a take rate of 8-10% instead of 15%, the contribution margin per job in Section 6.4.2 drops sharply, which means the break-even job counts in Section 6.5.3 would need to roughly double. This is the single most sensitive number in this whole chapter, which is exactly why Chapter 4 flagged provider research as urgent.
- **AI and API costs per job.** If Chapter 90's AI assistant turns out to be used far more heavily than expected, or if Chapter 84's matching model needs to be called multiple times per job (for example, if the first offered provider doesn't accept and a second attempt is needed), the small per-job AI cost in Section 6.4.2 could grow meaningfully. This connects directly to Chapter 91's AI governance chapter, which should include cost monitoring, not just safety monitoring.
- **How many jobs a typical user actually does per year.** Chapter 6.2's LTV calculation depends heavily on this number. If a typical driver only genuinely needs roadside help once every two or three years — quite plausible, since breakdowns aren't a frequent, routine event — the LTV per driver could be much lower than a business that assumes monthly or even yearly repeat usage, and this would push the business toward relying more heavily on Chapter 5's subscription and B2B fleet revenue streams to make the driver-acquisition math work.

### 6.6.3 What to actually do with this uncertainty

`[NEW]` The right response to this much uncertainty isn't to avoid making a financial model until every number is confirmed — that would leave MOTIQ with no plan at all. The right response is to build the model so it can be easily updated the moment better numbers arrive (from Chapter 4's research or Chapter 139's real usage data), and to make early decisions — like which cities to launch in, and how much to spend acquiring early users — cautiously, favoring approaches that don't depend on the more uncertain, higher-risk assumptions (like a high take rate or frequent repeat usage) being true.

***

## 6.7 Chapter Summary and What Comes Next

In plain terms, here's what this chapter built:

1. **CAC and LTV**, explained in plain terms and calculated separately for drivers and providers, since bringing in each side costs differently and pays back differently. See Section 6.2.
2. **A framework for setting the take rate** — not a fixed number, but a rule ("a provider should earn more overall through MOTIQ, even after the commission, because of extra job volume") — with an illustrative 15% used for the rest of the chapter's math, clearly marked as provisional. See Section 6.3.
3. **A contribution-margin table for one job**, showing that MOTIQ's commission isn't the same as its profit — payment fees, SMS costs, maps costs, and AI costs all take a small bite out of each job. See Section 6.4.
4. **A break-even model, done city by city rather than nationally**, turning "become profitable" into a specific daily job-count target each city's team can actually track. See Section 6.5.
5. **A sensitivity analysis** naming the three assumptions most likely to change the whole picture if they turn out to be wrong: the take rate, AI/API costs per job, and how often a typical user actually needs MOTIQ. See Section 6.6.

This chapter hands off several jobs to later chapters:

- **Chapter 4**'s provider research is now formally the single most urgent open item in this handbook — Section 6.6.2 shows exactly how much the whole financial model depends on it.
- **Chapter 7** (Cold-Start Strategy) should use Section 6.5's break-even job counts as real targets when planning how a new city should be launched and supported.
- **Chapter 12** (Cost Estimation) should take Section 6.4's per-job cost breakdown and scale it up properly across MOTIQ's expected total volume.
- **Chapter 91** (AI Governance) should include cost monitoring for AI usage, not just safety monitoring, based on Section 6.6.2's warning about AI costs per job.
- **Chapter 139** (Product Analytics) should build dashboards that track each city's real job count against the break-even targets from Section 6.5.3, so profitability is visible continuously, not just discovered later.

The next chapter, Chapter 7, builds directly on this one: it explains how MOTIQ should actually get a brand-new city from zero users and zero providers up to the break-even job counts calculated in Section 6.5.3 — the cold-start problem every two-sided marketplace has to solve.

