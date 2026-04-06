import { IGame } from "./common.model";

/** Position coordinates */
export interface IPosition {
  x: number;
  y: number;
}

/** Room update event payload */
export interface IRoomUpdateEvent {
  event: string;
  userId: string;
  msg: string;
}

/** Shot data payload */
export interface IShotData {
  userId: string;
  roomId: string;
  power: number;
  destPos: IPosition;
}

/** Shot result payload */
export interface IShotResult {
  game: IGame;
}

export interface IShotComplete {
  userId: string;
  roomId: string;
  isGoal: boolean;
  turn: string;
}

/** Goalie dive payload */
export interface IGoalieDive {
  userId: string;
  roomId: string;
  destPos: IPosition;
}