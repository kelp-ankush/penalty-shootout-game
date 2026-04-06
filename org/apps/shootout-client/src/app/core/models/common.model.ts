/**
 * Represents a game room
 */
export interface IRoom {
  id: string;
  users: string[];
  isLocked: boolean;
}

/** Game state */
export interface IGame {
  turn: string;
  players: string[];
  score: Record<string, number>;
  shots: Record<string, number[]>;
  winner?: string | null;
}