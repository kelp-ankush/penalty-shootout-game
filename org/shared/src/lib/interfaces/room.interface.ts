export interface IRoom {
  id: string;
  users: string[];
  isLocked: boolean;
}

export interface ILeaveRoom{
  userId: string;
  roomId: string;
  eventType: string;
}