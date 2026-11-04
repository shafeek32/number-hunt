export type OnlineRole = 'host' | 'guest';

export interface OnlinePlayerInfo {
  id: string;
  name: string;
  role: OnlineRole;
  isReady: boolean;
  color: 'amber' | 'cyan';
  mistakes: number;
  bestStreak: number;
  currentStreak: number;
}

export type OnlineDuelPhase = 'lobby' | 'countdown' | 'playing' | 'finished';

export interface OnlineDuelState {
  roomCode: string;
  role: OnlineRole;
  phase: OnlineDuelPhase;
  levelId: number;
  numberCount: number;
  boardNumbers: number[];
  targetNumber: number;
  foundNumbers: number[];
  activeRole: OnlineRole;
  localPlayer: OnlinePlayerInfo;
  remotePlayer: OnlinePlayerInfo | null;
  wrongNumber: number | null;
  isWrongEffect: boolean;
  winnerRole: OnlineRole | null;
  turnNumber: number;
  connectionStatus: 'connecting' | 'connected' | 'error' | 'disconnected';
  errorMessage: string | null;
}

export interface OnlineSyncScore {
  mistakes: number;
  bestStreak: number;
  currentStreak: number;
}

export interface OnlineSyncStatePayload {
  phase: OnlineDuelPhase;
  levelId: number;
  numberCount: number;
  boardNumbers: number[];
  targetNumber: number;
  foundNumbers: number[];
  activeRole: OnlineRole;
  turnNumber: number;
  winnerRole: OnlineRole | null;
  hostScore: OnlineSyncScore;
  guestScore: OnlineSyncScore;
}

export type OnlineDuelEvent =
  | {
      type: 'PLAYER_JOIN';
      player: OnlinePlayerInfo;
    }
  | {
      type: 'HOST_START_GAME';
      levelId: number;
      boardNumbers: number[];
    }
  | {
      type: 'TILE_CLICK_CORRECT';
      clickedBy: OnlineRole;
      number: number;
      nextTarget: number;
      streak: number;
      isGameWon: boolean;
    }
  | {
      type: 'TILE_CLICK_WRONG';
      clickedBy: OnlineRole;
      number: number;
      mistakes: number;
    }
  | {
      type: 'SWITCH_TURN';
      nextRole: OnlineRole;
      turnNumber: number;
    }
  | {
      type: 'REMATCH_START';
      boardNumbers: number[];
      levelId: number;
    }
  | {
      type: 'PLAYER_LEFT';
      role: OnlineRole;
    }
  | {
      type: 'SYNC_STATE';
      syncState: OnlineSyncStatePayload;
    }
  | {
      type: 'REQUEST_SYNC';
      fromId: string;
    };
