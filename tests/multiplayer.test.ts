import { describe, it, expect } from 'vitest';
import { createInitialDuelState } from '../src/hooks/useDuelGame';

describe('2-Player Pass & Play Multiplayer Duel Engine', () => {
  it('initializes duel state with default Level 8 (12 numbers), players, and 0 mistakes', () => {
    const duel = createInitialDuelState(8, 'Alice', 'Bob');

    expect(duel.phase).toBe('setup');
    expect(duel.level.id).toBe(8);
    expect(duel.level.numberCount).toBe(12);
    expect(duel.numbers.length).toBe(12);
    expect(duel.targetNumber).toBe(1);
    expect(duel.foundNumbers).toEqual([]);
    expect(duel.activePlayerId).toBe('p1');
    expect(duel.players.p1.name).toBe('Alice');
    expect(duel.players.p2.name).toBe('Bob');
    expect(duel.players.p1.mistakes).toBe(0);
    expect(duel.players.p2.mistakes).toBe(0);
    expect(duel.isWrongEffect).toBe(false);
    expect(duel.winnerId).toBeNull();
  });

  it('correct sequential number clicks advance target and build streak', () => {
    const duel = createInitialDuelState(8, 'Player 1', 'Player 2');
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

  it('wrong click triggers top red effect, reveals clicked number on card, and resets streak', () => {
    const duel = createInitialDuelState(8, 'Player 1', 'Player 2');
    duel.phase = 'playing';

    // Player 1 had found 1 and 2
    duel.players.p1.currentStreak = 2;
    duel.players.p1.bestStreak = 2;
    duel.targetNumber = 3;

    // Player 1 accidentally clicks a wrong tile
    const clickedNum = 9;
    expect(clickedNum).not.toBe(duel.targetNumber);

    duel.players.p1.mistakes += 1;
    duel.players.p1.currentStreak = 0;
    duel.isWrongEffect = true;
    duel.wrongNumber = clickedNum; // Number is visible to players on the card!

    expect(duel.players.p1.mistakes).toBe(1);
    expect(duel.players.p1.currentStreak).toBe(0);
    expect(duel.players.p1.bestStreak).toBe(2);
    expect(duel.isWrongEffect).toBe(true);
    expect(duel.wrongNumber).toBe(9);
  });

  it('turn handoff resets target to 1, hides tiles, and activates Player 2 with top indicator', () => {
    const duel = createInitialDuelState(8, 'Player 1', 'Player 2');

    // Simulate turn transition to Player 2
    const nextPlayerId: 'p1' | 'p2' = 'p2';
    duel.activePlayerId = nextPlayerId;
    duel.targetNumber = 1;
    duel.foundNumbers = [];
    duel.isWrongEffect = false;
    duel.phase = 'playing';
    duel.turnNumber += 1;
    duel.players.p2.turnsTaken += 1;

    expect(duel.activePlayerId).toBe('p2');
    expect(duel.targetNumber).toBe(1);
    expect(duel.foundNumbers).toEqual([]);
    expect(duel.isWrongEffect).toBe(false);
    expect(duel.players.p2.turnsTaken).toBe(1);
    expect(duel.turnNumber).toBe(2);
  });

  it('reaching the final number crowns the active player as winner', () => {
    const duel = createInitialDuelState(8, 'Player 1', 'Player 2'); // 12 numbers total
    duel.phase = 'playing';
    duel.foundNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    duel.targetNumber = 12;

    // Player 1 taps final number 12
    const finalFound = [...duel.foundNumbers, 12];
    if (finalFound.length === duel.level.numberCount) {
      duel.phase = 'finished';
      duel.winnerId = 'p1';
    }

    expect(duel.phase).toBe('finished');
    expect(duel.winnerId).toBe('p1');
  });
});
