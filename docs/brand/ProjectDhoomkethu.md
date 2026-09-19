# Project Dhoomkethu: The Trailblazer
### The Core Operational & Economic Blueprint for [Wriksh](https://www.wriksh.com)
*“From one seed, to a forest. Practice Indian living traditions — practiced, not just visited.”*

---

## 1. Executive Summary & Philosophy

**Project Dhoomkethu** (धूमकेतु — *The Trailblazer / Comet*) is the operational heartbeat and growth engine of **[Wriksh](https://www.wriksh.com)**. It defines how Wriksh scouts uncharted cultural terrain, connects directly with authentic grassroots practitioners across India's 36 states and union territories, turns rare living heritage into commercially viable cultural experiences, and channels economic value back into artisan and student communities.

### The Core Thesis: The Channel-of-Energy
Wriksh does not treat culture as passive tourism or static museum exhibits. The platform operates on a three-phase virtuous cycle called the **Channel-of-Energy**:

$$\text{DISCOVER} \xrightarrow{\quad\text{Scout \& Verify}\quad} \text{EXPERIENCE} \xrightarrow{\quad\text{Deepen \& Sustain}\quad} \text{LEARN}$$

```
                ┌────────────────────────────────────────────────────────┐
                │             1. DISCOVER (The Seed & Root)             │
                │  • State Catalogue of 36 States & UTs                 │
                │  • Inbound Inquiries, Social Ads & Gov Tenders        │
                │  • Direct Artist Scouting & Field Verification         │
                │  • Zero Profit Margin (100% returned to community)    │
                └───────────────────────────┬────────────────────────────┘
                                            │
                                  Trailblazer Scout
                                            │
                                            ▼
                ┌────────────────────────────────────────────────────────┐
                │             2. EXPERIENCE (The Trunk & Canopy)         │
                │  • The Commercial Profit Engine of Wriksh              │
                │  • Curated 1-to-7 Day Immersions (Craft, Food, Nature) │
                │  • Tiered Offerings: Mass, Medium & Premium            │
                │  • Influencer Seeding (100% promo codes) + Paid Scale  │
                │  • Exemplar: Wriksh Goa Day Trip (Arambol)             │
                └───────────────────────────┬────────────────────────────┘
                                            │
                                   Gateway to Mastery
                                            │
                                            ▼
                ┌────────────────────────────────────────────────────────┐
                │              3. LEARN (The Fruit & Forest)             │
                │  • 200-Hr Residential TTCs & Guru-Shishya Residencies  │
                │  • CSR & Corporate Sponsorships for Underprivileged    │
                │  • Exemplar: Shiva Yoga 21-Day TTC (Arambol)          │
                │  • Lineage Preservation & Generational Handover        │
                └────────────────────────────────────────────────────────┘
```

1. **Discover (Top of Funnel · Ground Truth)**: Catalysing cultural bookings, state-by-state mapping, and responding to inquiries. Discover fees flow directly back into the artist communities without extraction.
2. **Experience (The Middle Path · Economic Engine)**: The commercial powerhouse where Wriksh charges brand premiums for rare, unforgettable cultural immersions. This cross-subsidizes cultural preservation.
3. **Learn (The Summit · Cultural Preservation)**: Immersive, long-term mastery (TTCs, residencies, masterclasses) backed by CSR funding to sustain traditions across generations.

---

## 2. Pillar I: Discover (Mapping India's Living Heritage)

> *“We catalogue all possible traditions and cultural bookings state-by-state from across India, personally connecting with the masters who keep them alive.”*

### 2.1 State-by-State Living Catalogue
- **Scope**: Systematic mapping across all 36 States and Union Territories (28 States, 8 UTs) covering performing arts (dance, music, theatre, puppetry), arts & crafts, martial arts, culinary knowledge, and regional sacred rituals.
- **Reference Benchmarks**:
  - **Goa Catalogue** ([wriksh.com/states/goa](https://www.wriksh.com/states/goa)): Showcasing the dual calendar of Konkani harvest and Catholic feast days, Kaavi mural art, Kunbi textile weaving, Shigmo festivals, and traditional akhara/kushti arts.
  - **Karnataka Reference** ([wriksh.com/states/karnataka](https://www.wriksh.com/states/karnataka)): Showcasing Yakshagana, Dollu Kunitha, Veeragase, Pata Kunitha, and Bidriware.
- **Digital Asset Generation**: State PDF catalogues generated on demand using `@react-pdf/renderer` in `wriksh-ops` (`/cataloguing`) for institutional pitches, tourism boards, and government tender submissions.

### 2.2 Demand Generation & Inbound Acquisition
- **Social Performance Ads & Short-Form Video**: Targeted Instagram Reels, Meta Ads, and cultural storytelling showcasing rare arts in action (e.g., Veerabhadra Kunitha fire dances, Kaavi painting time-lapses).
- **Government & Institutional Tenders**: Systematic tracking of Ministry of Culture, Sangeet Natak Akademi, Zonal Cultural Centres, and State Tourism department tenders via the `tenders` database (`/discover-artists` console).
- **Direct Client Inquiries**: On-site inquiry forms and WhatsApp routing (`+91 95272 06903`) connecting prospective buyers, corporate event organizers, and cultural patrons directly to the team.

### 2.3 The Ground-Truth Discovery SOP
1. **Inquiry Received**: User requests an art form or artist booking for an event, private celebration, or institutional festival.
2. **Matching & Scoring**: Querying `lib/matching/score.ts` on the `discover_artists` MongoDB collection based on three normalized signals:
   - **Art Form Overlap**: Exact sub-discipline match.
   - **Price Normalization**: Client budget vs. artist quotation.
   - **Distance Score**: Haversine distance from event coordinates.
   - **Reputation & Past Rating**: Historical performance ratings (0–5).
3. **Direct Scout Visit**: For new art forms, a Wriksh scout physically travels to the practitioner’s village or home settlement rather than working through aggregators or middlemen.
4. **Verification & Direct Onboarding**: Direct verification of artist lineage, standard pricing, logistics needs, and mutual trust. Stored in MongoDB with geographic coordinates, verified notes, and direct contact details.
5. **Reinvestment Mandate**: Discover bookings operate at cost. 100% of performance fees flow directly to the artist troupe, creating unbreakable trust with the master community.

---

## 3. Pillar II: Experience (The Economic Core & Middle Path)

> *“Experience is where we make money. Discover and Learn money go right back into the system. Experience can be premium. We charge for Wriksh-branded, world-class experiences.”*

Experience is the **commercial middle path**: a traveler who joins an experience discovers the authentic culture of the soil, and a fraction of those travelers eventually commit to deep learning under the masters.

```
       [ Discover: Casual Viewer ] 
                   │
                   ▼
     [ Experience: Curated Immersion ]  <──  High Margin & Brand Value
                   │
                   ▼
        [ Learn: Lifelong Student ]
```

### 3.1 Anatomy of a Wriksh Experience
When a region is unlocked via Discover, Wriksh designs 1 to 7 multi-dimensional day-trips and immersions that weave together art, craft, nature, food, and community lore.

**Exemplar: Wriksh Goa Day Trip** ([wriksh.com/experiences/wriksh-goa-day-trip](https://www.wriksh.com/experiences/wriksh-goa-day-trip))
- **Location**: Arambol, North Goa.
- **Duration**: 1 Full Day (09:00 to 18:45).
- **The Journey**:
  - `09:00 – 10:00`: Gentle morning yoga and pranayama session.
  - `10:00 – 11:00`: Traditional vegetarian breakfast & community circle.
  - `11:00 – 13:00`: Hands-on Ganpati idol sculpting with a local master using eco-friendly red clay.
  - `13:00 – 14:00`: Home-style traditional Goan lunch.
  - `14:00 – 15:00`: Guided exploration of the village Ravalnath Temple (Goan folk deity history & Kaavi art lore).
  - `15:00 – 17:00`: Sweet-water lake visit and medicinal mud bath.
  - `17:00 – 18:45`: Sunset wind-down, tea, and reflective closing circle.
- **Key Inclusions**: Yoga master, artisan workshop & raw clay, all meals, local transport between stops, temple guide.
- **Ethical Code**: Strict 24-hour cancellation policy, physical respect for living traditions, verified local guides.

### 3.2 Tiered Experience Architecture
To maximize both reach and profitability, experiences are layered into three distinct tiers:

| Tier | Format | Target Audience | Pricing Structure | Margin Profile |
|---|---|---|---|---|
| **Tier 1: Mass** | Open workshops, single-session craft demos, festival day-passes | Backpackers, local walk-ins, students | ₹500 – ₹1,200 / person | Break-even / Volume lead-gen |
| **Tier 2: Medium** | Full-day curated itineraries, transport & food included (e.g. Goa Day Trip) | Discerning travelers, couples, boutique small groups | ₹2,000 – ₹4,500 / person | 40% – 50% gross margin |
| **Tier 3: Premium** | Multi-day private retreats, heritage villa stays, master-led VIP cohorts | High-net-worth cultural tourists, corporates, international seekers | ₹15,000 – ₹60,000+ / person | 60%+ gross margin |

### 3.3 The Creator & Influencer Launch Flywheel
1. **Pre-Launch Invite**: For every newly curated experience, Wriksh partners with 1 to 3 culturally aligned content creators and photographers.
2. **100% Coupon Seeding**: Influencers receive 100% complimentary access in exchange for raw footage, authentic reels, and long-form narrative content.
3. **Asset Ingestion**: All media is uploaded directly to Vercel Blob and catalogued in the `media_assets` collection (`/library`).
4. **Paid Amplification**: High-performing creator content is turned into Meta / Instagram ad campaigns targeting cultural travelers, yoga practitioners, and heritage enthusiasts.
5. **Dynamic Pricing Escalation**: Experiences launch with introductory early-bird pricing (e.g., ₹2,000 with 50% off comparison tag) and step up toward premium pricing as reviews and demand compound.

---

## 4. Pillar III: Learn (Mastery, TTCs & CSR Sponsorships)

> *“After the experience comes the practice. We connect seekers with authentic masters for long-term residential courses, and unlock CSR capital so economic barriers never silence a tradition.”*

Learn is the summit of Wriksh. It ensures that ancient lineages do not die with aging masters by turning passionate visitors into certified practitioners, teachers, and patrons.

### 4.1 Residential Teacher Training Courses (TTCs) & Apprenticeships
- **The Residential Principle**: A residential course is not a vacation; living, eating, and breathing practice with resident teachers creates genuine transformation.
- **Exemplar: Shiva Yoga 21-Day Residential TTC** ([wriksh.com/learn/shiva-yoga-21-day-ttc-goa](https://www.wriksh.com/learn/shiva-yoga-21-day-ttc-goa)):
  - **Focus**: Traditional Hatha–Ashtanga Yoga Teacher Training Course (Yoga Alliance RYS-200 registered).
  - **Location**: Arambol Shala, Goa.
  - **Cadence**: 21 Days / 20 Nights residential with 05:30 to 19:30 daily discipline (Asana, Pranayama, Meditation, Anatomy, Philosophy, Teaching Practicum).
  - **Tuition**: ₹35,000 / student including shared accommodation and three sattvic vegetarian meals daily.
  - **Cohort Size**: Intimate groups capped at 12–20 students.
- **Expansion to Other Disciplines**:
  - *Karnataka*: Yakshagana Tala-Maddale & Bhagavata vocal apprenticeships.
  - *Kerala*: Kalaripayattu residential martial arts training (Meippayattu, Vadiveesal).
  - *Goa*: Kaavi mural painting and Kunbi weaving masterclasses.

### 4.2 CSR & Philanthropic Sponsorship Engine
- **The Problem**: Rare arts struggle because young apprentices cannot afford years of unpaid training, and masters cannot teach without income.
- **The Solution**: Wriksh structures verified corporate CSR proposals under Schedule VII of the Indian Companies Act (Protection of national heritage, art, and culture).
- **Mechanism**:
  1. Wriksh identifies underprivileged students with proven commitment to an art form.
  2. Corporate CSR funds and cultural grants sponsor full-tuition stipends and living costs.
  3. The master receives steady, dignified instructional compensation.
  4. The student commits to an apprenticeship and community teaching milestones.

---

## 5. The Dhoomkethu Trailblazer SOP (Step-by-Step Flow)

The step-by-step lifecycle from cold inquiry to scaled cultural enterprise:

```
[ Step 1: Inbound Inquiry ]
       │  Receive art form or event request via Web / WhatsApp / Tender
       ▼
[ Step 2: Scout & Vetting ]
       │  Match via algorithm, filter local masters, physical site visit
       ▼
[ Step 3: Fulfill & Establish Trust ]
       │  Deliver the Discover event; 100% artist fee passed through
       ▼
[ Step 4: Co-Curate Experience ]
       │  Walk the ground with the master; design 1-7 day local immersion
       ▼
[ Step 5: Test & Self-Experience ]
       │  The Wriksh team participates in the experience first-hand
       ▼
[ Step 6: Creator / Influencer Drop ]
       │  Host creators with 100% coupon; capture high-definition media
       ▼
[ Step 7: Commercial Ad Scale ]
       │  Run performance campaigns; activate tiered pricing
       ▼
[ Step 8: Deepen into Learn ]
       │  Establish 21-day TTC or apprenticeship; pitch CSR sponsors
```

### Detailed Execution Steps:
1. **Step 1 — Inbound Inquiry or Tender Signal**: An inquiry arrives via `wriksh.com` forms, WhatsApp gateway, or state tender alert.
2. **Step 2 — Algorithmic Match & Filter**: Run `matchArtists()` against `discover_artists` in MongoDB to evaluate art form, proximity, and price point.
3. **Step 3 — Trailblazer Scout Visit**: A core team member travels to the artist's native village. Inspect authenticity, instruments, costumes, travel readiness, and safety.
4. **Step 4 — Fulfill Discover Booking**: Client pays quotation + advance. Booking is fulfilled with complete logistical support. Artist receives full payment.
5. **Step 5 — Experience Design**: Leverage the newly forged relationship with the master to explore native ecology, cuisine, and folklore. Map out a day trip or retreat.
6. **Step 6 — First-Hand Validation ("Walk the Soil")**: The Wriksh team executes the full itinerary personally to ensure quality, timing, safety, and hospitality.
7. **Step 7 — Creator Collab & Content Harvesting**: Invite culturally aligned creators (using coupon code `TRAILBLAZER100`) to document the pilot edition.
8. **Step 8 — Media Library Ingestion & Marketing Calendar**: Tag assets into `wriksh-ops` (`/library`) and schedule multi-week campaigns in `/marketing`.
9. **Step 9 — Paid Scaling & Dynamic Pricing**: Launch public booking on `wriksh.com/experiences`. Scale ads, stepping pricing from early-bird to premium.
10. **Step 10 — Learn Host & CSR Pipeline**: Convert master's school into a listed Learn Host (`/learn-hosts`). Structure multi-week curriculum, opening doors for CSR student sponsorship.

---

## 6. Operations Console Integration (`wriksh-ops`)

All aspects of Project Dhoomkethu are instrumented inside the **`wriksh-ops`** console:

| Dhoomkethu Function | Ops Path | Backing MongoDB Collection | Key Automation / Tool |
|---|---|---|---|
| **State Heritage Pipeline** | `/cataloguing` | `states`, `traditions`, `festivals`, `catalogue_overrides` | `@react-pdf/renderer` state PDF engine |
| **Chronology & Campaigns** | `/marketing` | `marketing_events` | Multi-category calendar (Posts, Meetings, Ads, Experiences) |
| **Daily Ops Digest** | `/discord` | `discord_channels`, `cron_jobs` | `wrikshbot` Discord bot + 08:00 IST daily automated cron |
| **Financial Ledger** | `/finance` | `finance_transactions` | CSV import, Razorpay tracking, Income/Expense KPI tiles |
| **Artist Matching & Tenders** | `/discover-artists` | `discover_artists`, `tenders` | Haversine + Budget + Rating scoring engine (`score.ts`) |
| **Experience Curators** | `/experience-guides` | `experience_guides` | Vetted local guides, language fluencies & ratings |
| **Apprenticeships & TTCs** | `/learn-hosts` | `learn_hosts` | TTCs, CSR sponsorship tracking & apprenticeship rosters |
| **Media & Operating Docs** | `/library` | `media_assets` + Git repo `docs/**.md` | Vercel Blob CDN + BM25-lite full-text search index |
| **Executive Console** | `/` | Aggregated from all collections | Live MongoDB KPIs & Karnataka reference spotlight |

---

## 7. Metrics, Unit Economics & KPI Milestones

### 7.1 Financial Model & Unit Economics
- **Discover**: 
  - Revenue Model: Pass-through (0% platform fee on artist performance). Minimal concierge service fee if corporate/institutional tender.
  - Strategic Value: Zero customer acquisition cost (CAC) for new artist relationships and native content.
- **Experience**:
  - Revenue Model: Direct ticket sales (B2C & B2B private bookings).
  - Target Contribution Margin: **40% to 65%** per experience ticket.
  - Cost Goods Sold (COGS): Host stipend, local meal, materials, guide fee, local transit.
- **Learn**:
  - Revenue Model: Course tuition (e.g., ₹35,000 / seat) + Corporate CSR grants (e.g., ₹2,00,000 – ₹10,00,000 / annual student cohort).
  - Target Margin: **25% to 35%**, with bulk invested into residency facilities and teacher honorariums.

### 7.2 Core Operational KPIs
1. **Catalogued Coverage**: Number of states with $\ge 10$ verified traditions and $\ge 1$ published experience (Target: 10 states by Q4).
2. **Scout Conversion Rate**: Percentage of Discover inquiries that yield a permanent Experience listing within 60 days (Target: $\ge 40\%$).
3. **Experience Gross Margin**: Blended gross margin across all active experiences (Target: $\ge 50\%$).
4. **Creator Engagement ROI**: Revenue generated from Meta ad creative sourced from creator pilot runs vs. cost of complimentary seats (Target: $\ge 4.5\times$ ROAS).
5. **Learn Enrollment & Sponsorships**: Total student days enrolled in residential courses + CSR funding unlocked for master traditions (Target: ₹15L+ CSR sponsored in Year 1).

---

*“A seed does not choose where it falls. It simply begins with whatever it has. From one seed, to a forest.”*
**WRIKSH · Project Dhoomkethu**
Website: [wriksh.com](https://www.wriksh.com) · Ops Console: [localhost:3000](http://localhost:3000) · Contact: [connect@wriksh.com](mailto:connect@wriksh.com)

