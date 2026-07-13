# Trading Journal — Web App

A dark-themed trading journal webapp, implemented from the original `trading-journal.html`
spec and reference designs in [reference/](reference/) (recovered from the Manus session
"Can You Develop an Android App for This Trading Journal?").

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

## Instruments

Fixed to the three markets this journal trades:

| Instrument | P&L currency | Size unit | Contract math |
| --- | --- | --- | --- |
| NIFTY 50 | ₹ (INR) | Quantity (default 65 = 1 lot) | (exit − entry) × qty |
| XAUUSD | $ (USD) | Lots (1 lot = 100 oz) | (exit − entry) × lots × 100 |
| EURUSD | $ (USD) | Lots (1 lot = 100,000 units) | (exit − entry) × lots × 100,000 |

The dashboard has a ₹/$ toggle so rupee and dollar P&L are never mixed;
the Journal shows both nets side by side.

## Excel database (Chrome/Edge)

Profile → Excel Database → **Create Excel database** (or connect an existing
.xlsx). Every add/edit/delete is written to that file automatically via the
File System Access API; the file is re-read on startup, so you can also edit
rows in Excel and see them in the app. Sheet: `Trades` with Date, Time,
Symbol, Side, Asset, Size, Multiplier, Currency, Entry, Exit, PnL, Notes,
Id, Timestamp.

Keep the file closed in Excel while logging trades — Excel locks open files.

## Install as an app (PWA)

The app is a full PWA: open it in Chrome/Edge (desktop: install icon in the
address bar; Android: menu → *Add to Home screen*) and it runs standalone
with its own icon, works offline, and updates itself. All assets — including
fonts — are self-hosted and precached by the service worker, so after the
first visit nothing is fetched from third parties.

## Fingerprint lock

First launch offers to enroll your device fingerprint (WebAuthn platform
authenticator — Touch ID, Android fingerprint, Windows Hello). Once enabled,
the app renders nothing until the OS verifies your fingerprint; there is no
skip. Enable/disable from Profile → Security. Requires HTTPS or localhost.

**The credential is bound to the enrolling device** — it cannot be used, or
copied for use, on any other device. Enrollment generates a one-time
**recovery code** (only its SHA-256 hash is stored); if the sensor ever
fails, "Use recovery code" on the lock screen is the only fallback.
Email-OTP recovery would require a server to send mail — not possible in a
purely local app.

Note: the lock gates the UI with real OS biometrics, but the underlying data
lives in browser storage/the xlsx file — someone with full access to your OS
user account could still read those directly. The xlsx file itself is
protected by your OS account permissions, and the browser's file-access
grant is scoped to this origin and your browser profile.

## Security posture

- No backend, no analytics, no third-party requests at runtime; data never
  leaves the device (OWASP: minimal attack surface, no data in transit)
- Strict Content-Security-Policy meta injected into production builds
  (`default-src 'self'`, no eval, no remote scripts)
- All rendering via React (auto-escaped) — no `innerHTML`/`eval` anywhere
- Inputs validated and clamped; xlsx imports are coerced, length-capped and
  row-capped so a tampered workbook can't break the app
- Recovery code stored only as a SHA-256 hash; WebAuthn keys never leave the
  device's secure enclave
- If you host `dist/` somewhere, add response headers the browser can't set
  itself: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`,
  `frame-ancestors 'none'` (or `X-Frame-Options: DENY`)

## Features

- **Dashboard** — total returns hero, weekly P&L badge, win rate, profit factor,
  equity curve (SVG), long/short position-mix donut, recent trades
- **Journal** — trades grouped by month (with monthly net P&L) and day,
  expandable cards with entry/exit/size/asset/notes, edit & delete,
  win/loss filter, symbol search from the header
- **New Entry** — built for speed: instrument + direction taps, lot-aware
  stepper (NIFTY steps by 65/lot, forex by 0.01 lots) with quick chips,
  remembered last size per instrument, entry/exit prices, auto-detected
  psychology chip, slide-to-save (Enter key also saves); doubles as the
  edit screen
- **Trade psychology** — every trade gets an emotion inferred from behavior
  (revenge re-entry <30 min after a loss, FOMO chasing <10 min after a win,
  overconfident sizing on a win streak, anxiety on a loss streak, disciplined
  when a thesis is journaled — see `src/lib/emotions.js`), editable anytime
  via chips on the entry form or trade card; stored in Excel/CSV exports too
- **Psychology screen** — score from win rate + journaling + emotional
  quality, dynamic insights (e.g. revenge-pattern warnings), real emotion
  distribution for the last 10 trades, trading rules
- **Profile** — trader stats grid, CSV export, reset-data with confirmation

## Design

- Material Design 3 dark navy palette (`#0f131d` background, `#00d09c` primary)
- Google Fonts: Space Grotesk (headings/numbers) + Inter (body)
- Glassmorphism cards, consistent 20px page margins
- Data persists in `localStorage` (starts empty with guided first-run states)

## Stack

Vite + React 18, no other runtime dependencies — charts are hand-rolled SVG /
conic-gradients.
