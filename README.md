# 🎯 Number Hunt

A fast-paced, competitive number memory and reaction web game. Hunt numbers in the correct sequence, beat your personal records, unlock challenging levels, and climb the global leaderboards!

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite&logoColor=white)
![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?logo=tailwind-css)
![Supabase](https://img.shields.io/badge/Supabase-Backend%20%26%20Auth-3ECF8E?logo=supabase&logoColor=white)

---

## ✨ Features

### 🎮 Gameplay Mechanics
- **16 Progressive Levels**: Start with 5 numbers on a compact grid and advance to 20 numbers across dense, mind-bending layouts.
- **Difficulty Tiers**: Five escalating difficulty brackets — *Easy*, *Normal*, *Hard*, *Very Hard*, and *Extreme*.
- **Dynamic Scoring**: Score points based on raw completion speed, mistake-free accuracy, and dynamic combo multipliers.
- **3-Star Rating System**: Earn up to 3 stars per level depending on time thresholds and accuracy.
- **📅 Daily Challenge**: Compete daily on a unified, deterministically seeded puzzle against players worldwide.

### 🏆 Social & Progression
- **Global & Level Leaderboards**: Real-time rank tracking for each individual level and the daily challenge.
- **Achievements System**: Unlock badges for speed milestones, flawless clears, star milestones, and reaching higher tiers.
- **Player Profiles**: Comprehensive stats overview — total games, best records, average times, and stars collected.
- **Guest Mode & Seamless Migration**: Play immediately as a guest with local storage. When you sign up, your scores and unlocked levels automatically migrate to your cloud profile!

### 🛡️ Enterprise-Grade Anti-Cheat & Security
- **Single-Use Replay Tokens**: Anti-replay tokens issued before game start and consumed upon submission.
- **Plausibility & Rate Limiting**: Human-plausible minimum completion time enforcement per level and submission rate limiting (max 60/hr).
- **Serverless Edge Function Validation**: Scores and stars verified and recomputed server-side with Supabase Edge Functions.
- **Admin Moderation Panel**: Real-time review of flagged attempts, suspicious runs, and user ban enforcement.

---

## 🛠️ Tech Stack

- **Frontend**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Routing**: [React Router v7](https://reactrouter.com/)
- **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL with Row Level Security, Supabase Auth)
- **Serverless**: [Deno / Supabase Edge Functions](https://supabase.com/docs/guides/functions)

---

## 📂 Project Structure

```text
number-hunt/
├── public/                 # Static assets, SVG icons, and favicons
├── src/
│   ├── assets/             # Branding and image assets
│   ├── components/
│   │   ├── common/         # Buttons, Modals, Cards, Star Ratings, Toasts
│   │   ├── game/           # GameBoard, NumberCard, Timer, TargetDisplay, Countdown
│   │   ├── layout/         # Navbar, MobileNavigation, PageContainer
│   │   └── leaderboard/    # LeaderboardTable, LeaderboardRow
│   ├── context/            # AuthContext (Supabase + Guest state)
│   ├── data/               # Level definitions, achievements metadata, mock fallbacks
│   ├── hooks/              # useGame, useTimer, useAuth
│   ├── lib/                # Supabase client initialization
│   ├── pages/              # Home, Game, LevelSelect, Leaderboard, DailyChallenge,
│   │                       # Profile, Admin, Login, Signup, NotFound
│   ├── services/           # API services for games, stats, validation, moderation
│   ├── types/              # Game engine types, database schemas
│   └── utils/              # Scoring formula, RNG seed generators, storage adapters
├── supabase/
│   ├── functions/          # Deno Edge Functions (validate-score)
│   └── migrations/         # PostgreSQL schema, RLS policies, anti-cheat triggers
├── .env.example            # Environment variable template
├── SUPABASE_SETUP.md       # Step-by-step backend provisioning guide
└── vite.config.ts          # Vite build configuration
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or later recommended)
- [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)
- A free [Supabase](https://supabase.com/) account (optional for local/guest play, required for cloud leaderboards & auth)

### 1. Clone the Repository
```bash
git clone https://github.com/shafeek32/number-hunt.git
cd number-hunt
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Add your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

*(Note: The game operates seamlessly in offline/local storage fallback mode if Supabase keys are not provided).*

### 4. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🗄️ Database & Supabase Setup

For full backend features including user accounts, cloud leaderboards, anti-cheat validation, and admin moderation, refer to [SUPABASE_SETUP.md](SUPABASE_SETUP.md).

Quick setup summary:
1. Apply the schema migration:
   ```bash
   supabase/migrations/20261008000000_phase3_schema.sql
   supabase/migrations/20261008100000_phase4_anticheat.sql
   ```
2. Deploy the score validation edge function:
   ```bash
   supabase functions deploy validate-score
   ```

---

## 📦 Production Build

To build the project for production:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

---

## 🤝 Contributing

Contributions, bug reports, and feature requests are welcome!
1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
