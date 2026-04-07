import { Injectable } from '@nestjs/common';
import { IRoom } from '@org/shared';
import { randomUUID } from 'crypto';

@Injectable()
export class RoomService {
  private rooms: IRoom[] = [];

  getAvailableRooms() {
    return this.rooms.filter((room) => !room.isLocked);
  }

  getRoomByRoomId(roomId: string) {
    return this.rooms.find((room) => room.id === roomId);
  }

  createRoom(userId: string): IRoom {
    const room: IRoom = {
      id: randomUUID(),
      users: [userId],
      isLocked: false,
    };

    this.rooms.push(room);
    return room;
  }

  joinRoom(userId: string): IRoom | null {
    const availabeRoom = this.rooms.find(
      (room) => !room.isLocked && room.users.length === 1
    );

    if (!availabeRoom) {
      return null;
    }
    availabeRoom.users.push(userId);
    if (availabeRoom.users.length === 2) {
      availabeRoom.isLocked = true;
    }

    return availabeRoom;
  }

  joinSpecificRoom(userId: string, roomId: string): IRoom | null {
    const availabeRoom = this.rooms.find(
      (room) => !room.isLocked && room.users.length === 1 && room.id === roomId
    );

    if (!availabeRoom) {
      return null;
    }
    availabeRoom.users.push(userId);
    if (availabeRoom.users.length === 2) {
      availabeRoom.isLocked = true;
    }

    return availabeRoom;
  }

  leaveRoom(userId: string, roomId: string): void {
    const room = this.rooms.find((room) => room.id === roomId);
    if (!room) return;

    room.users = room.users.filter((user) => user !== userId);
    room.isLocked = false;
    if (room.users.length === 0) {
      this.rooms = this.rooms.filter((r) => r.id !== roomId);
    }
  }

  removeUserFromRooms(userId: string): string[] {
    const roomIds: string[] = [];

    this.rooms = this.rooms.filter((room) => {
      if (room.users.includes(userId)) {
        roomIds.push(room.id);
        return false;
      }
      return true;
    });
    return roomIds;
  }
}
