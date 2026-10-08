import { createContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { authService, type SignUpParams } from '../services/authService';
import { profileService } from '../services/profileService';
import { gameService } from '../services/gameService';
import {
  getLevelBests,
  getStoredPlayerStats,
  getUnlockedAchievements,
  getStreakData,
  getUnlockedLevels,
  resetLocalProgress,
  syncCloudToStorage,
} from '../utils/storage';
import type { ProfileRow } from '../types/database';

export interface AuthContextType {
  user: User | null;
  profile: ProfileRow | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<{ error: Error | null }>;
  signUp: (params: SignUpParams) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasLocalProgressToMigrate: boolean;
  migrateLocalProgress: () => Promise<boolean>;
  dismissMigration: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [hasLocalProgressToMigrate, setHasLocalProgressToMigrate] = useState<boolean>(false);

  const fetchProfile = useCallback(async (userId: string) => {
    const prof = await profileService.getProfile(userId);
    setProfile(prof);
  }, []);

  const syncFromCloud = useCallback(async (userId: string) => {
    try {
      const [cloudStats, cloudGames] = await Promise.all([
        gameService.getPlayerStats(userId),
        gameService.getGameHistory(userId, 50),
      ]);
      syncCloudToStorage(cloudStats, cloudGames);
    } catch (e) {
      console.warn('Failed to sync cloud stats to local storage:', e);
    }
  }, []);

  // Check whether meaningful local progress exists to offer migration
  const checkLocalProgress = useCallback(async (userId?: string) => {
    if (!userId) {
      setHasLocalProgressToMigrate(false);
      return;
    }

    // 1. If already resolved for this account, don't show modal
    if (localStorage.getItem(`nh_migration_resolved_${userId}`)) {
      setHasLocalProgressToMigrate(false);
      await syncFromCloud(userId);
      return;
    }

    // 2. Check local progress
    const stats = getStoredPlayerStats();
    const bests = getLevelBests();
    const unlocked = getUnlockedLevels();
    const hasProgress = stats.totalGames > 0 || Object.keys(bests).length > 0 || unlocked.length > 1;

    if (!hasProgress) {
      setHasLocalProgressToMigrate(false);
      await syncFromCloud(userId);
      return;
    }

    // 3. Check if cloud already has progress
    try {
      const cloudStats = await gameService.getPlayerStats(userId);
      if (cloudStats && (cloudStats.total_games > 0 || cloudStats.highest_level > 1 || cloudStats.total_stars > 0)) {
        localStorage.setItem(`nh_migration_resolved_${userId}`, 'true');
        setHasLocalProgressToMigrate(false);
        await syncFromCloud(userId);
        return;
      }
    } catch {
      // Continue to prompt
    }

    setHasLocalProgressToMigrate(true);
  }, [syncFromCloud]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    // 1. Initial session load
    authService.getSession().then((sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        fetchProfile(sess.user.id);
        checkLocalProgress(sess.user.id);
      }
      setLoading(false);
    });

    // 2. Auth listener for real-time changes
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        await fetchProfile(newSession.user.id);
        checkLocalProgress(newSession.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [fetchProfile, checkLocalProgress]);

  const signIn = async (email: string, pass: string) => {
    const res = await authService.signIn(email, pass);
    if (!res.error && res.user) {
      setUser(res.user);
      setSession(res.session);
      await fetchProfile(res.user.id);
      checkLocalProgress(res.user.id);
    }
    return { error: res.error };
  };

  const signUp = async (params: SignUpParams) => {
    const res = await authService.signUp(params);
    if (!res.error && res.user) {
      setUser(res.user);
      setSession(res.session);
      await fetchProfile(res.user.id);
      checkLocalProgress(res.user.id);
    }
    return { error: res.error };
  };

  const signOut = async () => {
    await authService.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
    setHasLocalProgressToMigrate(false);
    resetLocalProgress(1);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
      await syncFromCloud(user.id);
    }
  };

  const migrateLocalProgress = async (): Promise<boolean> => {
    if (!user) return false;
    const bests = getLevelBests();
    const stats = getStoredPlayerStats();
    const unlockedAchievements = getUnlockedAchievements();
    const streak = getStreakData();
    const highestUnlockedLevel = Math.max(...getUnlockedLevels());

    const success = await gameService.migrateLocalProgress(user.id, {
      bests,
      stats,
      unlockedAchievements,
      streak,
      highestUnlockedLevel,
    });

    if (success) {
      localStorage.setItem(`nh_migration_resolved_${user.id}`, 'true');
      setHasLocalProgressToMigrate(false);
      await refreshProfile();
    }
    return success;
  };

  const dismissMigration = () => {
    setHasLocalProgressToMigrate(false);
    if (user) {
      localStorage.setItem(`nh_migration_resolved_${user.id}`, 'true');
      syncFromCloud(user.id);
    } else {
      resetLocalProgress(1);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
        hasLocalProgressToMigrate,
        migrateLocalProgress,
        dismissMigration,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
