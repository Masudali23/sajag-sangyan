# Sajag: understand before you act

**SANGYAN Investor Resilience Hackathon · Team FirstBest (Anshuman Biswal, Masud Ali)**

**Tracks:** **Track C: Investor Education for Bharat** and **Track E: Misinformation & Financial Content Literacy**

| | |
|---|---|
| Live website | https://sajag-ashen.vercel.app |
| Android app (APK 2.0, Android 7.0+) | https://sajag-ashen.vercel.app/downloads/Sajag-Android-Debug.apk · also in [`deliverables/`](deliverables/) |
| Demo video (4 min 30 s) | [`deliverables/Sajag-Prototype-Demo.mp4`](deliverables/Sajag-Prototype-Demo.mp4) |
| Presentation (12 slides) | [`deliverables/Sajag-SANGYAN-Pitch.pptx`](deliverables/Sajag-SANGYAN-Pitch.pptx) |
| Solution overview | [`deliverables/SOLUTION-OVERVIEW.txt`](deliverables/SOLUTION-OVERVIEW.txt) |

Sajag helps first-time investors understand a financial message before acting on it. Paste, share or speak a forwarded message. Sajag checks it on the device, quotes the exact words that raise concern, says whether the message reads as promotion or education, explains what evidence is missing, and links the relevant SEBI, RBI and government guidance. It never gives a fake "safe" verdict. Every warning then leads to a short lesson, a fictional scam story or a money simulator, in English, Hindi or Bengali.

---

## 1. The problem

A confident forward arrives in a family group: *"Har mahine 8% pakka return. Join our VIP group today; only 5 places left."* First-time investors in Tier-2 and Tier-3 cities often cannot tell education from promotion, or a confident claim from an evidence-backed one. The usual answer is a simplistic true/false label, which does not help with the next message. Financial terms (NAV, risk, diversification, volatility, compounding, fees, nomination) are explained for people who already understand them, mostly in English.

**Who we built for:** first-time investors in Tier-2/3 cities, families who receive forwarded offers, regional-language users (Hindi and Bengali), and people who prefer listening to reading.

## 2. Our solution

One connected journey:

```
Message → purpose & quoted warning signs → evidence & gaps → official guidance → everyday analogy → short quiz → fictional consequence
```

1. **Check a message.** Paste, type, share (Android/PWA) or speak it. The first check runs on the device without internet.
2. **Understand the warning.** Each warning quotes the exact words, explains the pattern, lists the evidence gaps and links official guidance. Results are *Potential*, *Strong* or *Not enough evidence*, never "safe".
3. **Learn the idea behind it.** Lessons, scam stories and simulators turn the warning into understanding.

## 3. How Sajag fits the tracks

### Track E: Misinformation & Financial Content Literacy
| Suggested direction | What Sajag does |
|---|---|
| **Claim evidence-checker** | Quotes the exact words behind each warning, shows *Evidence & gaps* (who guarantees a return, on what conditions, at what cost), links relevant SEBI/RBI/government guidance and states uncertainty honestly. It is not a binary verdict. |
| **Promotion vs education classifier** | Every result carries a purpose label (*Promotional cues*, *Explanatory wording*, *Education + promotion* or *Purpose unclear*) with the words that led to it. |

### Track C: Investor Education for Bharat
| Suggested direction | What Sajag does |
|---|---|
| **Voice-first explainer** | 15 lessons in English, Hindi and Bengali with everyday analogies (for example, a farmer cannot promise the weather), takeaways and a quiz. 7 lessons cover the terms named in the brief (risk, diversification, volatility, compounding, fees, NAV, nomination), and 8 explain common scams (digital arrest, KYC/bill links, UPI PIN and QR tricks, task jobs, fake trading apps, advance fees, online-friend investments, what to do after fraud). **Listen** reads lessons and results aloud; **Speak it** turns speech into editable text. |
| **Consequence simulator** | 4 interactive fictional scam stories ("digital arrest" call, part-time "like" job, VIP stock-tips group, cashback QR code), where each choice reveals the tactic and a safer reply. The money simulator uses fictional tokens: a 20% fall turns 10,000 into 8,000, recovery needs +25%, and borrowing amplifies the loss. Zero real money. |

## 4. Features

- **Three interface languages:** English, Hindi, Bengali (Bengali in beta). Messages can also be written in **Hinglish** and **Banglish**: five tested ways of writing.
- **Voice:** *Listen* (read aloud) and *Speak it* (dictation into editable text), using the device's speech services.
- **Offline first:** after the first sign-in, the on-device check, lessons, stories and simulators work without internet. The Android app is 5.2 MB.
- **Optional AI review with RAG:** runs only with the user's permission for that message.
- **Accounts:** sign up with email and password, verify the email once with a code, then sign in with the password. Each account has its own notebook; saving and cloud backup are always the user's choice.
- **Android:** share text into Sajag. Back closes any open menu first, then returns to Home.
- **Desktop and mobile layouts:** full-width website on laptops, compact layout on phones.

## 5. Results

**Held-out test set:** [`datasets/evaluation/holdout-150.json`](datasets/evaluation/holdout-150.json): 150 synthetic messages (75 risky, 75 harmless), 30 in each of English, Hindi, Bengali, Hinglish and Banglish. The set was written before tuning, kept out of development and scored once per mode.

| | Offline (on device) | With AI review |
|---|---|---|
| **Correct** | **124 / 150 (82.7%)** | **149 / 150 (99.3%)** |
| Risky messages flagged | 57 / 75 | 74 / 75 |
| Harmless messages wrongly flagged | 8 / 75 | **0 / 75** |
| Harmless messages marked *Strong* | 0 | 0 |

| Correct by writing form | English | Hindi | Bengali | Hinglish | Banglish |
|---|---|---|---|---|---|
| Offline | 83.3% | 83.3% | 83.3% | 80.0% | 83.3% |
| With AI review | 100% | 96.7% | 100% | 100% | 100% |

The AI review completed for 145 of 150 messages. The other five used the on-device result and are included in the AI figures. Full numbers are in [`datasets/evaluation/results.json`](datasets/evaluation/results.json).

**Reproduce the offline result** (no network, no keys):

```bash
npm install
SEALED_HOLDOUT=datasets/evaluation/holdout-150.json node scripts/evaluate-holdout.ts --sealed --offline
# → ALL accuracy 82.7% | risky flagged 57/75 | harmless flagged 8/75
```

AI mode needs a running server with a Gemini key and a signed-in session token (`SAJAG_EVAL_ACCESS_TOKEN`). See `scripts/evaluate-holdout.ts`.

*Scope:* the messages are synthetic. The figures measure whether a message received a warning, not the scam category or losses prevented, and they are not a real-world guarantee.

## 6. Architecture

```
                         ┌──────────────────────────── On the device · always on ────────────────────────────┐
  Message  ───────────►  │  Context-aware rules (EN / HI / BN, Hinglish, Banglish) + small pattern model       │ ──► Result
  (paste/share/speak)    │  quotes exact words · purpose label · evidence & gaps · related lessons             │     Potential / Strong /
                         └────────────────────────────────────────────────────────────────────────────────────┘     Not enough evidence
                                           │ only with the user's permission for this message
                                           ▼
                         ┌──────────────────────────── Online · optional AI review ───────────────────────────┐
                         │ 1 mask personal details → 2 retrieve guidance (BM25 over 22 curated official cards) │
                         │ 3 Gemini 3.5 Flash-Lite reads message + guidance → 4 exact-quote & guidance checks  │
                         │ 5 second pass confirms or withdraws each proposed warning                           │
                         └────────────────────────────────────────────────────────────────────────────────────┘
```

- **On-device layer** (`shared/`): TypeScript rules in `shared/engine.ts` and `shared/claim-context.ts` (pressure tactics, payment and credential requests, guaranteed-return claims, selling incentives, Hindi/Bengali numerals and context) plus a small logistic-regression pattern model (`shared/pattern-model.ts`, weights in `data/pattern-model.v1.json`, trained by `scripts/pattern-model-train.py`). The same code runs on the website and in the Android app.
- **AI layer** (`server/`): Express API (`server/app.ts`). Masking, BM25 retrieval over the guidance corpus (`server/retrieval.ts`, `server/evidence-corpus.ts`), reviewed contrast examples (`server/reviewed-memory.ts`), Gemini structured output, exact-quote and guidance-compatibility validation, and a confirm-or-withdraw second pass.
- **Safety rules:** the AI can add warnings and can clear eligible on-device false alarms, but a cleared warning stays visible as context, *Strong* results cannot be withdrawn, and if the AI cannot finish, the on-device result stands. Only consented, masked text is sent.
- **Accounts:** Supabase Auth (email + password, one-time email verification). Every API route except `/api/health` and `/api/auth` checks the session on the server. Notebook backup is protected by row-level security (`supabase/migrations/`).

## 7. Datasets and knowledge base

| Data | Where | Use |
|---|---|---|
| **Held-out evaluation set**: 150 synthetic messages (75 risky / 75 harmless; EN, HI, BN, Hinglish, Banglish) | `datasets/evaluation/holdout-150.json` | Final, one-time scoring of both modes (section 5) |
| **Development sets**: labelled synthetic messages in five writing forms, contrast pairs and review probes | `tests/fixtures/` (e.g. `dev-cycle7-en.json`, `cycle8-development.json`, `message-review-*.json`) | Rule development, regression tests and pattern-model training; never used for the final score |
| **Public SMS phishing data** (selected rows; evaluation and regression only, never trained on) | `tests/fixtures/dataset-development-*.json` | [Smishing-Dataset-IMC25](https://github.com/reportsmishing/Smishing-Dataset-IMC25) (CC BY 4.0, 24 rows) and [Bengali SMS smishing dataset](https://huggingface.co/datasets/shariul-islam/bengali-sms-smishing-dataset) (MIT, 48 rows); provenance in `dataset-development-provenance.json` |
| **RAG knowledge base**: 22 curated guidance cards | `server/evidence-corpus.ts` (sources in `shared/content.ts`) | Retrieved for the AI review; each card links to its official source |
| **Reviewed contrast examples** | `data/reviewed-corrections.v1.json`, `data/reviewed-purpose-labels.v2.json` | Short demonstrations that help the AI distinguish warnings from cautions |
| **Pattern model** | `data/pattern-model.v1.json` | On-device logistic-regression model trained by `scripts/pattern-model-train.py` on the project's synthetic development fixtures only |

**Which data is behind the reported results:** the 82.7% (offline) and 99.3% (with AI review) figures come only from `datasets/evaluation/holdout-150.json`, which was written before tuning and never used for training or tuning. Two older files in `tests/fixtures/` have "holdout" in their names (`expanded-independent-holdout-v2.json`, `rag-independent-holdout.json`); they were evaluation sets in earlier development rounds and were later folded into development and pattern-model training, so they are not part of the final test.

**Official sources behind the 22 guidance cards:** SEBI (Fake Trading App Scams, Stock Market Guru Scams, Pump and Dump, Dabba Trading, Social-media scams caution, FPI/FII scheme caution, Investment Adviser Master Circular, NAV, investment risk, ...), RBI (KYC-updation fraud caution, RBI-name fraud caution, UPI QR fraud, BE(A)WARE booklet, recovery-agent conduct), and PIB releases from the Ministry of Home Affairs / I4C (digital arrest; task-job and investment frauds), the Directorate of Enforcement (pig butchering), CBIC (customs fraud), the Department of Telecommunications (electricity-KYC scam), TRAI (impersonation) and the Income Tax Department (phishing). Guidance explains a warning pattern; it does not verify a sender, a registration or a link.

## 8. Tech stack

React 19 + Vite 8 + TypeScript (web) · Capacitor (Android) · Express 5 (API, hosted on Vercel) · Supabase Auth + Postgres with row-level security · Google Gemini API (Gemini 3.5 Flash-Lite) · BM25 retrieval · scikit-learn (pattern-model training) · Vitest, Supertest, Playwright and axe-core (tests). Third-party components and licences: [`deliverables/THIRD-PARTY.txt`](deliverables/THIRD-PARTY.txt).

## 9. Project structure

```
sajag-sangyan/
├── src/                 Web app (React): pages (Check, Learn, Simulate, Notebook, Settings, Trust), components, lib
├── shared/              On-device engine shared by web, server and Android: rules, pattern model, lessons, scam stories, types
├── server/              Express API: AI review, RAG retrieval, evidence corpus, auth checks, Vercel entry
├── data/                Pattern-model weights and reviewed contrast examples
├── datasets/evaluation/ Held-out 150-message test set and results
├── android/             Capacitor Android project (Back-to-Home handling, text sharing, speech bridge)
├── supabase/            Database migrations (notebook + row-level security), email templates, policy tests
├── public/              Icons, fonts, illustrations, PWA manifest, APK download metadata
├── scripts/             Build, Android sync/publish, offline bundle, pattern-model training, evaluation
├── tests/               Unit/API tests (Vitest), browser tests (Playwright), fixtures
└── deliverables/        Demo video, presentation, APK, solution overview, transcript, subtitles, release notes
```

## 10. Run it locally

Requirements: Node.js 22.18 or later.

```bash
npm install
cp .env.example .env.local      # add GEMINI_API_KEY to enable the optional AI review
npm run dev                     # web on http://localhost:5173, API on http://localhost:8787
```

- Without `GEMINI_API_KEY`, everything except the optional AI review works.
- `.env.production` contains only the public Supabase URL and publishable key used by the web build.
- Production build: `npm run build && npm start`.

## 11. Tests

```bash
npm test               # 2,372 unit and API tests (Vitest)
npm run test:e2e       # browser tests on desktop and mobile viewports (Playwright + axe accessibility checks)
npm run typecheck
```

## 12. Android app

```bash
npm run build
node scripts/sync-mobile.mjs android   # copy the web build into the Capacitor project
cd android && ./gradlew assembleDebug  # needs the Android SDK and JDK 21
```

The published debug APK (version 2.0, code 11) is in `deliverables/` and on the website.

## 13. Privacy and guardrails

- No stock tips, buy/sell/hold advice, price predictions, broker or product promotion, commissions or upsells.
- No SMS reading and no OTP or bank details collected. The email code only verifies a Sajag account; Sajag never asks for a bank, card or UPI code.
- Permission before every AI check, with the shared text shown. Only the masked message is sent; masking is best effort.
- Trade-offs stated openly: AI submissions follow Google's data terms (the free tier may use them to improve its products), and the notebook stored on the device is not encrypted.
- The server keeps a short-lived, text-free memory cache of review results (categories and positions, never message text).

## 14. Impact and next steps

Because the core runs on the device, Sajag works on slow or patchy internet at almost no cost per check, and new languages and guidance cards plug into the same pipeline. Next: test with consenting regional-language users (including older and first-time investors), evaluate on a wider range of real scam messages, add more Indian languages, and measure where Sajag helps, where it fails, and whether it reduces losses.

---

**Team FirstBest:** Anshuman Biswal · Masud Ali

*Sajag gives education and warning signs, not investment advice.*
