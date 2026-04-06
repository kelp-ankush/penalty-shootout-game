export interface IGame {
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

export interface IPoint {
  x: number,
  y: number
}

export interface IShotData {
  userId: string;
  roomId: string;
  power: number;
  destPos: IPoint;
}

export interface IShotComplete {
  userId: string;
  roomId: string;
  isGoal: boolean;
  turn: string;
}

export interface IGoalieDive {
  userId: string;
  roomId: string;
  destPos: IPoint;
}

export interface IShotEvent {
  data: IShotData;
  game: IGame;
}

/** Goalie dive event */
export interface IGoalieDiveEvent {
  destPos: IPoint;
}

/** Result update event */
export interface IResultUpdateEvent {
  game: IGame;
}

/** Cached shot */
export interface ICachedShot {
  userId: string;
  roomId: string;
  isGoal: boolean;
  turn: string;
}

export interface IRoomUpdateEvent {
  event: string;
  userId: string;
  msg: string;
}
