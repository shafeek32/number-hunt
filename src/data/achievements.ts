import type { Achievement } from '../types/game';

export interface AchievementDefinition {
  id: string;
  title: string;
  label: string; // for backward-compatibility
  description: string;
  icon: string;
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'first-hunt',
    title: 'First Hunt',
    label: 'First Hunt',
    description: 'Complete your first level.',
    icon: '🏁',
  },
  {
    id: 'perfect-hunt',
    title: 'Perfect Hunt',
    label: 'Perfect Hunt',
    description: 'Complete a level without mistakes.',
    icon: '🎯',
  },
  {
    id: 'speed-hunter',
    title: 'Speed Hunter',
    label: 'Speed Hunter',
    description: 'Complete a level under 5 seconds.',
    icon: '⚡',
  },
  {
    id: 'level-5',
    title: 'Level 5',
    label: 'Level 5',
    description: 'Reach Level 5.',
    icon: '⭐',
  },
  {
    id: 'level-10',
    title: 'Level 10',
    label: 'Level 10',
    description: 'Reach Level 10.',
    icon: '🔥',
  },
  {
    id: 'level-16',
    title: 'Level 16',
    label: 'Level 16',
    description: 'Complete the final level.',
    icon: '👑',
  },
  {
    id: 'star-collector',
    title: 'Star Collector',
    label: 'Star Collector',
    description: 'Earn at least 10 stars.',
    icon: '🌟',
  },
  {
    id: 'three-star-hunter',
    title: 'Three Star Hunter',
    label: 'Three Star Hunter',
    description: 'Earn 5 three-star completions.',
    icon: '✨',
  },
  {
    id: 'no-mistake-streak',
    title: 'No Mistake Streak',
    label: 'No Mistake Streak',
    description: 'Complete 3 consecutive games without mistakes.',
    icon: '🛡️',
  },
  {
    id: 'hunter',
    title: 'Hunter',
    label: 'Hunter',
    description: 'Play 10 games.',
    icon: '🏹',
  },
];

export function getAchievementById(id: string): AchievementDefinition | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

/** Combine static definitions with unlocked state */
export function buildAchievementList(
  unlockedMap: Record<string, string> // id -> unlockedAt ISO date
): Achievement[] {
  return ACHIEVEMENTS.map((def) => ({
    id: def.id,
    title: def.title,
    label: def.label,
    description: def.description,
    icon: def.icon,
    unlockedAt: unlockedMap[def.id] ?? null,
  }));
}
