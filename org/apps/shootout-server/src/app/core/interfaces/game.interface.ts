export interface Game {
  roomId: string;
  players: string[];
  turn: string;
  score: Record<string, number>;
  shots: Record<string, number[]>;
  round: number;
  maxRounds: number;
  isFinished: boolean;
  winner: string | null;
}