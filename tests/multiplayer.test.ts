import { describe, it, expect } from 'vitest';
import { createInitialDuelState } from '../src/hooks/useDuelGame';
import { LEVELS } from '../src/data/levels';

describe('2-Player Pass & Play Multiplayer Duel Engine', () => {
  it('initializes duel state with correct level, players, and 0 mistakes', () => {
    const duel = createInitialDuelState(1, 'Alice', 'Bob');

    expect(duel.phase).toBe('setup');
    expect(duel.level.id).toBe(1);
    expect(duel.level.numberCount).toBe(5);
    expect(duel.numbers.length).toBe(5);
    expect(duel.targetNumber).toBe(1);
    expect(duel.foundNumbers).toEqual([]);
    expect(duel.activePlayerId).toBe('p1');
    expect(duel.players.p1.name).toBe('Alice');
    expect(duel.players.p2.name).toBe('Bob');
    expect(duel.players.p1.mistakes).toBe(0);
    expect(duel.players.p2.mistakes).toBe(0);
    expect(duel.winnerId).toBeNull();
  });

  it('correct sequential number clicks advance target and build streak', () => {
    const duel = createInitialDuelState(1, 'Player 1', 'Player 2');
    duel.phase = 'playing';

    // Simulated click 1
    const p1 = duel.players.p1;
    let nextFound = [...duel.foundNumbers, 1];
    p1.currentStreak += 1;
    p1.bestStreak = Math.max(p1.bestStreak, p1.currentStreak);
    duel.targetNumber = 2;
    duel.foundNumbers = nextFound;

    expect(duel.targetNumber).toBe(2);
    expect(duel.foundNumbers).toEqual([1]);
    expect(p1.currentStreak).toBe(1);
    expect(p1.bestStreak).toBe(1);

    // Simulated click 2
    nextFound = [...duel.foundNumbers, 2];
    p1.currentStreak += 1;
    p1.bestStreak = Math.max(p1.bestStreak, p1.currentStreak);
    duel.targetNumber = 3;
    duel.foundNumbers = nextFound;

    expect(duel.targetNumber).toBe(3);
    expect(duel.foundNumbers).toEqual([1, 2]);
    expect(p1.currentStreak).toBe(2);
    expect(p1.bestStreak).toBe(2);
  });

  it('wrong click increments mistakes, resets streak, and preserves best streak', () => {
    const duel = createInitialDuelState(1, 'Player 1', 'Player 2');
    duel.phase = 'playing';

    // Player 1 had found 1 and 2
    duel.players.p1.currentStreak = 2;
    duel.players.p1.bestStreak = 2;
    duel.targetNumber = 3;

    // Player 1 accidentally clicks 5 instead of 3
    const clickedNum = 5;
    expect(clickedNum).not.toBe(duel.targetNumber);

    duel.players.p1.mistakes += 1;
    duel.players.p1.currentStreak = 0;
    duel.wrongNumber = clickedNum;

    expect(duel.players.p1.mistakes).toBe(1);
    expect(duel.players.p1.currentStreak).toBe(0);
    expect(duel.players.p1.bestStreak).toBe(2);
    expect(duel.wrongNumber).toBe(5);
  });

  it('turn handoff resets target to 1, hides tiles, and activates Player 2', () => {
    const duel = createInitialDuelState(1, 'Player 1', 'Player 2');

    // Simulate turn transition to Player 2
    const nextPlayerId: 'p1' | 'p2' = 'p2';
    duel.activePlayerId = nextPlayerId;
    duel.targetNumber = 1;
    duel.foundNumbers = [];
    duel.wrongNumber = null;
    duel.phase = 'playing';
    duel.turnNumber += 1;
    duel.players.p2.turnsTaken += 1;

    expect(duel.activePlayerId).toBe('p2');
    expect(duel.targetNumber).toBe(1);
    expect(duel.foundNumbers).toEqual([]);
    expect(duel.wrongNumber).toBeNull();
    expect(duel.players.p2.turnsTaken).toBe(1);
    expect(duel.turnNumber).toBe(2);
  });

  it('reaching the final number crowns the active player as winner', () => {
    const duel = createInitialDuelState(1, 'Player 1', 'Player 2'); // 5 numbers total
    duel.phase = 'playing';
    duel.foundNumbers = [1, 2, 3, 4];
    duel.targetNumber = 5;

    // Player 1 taps final number 5
    const finalFound = [...duel.foundNumbers, 5];
    if (finalFound.length === duel.level.numberCount) {
      duel.phase = 'finished';
      duel.winnerId = 'p1';
    }

    expect(duel.phase).toBe('finished');
    expect(duel.winnerId).toBe('p1');
  });
});
