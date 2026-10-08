import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const achievementService = {
  async getUserAchievements(userId: string): Promise<string[]> {
    if (!isSupabaseConfigured) return [];

    const { data, error } = await supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', userId);

    if (error || !data) return [];
    return data.map((d) => d.achievement_id);
  },

  async unlockAchievement(userId: string, achievementId: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;

    const { error } = await supabase.from('user_achievements').upsert({
      user_id: userId,
      achievement_id: achievementId,
      unlocked_at: new Date().toISOString(),
    });

    return !error;
  },

  async syncAchievements(userId: string, achievementIds: string[]): Promise<void> {
    if (!isSupabaseConfigured || achievementIds.length === 0) return;

    for (const id of achievementIds) {
      await supabase.from('user_achievements').upsert({
        user_id: userId,
        achievement_id: id,
        unlocked_at: new Date().toISOString(),
      });
    }
  },
};
