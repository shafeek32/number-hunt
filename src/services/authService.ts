import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

export interface SignUpParams {
  email: string;
  password: string;
  username: string;
  displayName: string;
  avatar?: string;
}

export const authService = {
  async signUp({ email, password, username, displayName, avatar = '⚡' }: SignUpParams): Promise<{ user: User | null; session: Session | null; error: Error | null }> {
    if (!isSupabaseConfigured) {
      return { user: null, session: null, error: new Error('Supabase is not configured yet. Please check .env settings.') };
    }

    // Check username availability first
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('username')
      .ilike('username', username)
      .maybeSingle();

    if (existingUser) {
      return { user: null, session: null, error: new Error('Username is already taken. Please choose another.') };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username.toLowerCase().trim(),
          display_name: displayName.trim(),
          avatar,
        },
      },
    });

    if (error) {
      return { user: null, session: null, error };
    }

    // Create profile row if trigger didn't catch it
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        username: username.toLowerCase().trim(),
        display_name: displayName.trim(),
        avatar,
        updated_at: new Date().toISOString(),
      });
    }

    return { user: data.user, session: data.session, error: null };
  },

  async signIn(email: string, password: string): Promise<{ user: User | null; session: Session | null; error: Error | null }> {
    if (!isSupabaseConfigured) {
      return { user: null, session: null, error: new Error('Supabase is not configured yet. Please check .env settings.') };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { user: null, session: null, error };
    }

    return { user: data.user, session: data.session, error: null };
  },

  async signOut(): Promise<{ error: Error | null }> {
    if (!isSupabaseConfigured) {
      return { error: null };
    }
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  async getSession(): Promise<Session | null> {
    if (!isSupabaseConfigured) return null;
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  async getUser(): Promise<User | null> {
    if (!isSupabaseConfigured) return null;
    const { data } = await supabase.auth.getUser();
    return data.user;
  },
};
