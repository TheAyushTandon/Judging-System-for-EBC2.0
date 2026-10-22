# 🏆 EBC 2.0 — Real-Time Startup Judging Platform

A modern, high-performance judging platform engineered for **Enterprise Business Challenge 2.0 (EBC 2.0)**. Accommodates 5 judges evaluating 20 startups pitching sequentially with real-time cumulative scoring, individual ID badges, interactive anime.js animations, consensus tracking, automated improvement guidance, and executive PDF/CSV exports.

---

## ⚡ Quick Start

The Next.js application is already configured and running locally:

```bash
# To run locally if starting fresh:
npm install
npm run dev
```

Visit: **[http://localhost:3000](http://localhost:3000)**

---

## 👥 Distinguished Evaluation Panel (7 Judges)

| # | Judge | Role & Organization | Event Designation | Specialisation |
|---|---|---|---|---|
| **1** | **Mr. Maneesh Srivastava** | Founder, Alphavalue Consulting & Alphavalue Ventures | Panelist | Venture Capital, Advisory & Startup Incubation |
| **2** | **Mr. Amit Kumar Singla** | General Manager, Transsion India | Panelist | Global Consumer Electronics & Scale Strategy |
| **3** | **Mr. Piyush Garg** | Founder & Angel Investor, mysharedcfo | Panelist | Financial Architecture, CFO Services & Angel Funding |
| **4** | **Ms. Jyoti Tiwari** | Founder & CEO, Ingenious Workz | Panelist | Executive Leadership, Talent & Org Strategy |
| **5** | **Ms. Vaishnavi Garg** | Manager – Investment, IIML EIC | Panelist | Early-Stage Investment, Seed Capital & Due Diligence |
| **6** | **Mr. Anand Raj** | Head of Investments & Fundraising, Market Decode | Panelist | Growth Capital, Pitch Strategy & Startup Valuation |
| **7** | **Ms. Karnika Shukla** | Deputy Manager, IIML EIC | Panelist | Incubation Management, Ecosystem Partnerships & Program Execution |

---

## 🎨 Editorial Design System
- **Strict Sharp Edges**: `border-radius: 0px !important` across cards, inputs, buttons, sliders, modals, and toasts.
- **5-Color Palette**:
  - `Porcelain (#f7f7f2)`: Clean background
  - `Beige (#e4e6c3)`: Muted surfaces & badges
  - `Palm Leaf (#899878)`: Primary accent & progress fill
  - `Carbon Black (#222725)`: Bold borders & dark badges
  - `Onyx (#121113)`: Sharp contrast typography
- **Streamline Vector Icons**: Lucide line collection retrieved via Streamline MCP, providing 20 crisp vector icons for evaluation metrics and UI controls.

---

## 🚀 Key Features

### 1. 🪪 Mentor Identification Card (ID Badge UI)
- Upon logging in, mentors are greeted by an ID Card preview showcasing their **custom avatar initials**, **name**, **specialisation**, and verified **Judge • EBC 2.0** badge.
- Clicking **"Enter Judging Portal →"** smoothly transitions the mentor into the live evaluation suite.

### 2. 🎚️ 11-Metric Evaluation Matrix (Max 110 Points)
Each metric is evaluated on a continuous `0 - 10` slider (steps of `0.5`) with dedicated 3D icons, contextual guidance, and dynamic color changes (Red → Amber → Violet → Emerald Green):
1. 🎯 **Market Need** (Market size, TAM/SAM/SOM, real-world pain point)
2. ⚙️ **Feasibility** (Technical roadmap, methodology for PoC & validation)
3. 💥 **Potential Impact** (Customer demographics, reach, national importance)
4. 💡 **Novelty** (USP, intellectual property, differentiation)
5. 👥 **Team** (Technical & commercial execution capability)
6. 💰 **Fund Utilization** (Milestone-based capital allocation)
7. ➕ **Additional Parameters** (Incubator criteria, regulatory readiness)
8. 🎤 **Presentation** (Pitch clarity, communication, Q&A handling)
9. 🎯 **Target Audience** (Clarity of persona and customer segmentation)
10. 💲 **Pricing Strategy** (Business model sustainability & unit economics)
11. 🏅 **Competition & USP** (Competitive moats and market barriers)

### 3. ✏️ Misclick-Proof & Editable Scores with Audit Trail
- Judges can switch between startups at any time using the dropdown.
- Previously submitted scores automatically reload into the sliders.
- Updating scores updates the total and logs previous iterations in `editHistory` with timestamps.

### 4. 📝 Optional Remarks
- Dedicated notepad field per startup allowing judges to jot down qualitative thoughts during live pitches.
- Remarks persist alongside numerical scores and feed into the final startup report.

### 5. 🎉 Anime.js Micro-Animations & Responsive Feedback
- Staggered entry of evaluation cards.
- Floating backdrop particle system.
- Celebratory burst confetti upon successful submission.
- Real-time progress bar (`X / 20 scored`).

### 6. 📊 Real-Time Admin Cumulative Dashboard
- **Live Leaderboard**: Ranked from 1st to 20th with gold 🥇, silver 🥈, and bronze 🥉 highlights.
- **Auto-Refresh**: Live polling every 15 seconds.
- **Judge Progress Grid**: Real-time counter of pitches evaluated per judge (`X/20`).
- **Scoring Lock / Unlock**: Immediate toggle to freeze or reopen submissions.
- **Reset Scores**: One-click wipe of test or rehearsal scores with safety confirmation.
- **CSV Export**: One-click download of the complete score sheet.

### 7. 📄 Executive Startup Report & PDF Export (Admin Only)
- Accessible by clicking any startup row on the leaderboard.
- **Interactive Radar Chart**: Visual spiderweb map of all 11 metrics rendered with Chart.js.
- **Per-Metric Breakdown**: Shows individual scores from Judge 1 through Judge 5.
- **Consensus Indicator**: Automatically calculates standard deviation to flag *High Consensus* vs *Low Consensus* (divergent judge opinions).
- **Rule-Based Improvement Engine**: Tailored, actionable guidance generated for each metric based on performance tier.
- **Compilation of Judge Remarks**: Full qualitative feedback log.
- **Export PDF & Print Support**: Generates styled PDF reports formatted for startup founders and investors.

---

## 📁 Project Structure

```
├── app/
│   ├── admin/
│   │   ├── page.js                    # Admin leaderboard & judge progress
│   │   └── startup/[id]/page.js       # Startup detail report & PDF export
│   ├── api/
│   │   ├── admin/                     # Overview, lock, and reset endpoints
│   │   ├── auth/login/                # Judge & admin JWT authentication
│   │   ├── scores/                    # Submit, update, and get scores
│   │   └── startups/                  # 20 startup profiles
│   ├── judge/
│   │   └── page.js                    # Judge ID card & evaluation suite
│   ├── globals.css                    # Comprehensive custom design system
│   ├── layout.js                      # Root HTML layout & fonts
│   └── page.js                        # Login screen with particle canvas
├── data/
│   ├── judges.json                    # 5 judges + 1 admin configuration
│   ├── scores.json                    # Real-time scores and edit audit history
│   └── startups.json                  # 20 participating startups in pitch order
└── lib/
    ├── auth.js                        # JWT signing and validation
    ├── constants.js                   # Metrics, maximums, and scoring scales
    ├── data.js                        # File-backed persistence helper
    └── tips-engine.js                 # Automatic recommendations generator
```
