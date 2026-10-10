import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Supabase Security & RLS Policies (Section 3)', () => {
  const migrationPath = path.resolve(__dirname, '../supabase/migrations/20261010000000_guest_games_support.sql');
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');

  it('migration relaxes games.user_id to nullable while maintaining foreign key integrity', () => {
    expect(migrationSql).toContain('ALTER TABLE public.games ALTER COLUMN user_id DROP NOT NULL;');
    expect(migrationSql).toContain('ALTER TABLE public.games ADD COLUMN IF NOT EXISTS guest_id TEXT;');
    expect(migrationSql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS idx_games_client_token_unique');
  });

  it('enforces table check constraint that either user_id or guest_id must be provided', () => {
    expect(migrationSql).toContain('chk_games_user_or_guest');
    expect(migrationSql).toContain('(user_id IS NOT NULL OR guest_id IS NOT NULL)');
  });

  it('prevents anonymous clients from elevating privileges or verifying their own scores via RLS', () => {
    // Check RLS policy for guest submissions
    expect(migrationSql).toContain('CREATE POLICY "Allow guest game submissions"');
    expect(migrationSql).toContain('user_id IS NULL');
    expect(migrationSql).toContain('guest_id IS NOT NULL');
    expect(migrationSql).toContain('is_verified = false');
    expect(migrationSql).toContain('is_flagged = false');
  });

  it('does NOT permit anonymous clients to update or delete games in RLS', () => {
    // Ensure no policy exists that allows anon to update games or profiles
    expect(migrationSql).not.toContain('CREATE POLICY "Allow anon update"');
    expect(migrationSql).not.toContain('CREATE POLICY "Allow anon delete"');
  });

  it('RPC submit_guest_game recalculates score with canonical multipliers and protects against replays', () => {
    // Verifies canonical multipliers in SQL
    expect(migrationSql).toContain('WHEN p_level_id <= 3 THEN 1.0');
    expect(migrationSql).toContain('WHEN p_level_id <= 7 THEN 1.2');
    expect(migrationSql).toContain('WHEN p_level_id <= 11 THEN 1.5');
    expect(migrationSql).toContain('WHEN p_level_id <= 14 THEN 1.8');
    expect(migrationSql).toContain('ELSE 2.2');

    // Anti-replay
    expect(migrationSql).toContain('p_client_token');
    expect(migrationSql).toContain('client_token = p_client_token');
    expect(migrationSql).toContain("'duplicate', true");

    // Implausible anti-cheat checks
    expect(migrationSql).toContain('v_min_time := 500 + (p_level_id * 100);');
    expect(migrationSql).toContain('v_is_flagged := true;');
  });

  it('ensures no service role key is bundled into frontend code', () => {
    // Scan src directory for SUPABASE_SERVICE_ROLE_KEY or service_role
    const files = fs.readdirSync(path.resolve(__dirname, '../src'), { recursive: true }) as string[];
    for (const f of files) {
      if (typeof f === 'string' && (f.endsWith('.ts') || f.endsWith('.tsx'))) {
        const fullPath = path.resolve(__dirname, '../src', f);
        const content = fs.readFileSync(fullPath, 'utf8');
        expect(content).not.toContain('service_role');
        expect(content).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
      }
    }
  });
});
