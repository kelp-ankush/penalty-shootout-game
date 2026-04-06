import { IGame } from "../../../../core/models/common.model";

/**
 * @export
 * @interface Point
 * @typedef {Point}
 */
export interface Point {
  x: number;
  y: number;
}

/** Shot event */
export interface IShotEvent {
  data: {
    userId: string;
      roomId: string;
      power: string;
      destPos: Point;

  };
  game: IGame;
}

/** Goalie dive event */
export interface IGoalieDiveEvent {
  destPos: { x: number; y: number };
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