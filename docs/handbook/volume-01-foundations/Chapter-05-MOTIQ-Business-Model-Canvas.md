# Chapter 5 — MOTIQ Business Model Canvas

**Volume I — Foundations: Vision, Market & Business Architecture**
**Part 2 — Business Model & Economics**
**Chapter dependencies:** Builds on Chapter 1 (Vision and Mission), Chapter 2 (Market Sizing), and Chapter 3 (Competitive Landscape). This is the first chapter of Part 2.
**Note on style:** Written in plain English, same as Chapters 2–4.
**Provenance key:** `[V0]` = from the original MOTIQ pitch deck. `[NEW]` = added for this handbook. `[REVISED]` = changed from the original, with the reason explained.

***

## 5.1 Why This Chapter Exists

The engineering audit that started this whole project found something important: the original MOTIQ deck never says how MOTIQ actually makes money. It talks about "transparent pricing" from the user's side, but it never says whether MOTIQ takes a cut of each job, charges a subscription, or makes money some other way.

This matters more than it might seem, even for engineers who will never touch a pricing spreadsheet. Whether MOTIQ earns money through a commission on each job, a subscription fee, or business contracts with fleets changes how the whole system needs to be built — how payments are split (Chapter 57), what data needs to be tracked (Chapter 45), and even how the matching engine should behave (Chapter 53), since a commission-based business has different incentives than a subscription-based one.

This chapter builds MOTIQ's business model from scratch, using a simple, well-known tool called a "business model canvas." It's a way of laying out, on one page, how a business actually works — who it serves, what it offers them, how it makes money, and what it costs to run.

***

## 5.2 What a Business Model Canvas Is

`[NEW]` A business model canvas is just a simple way to answer nine questions about a business, all on one page, so you can see how the pieces connect to each other. The nine questions are:

1. Who are the customers? (**Customer Segments**)
2. What do we offer them? (**Value Propositions**)
3. How do we reach them? (**Channels**)
4. How do we build a relationship with them? (**Customer Relationships**)
5. How do we make money? (**Revenue Streams**)
6. What do we need to make this work? (**Key Resources**)
7. What do we actually have to do, day to day? (**Key Activities**)
8. Who do we need to work with? (**Key Partnerships**)
9. What does it cost to run? (**Cost Structure**)

This chapter's job, per the frozen table of contents, is to focus specifically on five of these nine questions — Revenue Streams, Cost Structure, Key Partnerships, Channels, and Customer Relationships — since Customer Segments and Value Propositions were already substantially covered in Chapters 1 and 2 (the personas and the problem MOTIQ solves), and Key Resources and Key Activities will be covered properly once the architecture volumes (III onward) define what MOTIQ actually needs to build and run.

***

## 5.3 Who Pays MOTIQ, and How? (Revenue Streams)

### 5.3.1 The core question this section answers

`[NEW]` MOTIQ is what's called a two-sided marketplace — it has drivers on one side and service providers on the other. A two-sided marketplace usually has to decide: does it charge the driver, the provider, both, or neither directly (and instead make money some other way, like advertising)? This decision shapes almost everything downstream.

### 5.3.2 Revenue stream 1 — Commission on completed jobs

`[NEW]` This is the most natural fit for MOTIQ, and the one this handbook recommends as the primary revenue stream. Here's how it works in plain terms: when a provider completes a job through MOTIQ, MOTIQ keeps a percentage of the payment, and the rest goes to the provider.

**Why this fits MOTIQ well:** It only earns money when it actually delivers value — a completed job. It doesn't require charging the driver anything extra upfront, which is important, because Chapter 3 found that MOTIQ's biggest competitor (the informal mechanic network) doesn't charge any middleman fee at all, so adding a separate visible fee on top of the provider's price could push users back toward that informal network.

**The open question this hands to Chapter 6:** What percentage should MOTIQ actually keep? Too high, and providers won't want to join (Chapter 4's provider research is meant to help answer this). Too low, and the business can't cover its costs (covered later in Section 5.6 of this chapter, and in full detail in Chapter 6).

### 5.3.3 Revenue stream 2 — Subscription plans

`[NEW]` A second possible revenue stream is a subscription — a driver pays a fixed amount, say, once a year, and in exchange gets some benefit, like a lower price per job, priority matching (getting matched faster than non-subscribers), or a certain number of free basic services (like one free battery jump-start a year).

**Why this could work alongside commission, not instead of it:** A subscription plan works especially well for frequent users — someone who drives an older car and expects to need help more than once a year might happily pay upfront for peace of mind. This is a common pattern in other Indian consumer apps, where a base free/pay-per-use service exists alongside an optional paid membership tier for people who use the service often.

**Why this probably shouldn't be MOTIQ's first revenue stream:** A subscription only makes sense once MOTIQ already has enough trust and enough proven reliability that someone is willing to pay in advance for a service they haven't tried yet, or have only tried once. Early on, before that trust is built, commission-per-job is a much easier sell, because the user only pays when they actually get helped.

### 5.3.4 Revenue stream 3 — B2B fleet and business contracts

`[NEW]` A third revenue stream is selling directly to businesses that operate many vehicles at once — delivery companies, logistics firms, cab fleets, or even corporate offices with company cars. Instead of individual drivers paying per job or per subscription, a business signs a contract covering all of its vehicles.

**Why this is attractive:** A single fleet contract can be worth far more than many individual users, and it's a more predictable, stable source of income, since a business is unlikely to churn (stop using the service) as easily as an individual driver might. It also gives MOTIQ steady, guaranteed job volume in a city, which helps providers stay active and engaged (a topic Chapter 7's cold-start strategy cares about a lot).

**Why this probably comes later, not first:** Selling to businesses usually requires a dedicated sales process, contracts, and a proven track record MOTIQ won't have on day one. It's a strong second or third-year opportunity, not a launch-day one.

### 5.3.5 Putting the three streams together

`[NEW]` This handbook recommends MOTIQ think of these three revenue streams as three different stages of growth, not three things to launch simultaneously:

| Stage | Primary revenue stream | Why |
|---|---|---|
| Launch (first cities) | Commission per completed job | Lowest barrier — user only pays when actually helped |
| Growth (proven trust, repeat users) | Commission + optional subscription | Rewards MOTIQ's most loyal, frequent users |
| Maturity (established brand) | Commission + subscription + B2B fleet contracts | Adds a stable, high-value revenue source on top |

***

## 5.4 What MOTIQ Costs to Run (Cost Structure)

### 5.4.1 Why this belongs in an engineering handbook

`[NEW]` It might seem like cost structure is purely a business topic, but many of MOTIQ's biggest costs are direct results of engineering decisions covered later in this handbook — which cloud provider is chosen (Chapter 101), how much is spent on AI model usage (Chapter 90's chatbot, Chapter 84's matching model), and how much is spent on SMS and maps API calls (Chapter 32). Naming the cost categories here gives Chapter 12 (Cost Estimation) a clear structure to put real numbers against later.

### 5.4.2 The main cost categories

`[NEW]` In plain terms, MOTIQ's costs fall into a few clear buckets:

- **Technology and infrastructure costs.** Cloud hosting, databases, the mapping API, SMS and push notification services, and — a cost that's easy to underestimate — AI/ML costs, since the chatbot (Chapter 90) and matching model (Chapter 84) both cost money every time they're used, not just once when they're built.
- **Provider payouts.** The largest share of money moving through MOTIQ isn't MOTIQ's revenue at all — it's the portion of each job's payment that goes to the provider. This isn't a "cost" in the traditional sense (it's not spent by MOTIQ, it passes through MOTIQ), but it needs careful tracking, since Chapter 57's payment system has to get this split right, reliably, every single time.
- **Trust and safety costs.** Verifying providers (Chapter 98) costs real money and time — background checks, document verification, and ongoing re-checks all have a cost per provider, which adds up as the provider network grows.
- **Customer support costs.** Handling problems, disputes, and questions — whether through human support staff or the AI assistant (Chapter 90) — costs money, and tends to be highest early on, before common problems have been identified and fixed.
- **Marketing and growth costs.** The cost of getting new drivers and new providers to try MOTIQ in the first place, especially important during the "cold start" period discussed in Chapter 7.
- **People costs.** Salaries for the team building and running MOTIQ — obviously a major cost, though the specific team plan is left to Chapter 10 (Stakeholder & Team Operating Model).

### 5.4.3 Why some of these costs scale with usage, and some don't

`[NEW]` It's worth pointing out a distinction that matters a lot for planning: some costs go up automatically as MOTIQ grows (cloud hosting, AI usage, SMS costs, provider payouts) — these are called **variable costs**, because they vary directly with how much MOTIQ is used. Others stay roughly the same no matter how many jobs happen (most salaries, for example) — these are called **fixed costs**. A healthy business needs its revenue per job (from Section 5.3) to comfortably cover its variable cost per job, with enough left over to eventually cover the fixed costs too. This exact math is the job of Chapter 6 (Unit Economics) — this chapter's job is just to make sure every real cost category has been named, so nothing gets left out of that math by accident.

***

## 5.5 Who MOTIQ Needs to Work With (Key Partnerships)

### 5.5.1 Why partnerships matter beyond just "nice to have"

`[NEW]` Some things MOTIQ needs are not things MOTIQ should try to build itself — they're better handled by partnering with someone who already does that one thing well. Getting this list right early avoids wasted engineering effort later on something that was never MOTIQ's core strength to begin with.

### 5.5.2 The main partnership categories

`[NEW]` Based on what this handbook has covered so far, plus the tech stack already named in the original V0 deck, MOTIQ's key partnerships fall into a few groups:

- **Technology partners.** These are the companies whose tools MOTIQ's engineering depends on directly — the maps provider (for location and routing), the payment gateway (for handling money securely), the cloud provider (for hosting everything), and the SMS/communication provider (for notifications). These are covered properly in Chapter 32 (Third-Party Integration Architecture), but they belong here too, because a broken relationship with any one of them — a price increase, a policy change, an outage — is a real business risk, not just a technical one.
- **Insurance partners.** Chapter 3 identified insurance companies as one of MOTIQ's organized competitors. But the same companies could also become partners instead of competitors — for example, an insurer might offer MOTIQ as their roadside-assistance provider, instead of running their own slow, manually-dispatched service. This turns a competitor into a source of guaranteed customers.
- **Vehicle manufacturer (OEM) partners.** Similarly, Chapter 3 identified car manufacturers as competitors through their own roadside programs. A newer or smaller car brand without the budget to build its own program might prefer to partner with MOTIQ instead of building one from scratch.
- **Local provider associations.** In many areas, local mechanics or tow operators may already be loosely organized into associations or groups. Partnering with these groups, rather than trying to recruit every single mechanic one at a time, could speed up the provider-onboarding process significantly — a topic directly relevant to Chapter 7's cold-start strategy.
- **Government and regulatory bodies.** Given the legal and compliance topics covered later in this handbook (Volume XII, especially Chapter 126's data-protection law compliance and Chapter 130's gig-worker classification questions), MOTIQ will likely need a working relationship with relevant government bodies, not just a one-time compliance checklist.

***

## 5.6 How MOTIQ Reaches People (Channels)

### 5.6.1 What "channels" means here

`[NEW]` A channel, in this context, is simply any path through which MOTIQ reaches a new driver or a new provider — how they first hear about MOTIQ, and how they actually download and start using it.

### 5.6.2 Channels for reaching drivers

`[NEW]` A few realistic channels for MOTIQ to reach drivers, based on what similar Indian consumer apps commonly use:

- **App store presence and search.** Someone searching for "roadside assistance" or "car breakdown help" in an app store or search engine should be able to find MOTIQ.
- **Partnerships (as covered in Section 5.5).** An insurance company or car manufacturer that partners with MOTIQ effectively becomes a channel too, introducing MOTIQ to their existing customers.
- **Word of mouth after a good experience.** Given that Chapter 3 found personal trust to be the informal network's biggest strength, MOTIQ's own word-of-mouth reputation — one good experience leading a driver to recommend it to family or friends — may end up being one of its most powerful channels, especially since it's free and directly reinforces the trust message from Chapter 1's vision.
- **Highway and travel-focused placement.** Since Chapter 3 identified travelers and highway drivers as MOTIQ's best early audience, real-world visibility in those specific situations — for example, at fuel stations, toll booths, or through travel-related apps — could be a more efficient channel than general advertising.

### 5.6.3 Channels for reaching providers

`[NEW]` Reaching providers needs a different approach than reaching drivers, because providers are being asked to change how they get work, not just try a new convenience:

- **Direct outreach in each launch city**, likely a hands-on, one-by-one process early on, especially before MOTIQ has enough of a reputation for providers to seek it out themselves.
- **Local provider associations**, as mentioned in Section 5.5.2, as a faster way to reach many providers through one relationship.
- **Referrals from existing providers**, once MOTIQ has a base of happy, active providers in a city — similar to word of mouth on the driver side, this becomes cheaper and more effective the longer MOTIQ operates successfully in a place.

***

## 5.7 How MOTIQ Builds a Relationship With Its Users (Customer Relationships)

### 5.7.1 Why this is a separate question from "channels"

`[NEW]` Channels are about how someone first finds MOTIQ. Customer relationships are about what happens after that — how MOTIQ keeps someone using it, feeling good about it, and coming back.

### 5.7.2 The relationship MOTIQ needs with drivers

`[NEW]` Given everything found so far in this handbook, the driver relationship should center on **earned trust through consistent, predictable experiences** — this connects directly back to Chapter 1's vision statement about never having to guess who's coming, what it costs, or when it will arrive. In practical terms, this means:

- Being honest and clear even when something goes wrong (for example, when no provider is available — a scenario Chapter 135 in the UX volume will design for directly), rather than hiding problems.
- Making the app helpful even outside of a breakdown moment — for example, the AI assistant (Chapter 90) or the user dashboard (Chapter 60) giving useful information, not just sitting unused between emergencies.
- Following up after a completed job (through the ratings system in Chapter 58) so the relationship feels ongoing, not just transactional.

### 5.7.3 The relationship MOTIQ needs with providers

`[NEW]` The provider relationship needs to be built on **fairness and reliability**, since Section 5.4.2 already identified provider trust and payment reliability as major concerns. In practical terms:

- Paying providers promptly and predictably (Chapter 57).
- Being transparent about how jobs are assigned, so providers don't feel like an unclear, unfair algorithm is deciding who gets work (a concern already flagged in Chapter 84's discussion of explainability for the matching model).
- Giving providers a way to grow — more jobs, better ratings leading to better visibility — rather than treating them as interchangeable.

***

## 5.8 Chapter Summary and What Comes Next

In plain terms, here's what this chapter built:

1. **Three possible revenue streams** — commission per job (the natural starting point), subscriptions (a strong second stage for loyal users), and B2B fleet contracts (a strong later-stage opportunity) — recommended as three stages of growth rather than three things to launch all at once. See Section 5.3.
2. **A full list of MOTIQ's real cost categories** — technology, provider payouts, trust and safety, support, marketing, and people — split into costs that grow with usage and costs that don't, setting up Chapter 6's detailed math. See Section 5.4.
3. **Key partnerships** MOTIQ will likely depend on — technology vendors, insurance companies, vehicle manufacturers, local provider associations, and government bodies — some of which are former "competitors" from Chapter 3 that could become partners instead. See Section 5.5.
4. **Realistic channels** for reaching both drivers and providers, with word of mouth and highway/travel visibility called out as especially strong fits given Chapter 3's findings. See Section 5.6.
5. **What kind of relationship** MOTIQ needs to build with each side of the marketplace — trust through consistency for drivers, fairness and reliability for providers. See Section 5.7.

This chapter hands off several jobs to later chapters:

- **Chapter 6** (Unit Economics) must turn Section 5.3's revenue streams and Section 5.4's cost categories into real numbers and a real commission-rate decision.
- **Chapter 7** (Cold-Start Strategy) should use Section 5.6.3's provider-channel ideas when planning how to build the first city's provider network.
- **Chapter 32** (Third-Party Integration Architecture) should treat Section 5.5.2's technology partners as business-critical relationships, not just API integrations.
- **Chapter 57** (Payment Processing) and **Chapter 58** (Ratings & Trust Score) both inherit direct obligations from Section 5.7.3's provider-fairness commitments.

The next chapter, Chapter 6, takes the revenue streams and cost categories named here and turns them into real numbers — MOTIQ's actual unit economics, including what a fair commission rate might look like and what it would take for a single completed job to be profitable.

