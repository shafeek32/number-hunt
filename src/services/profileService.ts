import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { ProfileRow } from '../types/database';

export const profileService = {
  async getProfile(userId: string): Promise<ProfileRow | null> {
    if (!isSupabaseConfigured) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) return null;
    return data;
  },

  async updateProfile(userId: string, updates: { display_name?: string; avatar?: string }): Promise<ProfileRow | null> {
    if (!isSupabaseConfigured) return null;
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('*')
      .single();

    if (error) return null;
    return data;
  },

  async isUsernameAvailable(username: string): Promise<boolean> {
    if (!isSupabaseConfigured) return true;
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', username.trim().toLowerCase())
      .maybeSingle();

    return !data;
  },
};
