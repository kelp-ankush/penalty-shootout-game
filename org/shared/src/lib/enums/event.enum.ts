export enum EventType {
  USER_LEFT = 'user-left',
}

export enum SubscriptionType {
  CREATE_ROOM = 'create-room',
  ROOM_CREATED = 'roomCreated',
  JOIN_ROOM = 'join-room',
  JOINED_ROOM = 'joined-room',
  JOIN_SPECIFIC_ROOM = 'join-specific-room',
  TAKE_SHOT = 'take-shot',
  SHOT_COMPLETE = 'shot-complete',
  GOALKIE_DIVE = 'goalkie-dive',
  LEAVE_ROOM = 'leave-room',
  ROOMS_UPDATE = 'rooms-update',
  ROOM_UPDATE = 'room-update',
  ROOM_READY = 'room-ready',
  INITITATED_GAME = 'initiated-game',
  SHOT_INFORMATION = 'shot-information',
  RESULT_UPDATED = 'result-updated',
}

