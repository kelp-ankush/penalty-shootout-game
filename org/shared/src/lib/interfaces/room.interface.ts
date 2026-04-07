import { EventType } from '../enums/event.enum';

export interface IRoom {
  id: string;
  users: string[];
  isLocked: boolean;
}

export interface ILeaveRoom {
  roomId: string;
  eventType: EventType;
}
