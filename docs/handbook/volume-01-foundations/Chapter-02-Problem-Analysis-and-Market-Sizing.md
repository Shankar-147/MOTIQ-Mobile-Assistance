# Chapter 2 — Problem Analysis & Market Sizing

**Volume I — Foundations: Vision, Market & Business Architecture**
**Part 1 — Vision & Problem Space**
**Chapter dependencies:** Builds on Chapter 1 (Vision and Mission), especially Section 1.2's problem list and Section 1.2.2's warning that MOTIQ's market numbers are not yet validated.
**Note on style:** This chapter is written in plain English on purpose. Some ideas here (like TAM/SAM/SOM) sound technical, but they are simple once explained. We will explain every term the first time we use it.
**Provenance key:** `[V0]` = from the original MOTIQ pitch deck. `[NEW]` = added for this handbook. `[REVISED]` = changed from the original, with the reason explained.

***

## 2.1 Why This Chapter Exists

Chapter 1 ended with a promise: the big numbers in MOTIQ's original pitch deck — 20 million breakdowns a year, 60-minute average wait times, 70% of users struggling to find trusted help, 40% overpaying — would get checked properly, not just repeated.

This chapter does that checking.

Here is why it matters. If MOTIQ builds its matching engine assuming the average wait time really is 60 minutes, but the real number is 25 minutes in cities and 90 minutes on highways, the engine will be tuned wrong for both cases. If MOTIQ assumes "trust" is one single problem, but it is actually three different problems (not knowing who is coming, not knowing the price, not knowing when they'll arrive), the product will fix the wrong one first.

So this chapter has one job: take the exciting numbers from the pitch, and turn them into numbers an engineering team can actually build against — or clearly say "we don't know this yet, here is how we will find out."

***

## 2.2 Restating the Problem, Carefully

### 2.2.1 What "carefully" means here

`[NEW]` Being careful about a problem statement means separating three different kinds of claims:

1. **Things we can check.** Example: "How many registered vehicles are there in India?" This is a fact that government data can confirm.
2. **Things we can estimate, with a stated method.** Example: "How many roadside breakdowns happen per year?" Nobody counts this directly, but we can estimate it from vehicle age, average driving distance, and known breakdown rates per kilometer.

3. **Things people feel, which need a survey to measure.** Example: "Do people struggle to find trusted help?" This is not a fact sitting in a database somewhere. It is a feeling, and feelings need to be measured by asking people directly, in a structured way.

`[V0]` MOTIQ's original deck mixes all three kinds of claims together into one confident-sounding list, without saying which is which. This chapter's first job is to sort them.

### 2.2.2 The five problems, sorted

`[V0]` The original deck names five problems with the current roadside-assistance situation in India:

1. Service providers are scattered and unorganized.
2. There is no fixed or clear pricing.
3. Coordination is manual, so help is slow.
4. There is no way to track help in real time.
5. There is no feedback system, so bad providers are never filtered out.

`[NEW]` Here is the same list, sorted by what kind of claim it is:

| Problem | What kind of claim is this? | How do we check it? |
|---|---|---|
| Providers are scattered and unorganized | A **fact** about market structure | Look at how many independent garages/mechanics exist vs. organized chains (government MSME data, industry reports) |
| No fixed pricing | Partly fact, partly feeling | Fact part: are prices published anywhere? (No, mostly.) Feeling part: do people *feel* overcharged? (Needs a survey.) |
| Manual coordination, slow help | A mix of fact and estimate | Fact: is there an app or number people call today? (Mostly no — it's word of mouth.) Estimate: how long does that actually take? |
| No real-time tracking | A **fact** | Simple to check — do any existing services offer live tracking? (Almost none do.) |
| No feedback/accountability | A **fact** | Do any existing services have public ratings for roadside providers? (Almost none do.) |

The good news: four of the five problems are facts we can confirm just by looking at what already exists in the market. Nobody needs to run a survey to know that most roadside mechanics in India don't have a rating system — you can just check. The pricing problem is the only one that mixes a fact (no published price list) with a feeling (do people feel cheated), and the feeling part needs real research, which Section 2.6 covers.

This matters because it tells us where our confidence should be high (structural problems) and where it should be lower until we do more research (how people actually feel about it).

***

## 2.3 How Big Is the Market? (TAM, SAM, SOM)

### 2.3.1 What these letters mean, in plain terms

`[NEW]` You'll see these three terms in almost every startup document, so it's worth explaining them properly instead of just using them.

- **TAM (Total Addressable Market):** If literally everyone who could ever use a product like this, used it, how big would that be? This is the biggest, most optimistic number. It answers: "How big is the whole opportunity?"
- **SAM (Serviceable Available Market):** Out of that huge TAM, how much can a company like MOTIQ *actually reach*, given real limits — like which cities have smartphone and internet access, which vehicle types MOTIQ plans to serve, and so on. This is a smaller, more realistic slice.
- **SOM (Serviceable Obtainable Market):** Out of that reachable market, how much can MOTIQ actually *win* in the next few years, given competition, budget, and how fast a company can realistically grow? This is the smallest and most honest number — it's the one that should actually guide near-term planning.

Think of it like three circles inside each other. TAM is the whole ocean. SAM is the part of the ocean near the coast where MOTIQ's boat can actually sail. SOM is how much fish MOTIQ can actually catch in the next two years with the boat it has.

### 2.3.2 Applying this to MOTIQ

`[NEW]` Let's build these three circles for MOTIQ, step by step, showing our work so the numbers can be checked and updated later.

**Step 1 — Total registered vehicles in India.**
As a starting point (a number that changes yearly and should be re-checked at the time of actual planning), India has well over 300 million registered vehicles across two-wheelers, cars, and commercial vehicles. This is the outer boundary of anyone who could ever need roadside help.

**Step 2 — TAM: How many breakdowns happen a year?**
`[V0]` The original deck's figure of "20 million+ breakdowns a year" sits here. `[NEW]` We can sanity-check this roughly: if even a small fraction — say 6-7% — of 300 million vehicles experience one roadside breakdown a year (a very rough industry-style assumption, not a confirmed number), that lands close to 20 million. So the number is *plausible* and in the right neighborhood, but it is still an estimate built on an assumption, not a measured fact. This is exactly the kind of number Section 2.6 says needs proper validation before it's used to size infrastructure (like how many servers MOTIQ needs, or how big the provider network needs to be).

So: **TAM ≈ 20 million+ breakdown events per year across India, spanning all vehicle types.** This is the whole ocean.

**Step 3 — SAM: Which slice can MOTIQ realistically serve?**
`[NEW]` MOTIQ cannot serve all 20 million breakdowns from day one. Several real limits shrink this number:

- **Smartphone and data access.** A user needs a smartphone with a working data connection to use the app. This rules out a meaningful chunk of rural and lower-income vehicle owners, at least in the early years.
- **City coverage.** MOTIQ can only serve places where it has verified providers. A national app with providers in only 5 cities has a SAM of those 5 cities, not the whole country.
- **Vehicle type focus.** As Chapter 1 flagged, "every driver" is the vision, but the actual product will likely launch supporting only some vehicle categories first (for example: cars and two-wheelers, but maybe not heavy trucks, which often have separate specialized service contracts already).

Once those three filters are applied, a realistic SAM might be something like: **urban and semi-urban car and two-wheeler owners with smartphones, in the cities MOTIQ has chosen to launch in.** In a mature, multi-city rollout, this could plausibly be in the range of a few million breakdown events per year — a small slice of the 20 million TAM. The exact number depends entirely on which cities and vehicle types MOTIQ's strategy (Chapters 9–11) chooses, so this chapter deliberately does not lock in a single figure — it hands that job to Chapter 7 (Cold-Start Strategy) and Chapter 11 (Growth Strategy).

**Step 4 — SOM: What can MOTIQ realistically win in the next 1-3 years?**
`[NEW]` This is the smallest circle, and it's shaped by competition, budget, and how fast a two-sided marketplace can realistically grow (explained more in Chapter 7). A reasonable early SOM might be a low single-digit percentage of the SAM in the first year or two of operation, growing over time as trust builds in each city. This is intentionally left as a range, not a fixed number, because it depends on decisions this handbook has not made yet.

### 2.3.3 Why this matters for engineers, not just for pitch decks

`[NEW]` This TAM/SAM/SOM exercise is not here just to look good in a slide. It directly affects real engineering decisions:

- **Database sizing (Chapter 47):** Knowing whether MOTIQ needs to handle a SOM of 50,000 jobs a year or 5 million jobs a year completely changes how the database and caching layers should be designed from day one.
- **Provider network size (Chapter 98):** SAM tells the team roughly how many verified providers are needed to have good coverage in each launch city.
- **Cost planning (Chapter 12):** Cloud costs, SMS costs, and payment-processing fees all scale with usage, so SOM estimates directly feed the cost model.

***

## 2.4 Why Do Breakdowns Happen? (Root Causes)

### 2.4.1 Why this list matters

`[NEW]` "20 million breakdowns" sounds like one big problem, but a breakdown is not one thing. A flat tyre and an engine that won't start are both "breakdowns," but they need completely different providers, completely different tools, and completely different average repair times. If MOTIQ's matching engine (Chapter 53) treats every breakdown the same way, it will send the wrong kind of provider to some jobs, which wastes time and damages trust — the exact thing the vision (Chapter 1) says MOTIQ exists to prevent.

### 2.4.2 A simple breakdown taxonomy

`[NEW]` Based on how the roadside-assistance industry generally categorizes issues (and consistent with the `ENUM` list already present in the V0 database schema — `TOW, REPAIR, FUEL, FLAT_TYRE, BATTERY_JUMP, OTHER`), here is a plain-English breakdown of common causes:

| Category | What it means in plain terms | Typical urgency | Typical provider needed |
|---|---|---|---|
| Flat tyre | A tyre has gone flat or burst | Medium — usually safe to wait a short time if pulled over safely | A tyre-repair or replacement provider |
| Battery / won't start | The car's battery is dead or the engine won't turn on | Medium | A battery jump-start or mechanic |
| Fuel-related | Ran out of fuel, or wrong fuel put in | Low urgency (running out) to high urgency (wrong fuel, which can damage the engine) | Fuel delivery, or a tow if wrong fuel |
| Mechanical failure | Something inside the engine or transmission has broken | Often high urgency, especially on a highway | A tow truck plus a full mechanic later |
| Accident-related | The vehicle is damaged from a collision | Often the highest urgency, may need emergency services too | Tow truck, and possibly the SOS/safety system from Chapter 55 |
| Electrical / other | Lights, wiring, or something not covered above | Usually lower urgency | General mechanic |

`[NEW]` This table is exactly why V0's own ML section already includes a "Service Category Classifier" model (covered properly in Chapter 83) — the very first thing the AI needs to figure out, before anything else can happen, is *which* of these categories a user's problem actually falls into, because that decision determines which providers even get considered for matching.

### 2.4.3 Patterns worth planning for

`[NEW]` A few patterns matter enough to call out here, because they affect system design later in this handbook, not just business planning:

- **Weather makes breakdowns spike together.** Heavy rain and flooding cause many breakdowns in the same city on the same day (flooded engines, stalled cars). This means MOTIQ's system needs to handle sudden bursts of demand, not just a smooth average — this is discussed properly in Chapter 121 (Load Testing).
- **Highways are different from cities.** A breakdown on a highway usually means worse phone signal, fewer nearby providers, and higher urgency. This is a direct reason Chapter 67 (Offline-First Mobile Design) is treated as a safety-critical chapter, not a nice-to-have.
- **Older vehicles break down more.** This affects which cities and vehicle segments are the highest-value early markets, feeding into Chapter 7's city-launch strategy.

***

## 2.5 Breaking Down "Trust" Into Something Measurable

### 2.5.1 The problem with "70% of users struggle to find trusted help"

`[V0]` This is one of the four headline numbers from the original deck. `[NEW]` On its own, this sentence is hard to act on. What does "struggle" mean? Struggle to find *any* provider? Struggle to know if a provider is *honest*? Struggle to know if a provider is *skilled*? Struggle to know the price *before* agreeing to it? These are four very different problems, and a good product might fix one and completely miss the other three.

### 2.5.2 Splitting "trust" into four separate, checkable questions

`[NEW]` This handbook proposes splitting the single "trust" number into four separate things that can each be measured on their own, using the research methods described in Section 2.6:

1. **Findability:** Can the user find a provider at all, quickly? (Not a trust question exactly — more a coverage question.)
2. **Identity trust:** Does the user know who is coming — a real name, a photo, a verified license — before they arrive? This is the job of Chapter 98 (Provider Verification).
3. **Price trust:** Does the user know what they will pay before they agree to the job? This is the job of Chapter 56 (Pricing Engine).
4. **Quality trust:** Does the user have any evidence (past ratings, completed job count) that this specific provider is good at the job, before they arrive? This is the job of Chapter 58 (Ratings & Trust Score).

`[NEW]` Splitting the number this way matters because it turns one vague 70% figure into four separate things Chapter 4's research can measure — for example, MOTIQ's research might discover that identity trust and price trust are the two biggest complaints, while findability is not actually a big problem in cities (because word-of-mouth mechanics are everywhere), but *is* a big problem on highways. That kind of detail changes what gets built first, and a single blended 70% number could never tell you that.

### 2.5.3 What "confidence" in the vision statement actually means now

`[NEW]` This connects directly back to Chapter 1's revised vision statement, which said MOTIQ exists so a driver never has to guess "who is coming, what it will cost, or when it will arrive." You can now see that sentence was built directly from the three trust sub-questions above (identity, price, and — through ETA — the "when" question, which Chapter 85's ETA prediction model is responsible for). This is a direct, concrete example of the traceability discipline Chapter 1 introduced: the vision statement's wording is not decorative, it is a compressed summary of exactly this section's breakdown.

***

## 2.6 Where Do These Numbers Come From, and How Do We Check Them?

### 2.6.1 Two kinds of research, explained simply

`[NEW]` There are two basic ways to gather information about a market:

- **Secondary research** means using information other people have already collected — government transport statistics, published industry reports, academic studies, news articles. It's fast and cheap, but it wasn't collected specifically for MOTIQ's questions, so it often only gets you close to the answer, not exactly the answer.
- **Primary research** means collecting the information yourself — surveys, interviews, or watching real behavior. It's slower and costs more, but it answers your exact question, asked to your exact target audience.

`[NEW]` The four headline numbers in V0's deck all read like they came from secondary research (industry reports, rough estimates) rather than primary research MOTIQ ran itself. That is completely normal for an early pitch deck. But before those numbers are used to size real infrastructure or make a real go/no-go decision on a city launch, they need to be checked with primary research — actually asking real drivers and real mechanics in the specific cities MOTIQ plans to launch in.

### 2.6.2 A simple plan for validating the four headline numbers

`[NEW]` Here is a plain-language plan for how MOTIQ should check each of the four numbers before relying on them for real decisions. The full detail of how to design and run this research belongs to Chapter 4; this is a short preview so this chapter's promise ("we will check these numbers") has an actual next step attached to it.

| Number to check | Simple way to check it | Who to ask |
|---|---|---|
| 20 million breakdowns/year | Combine government vehicle-registration data with a small survey asking "how many times did your vehicle break down on the road last year?" | A representative sample of vehicle owners, spread across vehicle age and city type |
| 60-minute average wait | Ask recent breakdown victims to recall how long they actually waited, and try to get this from more than just memory — for example, compare it against call logs from local mechanics if they'll share them | People who had a breakdown in the last 3 months (recent memory is more accurate) |
| 70% struggle to find trusted help | Use the four-question breakdown from Section 2.5.2 instead of one vague question — ask each of the four separately | Same group as above, but split the single question into four |
| 40%+ overpay due to unclear pricing | Ask what they were quoted vs. what they actually paid, and compare against a rough "fair price" benchmark from a few known garages | Same group, focused specifically on pricing experience |

### 2.6.3 A word of caution about sample size

`[NEW]` One common mistake in early-stage research is asking 20 or 30 people a question and then presenting the answer as if it applies to all of India. A small, informal survey is a fine starting point, but this chapter recommends that any number used to make a real infrastructure or budget decision should come from a properly sized sample — enough people, from enough different cities and backgrounds, that the answer is unlikely to be a fluke. The exact sample-size math (a standard statistics topic) is left to whoever runs the research in Chapter 4, but the principle matters here: **a bigger, more confident number should require a bigger, more careful survey.** A rough estimate is fine for early planning; it is not fine for a number that will decide how much money gets spent on cloud infrastructure or how many providers get hired in a new city.

### 2.6.4 Keeping this validation alive, not a one-time event

`[NEW]` It's worth saying plainly: this research should not happen once and then get treated as permanently true. Breakdown patterns change as vehicles get newer, as EVs become more common (which have completely different breakdown causes than petrol/diesel vehicles — a topic picked up again in Chapter 142's future roadmap), and as MOTIQ's own presence in a city changes what "normal" wait times even look like. Chapter 139 (Product Analytics) is where this validation becomes an ongoing, automatic process instead of a one-time research project — once MOTIQ has real users, the app itself becomes the best source of this data, better than any survey.

***

## 2.7 Chapter Summary and What Comes Next

Here is what this chapter did, in simple terms:

1. It sorted MOTIQ's five core problems into facts (easy to confirm) and feelings (need a survey) — see Section 2.2.
2. It built a simple three-circle picture of the market size — TAM, SAM, and SOM — and showed how each circle should shrink for real reasons (smartphone access, city coverage, vehicle type), not just guesswork. See Section 2.3.
3. It broke "20 million breakdowns" down into different causes (tyre, battery, fuel, mechanical, accident, other), because each cause needs a different kind of provider and a different urgency level. See Section 2.4.
4. It split the vague "70% struggle to find trusted help" into four separate, checkable questions: findability, identity trust, price trust, and quality trust. See Section 2.5.
5. It laid out a simple plan for checking all four headline numbers properly, using real research instead of just trusting the pitch-deck version. See Section 2.6.

This chapter hands off several open jobs to later chapters:

- **Chapter 4** must actually run the research plan sketched in Section 2.6.2, with a properly sized sample.
- **Chapter 6** (Unit Economics) will use the SAM/SOM numbers from Section 2.3 to build MOTIQ's financial model.
- **Chapter 7** (Cold-Start Strategy) and **Chapter 11** (Growth Strategy) must decide exactly which cities and vehicle types define MOTIQ's real SAM, since this chapter deliberately left that open.
- **Chapter 16** (User Personas) should build its personas around the four trust sub-questions from Section 2.5.2, not around one vague "trust" idea.
- **Chapter 83** (Service Category Classifier) inherits the breakdown taxonomy from Section 2.4.2 as its starting label list.

The next chapter, Chapter 3, looks outward instead of inward: it studies who MOTIQ is actually competing against — both the organized players and the informal, word-of-mouth mechanics who are MOTIQ's real, everyday competition — something the original V0 deck never addressed at all.

