# Supabase Setup Guide for Number Hunt

This guide details how to configure Supabase backend services for **Number Hunt Phase 3**.

---

## 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign in or create an account.
2. Click **New Project**.
3. Choose an organization, project name (`number-hunt`), database password, and preferred region.
4. Click **Create new project**.

---

## 2. Configure Environment Variables
1. In your Supabase dashboard, navigate to **Project Settings** → **API**.
2. Copy the **Project URL** and the **anon public API key**.
3. In the root directory of your project, create or edit `.env`:
   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...your-anon-key
   ```
> **Security Reminder**: Never expose your `service_role` key in frontend client code. Only use the public `anon` key.

---

## 3. Apply Database Migration
1. In the Supabase dashboard, go to the **SQL Editor**.
2. Open the file `supabase/migrations/20261008000000_phase3_schema.sql` from this repository.
3. Paste the contents into the SQL Editor and click **Run**.
4. The migration will create:
   - `profiles`: User profile data (username, display_name, avatar).
   - `games`: Completed game history.
   - `player_stats`: Aggregated player stats.
   - `user_achievements`: Unlocked user achievements.
   - `daily_challenges`: Daily deterministic challenge definitions.
   - `daily_challenge_scores`: Daily challenge submissions.
   - Row Level Security (RLS) policies on all tables.
   - Automatic profile & stats initialization trigger on user signup.

---

## 4. Configure Supabase Authentication
1. Go to **Authentication** → **Providers** in Supabase.
2. Ensure **Email** is enabled.
3. Under **Authentication** → **Settings**:
   - For easy development testing, you can disable **Confirm email** if you want users to log in immediately without waiting for verification emails.
   - In production, enable email confirmation and configure appropriate site URL and redirect URLs.

---

## 5. Daily Challenge Setup
The migration automatically inserts a sample challenge for the current date. For continuous daily challenges:
- You can schedule an edge function or cron job to insert tomorrow's challenge:
  ```sql
  INSERT INTO public.daily_challenges (challenge_date, level_id, seed)
  VALUES (CURRENT_DATE + 1, 8, 'number-hunt-' || (CURRENT_DATE + 1)::text || '-8')
  ON CONFLICT (challenge_date) DO NOTHING;
  ```

---

## 6. Phase 4: Anti-Cheat & Score Validation Setup

### 6.1 Database Migration
1. In the Supabase dashboard SQL Editor, open and run `supabase/migrations/20261008100000_phase4_anticheat.sql`.
2. This creates:
   - `admin_roles`: Table designating moderators, admins, and superadmins.
   - `banned_users`: Real-time ban system with optional expiration.
   - `game_tokens`: Single-use anti-replay tokens issued before game start.
   - `submission_rate_limits`: Enforces max 60 score submissions/hour per user.
   - `level_time_limits`: Human-plausible minimum completion times for levels 1–16.
   - `auto_flag_suspicious_game()`: DB trigger flagging impossibly fast times or mismatched scores.
   - `check_submission_rate_limit()`: RPC function for rate limit enforcement.
   - Moderation columns on `games` (`is_flagged`, `flag_reason`, `is_verified`, `client_token`).

### 6.2 Deploy the Score Validation Edge Function
Deploy the serverless Edge Function using Supabase CLI:
```bash
supabase functions deploy validate-score
```
The edge function:
- Recomputes score, accuracy, and stars server-side.
- Validates anti-replay tokens and submission rate limits.
- Checks human-plausibility time limits per level.
- Verifies the user is not actively banned.
- Securely persists verified scores and updates `player_stats`.

---

## 7. Phase 5: Admin Dashboard & Moderation

### 7.1 Granting Admin Privileges
To grant an admin role to a registered user:
1. Find the player's `id` from the `profiles` or `auth.users` table.
2. In the Supabase SQL Editor, run:
```sql
INSERT INTO public.admin_roles (user_id, role)
VALUES ('<user-uuid-here>', 'admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
```
Available roles: `'moderator'`, `'admin'`, `'superadmin'`.

### 7.2 Accessing Admin Dashboard
1. Log in with your admin credentials.
2. Navigate to `http://localhost:5173/admin` or click **🛡️ Admin Dashboard** from your Profile page.
3. Features:
   - **Overview**: Real-time stats on players, games, flagged submissions, and bans.
   - **Flagged Scores**: Inspect flagged runs, verify clean runs, delete fraudulent games, or ban suspicious users.
   - **User Management**: Search players, inspect per-user game history, and issue/lift bans.
   - **Active Bans**: View active temporary and permanent bans, with instant unban capability.

---

## 8. Run the Application
Start the development server:
```bash
npm run dev
```
Open `http://localhost:5173`. You can now sign up, log in, view the global leaderboard, submit verified games, compete in the daily challenge, and manage moderation via `/admin`!

