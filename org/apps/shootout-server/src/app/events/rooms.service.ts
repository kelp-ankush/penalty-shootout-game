import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

/**
 * @export
 * @interface IRoom
 * @typedef {IRoom}
 */
export interface IRoom {
  /**
   *@type {string}
   */
  id: string;
  /**
   *@type {string[]}
   */
  users: string[];
  /**
   *@type {boolean}
   */
  isLocked: boolean;
}

/**
 * @export
 * @class RoomService
 * @typedef {RoomService}
 */
@Injectable()
export class RoomService {
  /**
   *@private
   * @type {IRoom[]}
   */
  private rooms: IRoom[] = [];

  /**
   *@returns {*}
   */
  getAvailableRooms() {
    return this.rooms.filter((room) => !room.isLocked);
  }

  /**
   *@param {string} roomId
   * @returns {*}
   */
  getRoomByRoomId(roomId: string) {
    return this.rooms.find((room) => room.id === roomId);
  }

  /**
   *@param {string} userId
   * @returns {IRoom}
   */
  createRoom(userId: string): IRoom {
    const room: IRoom = {
      id: randomUUID(),
      users: [userId],
      isLocked: false,
    };

    this.rooms.push(room);
    return room;
  }

  /**
   *@param {string} userId
   * @returns {(IRoom | null)}
   */
  joinRoom(userId: string): IRoom | null {
    const availabeRoom = this.rooms.find(
      (room) => !room.isLocked && room.users.length === 1,
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

  /**
   *@param {string} userId
   * @param {string} roomId
   * @returns {(IRoom | null)}
   */
  joinSpecificRoom(userId: string, roomId: string): IRoom | null {
    const availabeRoom = this.rooms.find(
      (room) => !room.isLocked && room.users.length === 1 && room.id === roomId,
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

  /**
   *@param {string} userId
   * @param {string} roomId
   */
  leaveRoom(userId: string, roomId: string) {
    const room = this.rooms.find((room) => room.id === roomId);
    if (!room) return;

    room.users = room.users.filter((user) => user !== userId);
    room.isLocked = false;
    if (room.users.length === 0) {
      this.rooms = this.rooms.filter((r) => r.id !== roomId);
    }
  }

  /**
   *@param {string} userId
   * @returns {{}}
   */
  removeUserFromRooms(userId: string) {
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
