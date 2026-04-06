import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Socket, io } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { IGame, IGoalieDive, IResultUpdateEvent, IRoom, IRoomUpdateEvent, IShotComplete, IShotData, IShotEvent, SubscriptionType } from '@org/shared-types';

/**
 * Handles all socket communication
 */
@Injectable({
  providedIn: 'root',
})
export class SocketService {
  /** Socket instance */
  private readonly socket: Socket;

  /** Current user ID */
  private readonly userId: string;

  /**
   * Initializes socket connection
   */
  constructor() {
    this.userId = this.getOrCreateUserId();

    this.socket = io(environment.apiUrl, {
      auth: { userId: this.userId },
    });
  }

  /**
   * Generates or retrieves user ID
   */
  private getOrCreateUserId(): string {
    let id = window.localStorage.getItem('userId');

    if (!id) {
      id = Array.from({ length: 6 }, () => Math.floor(Math.random() * 10)).join('');
      window.localStorage.setItem('userId', id);
    }

    return id;
  }

  /**
   * Emits socket event
   */
  private emit<T>(event: string, data?: T): void {
    if (data) {
      this.socket.emit(event, data);
    } else {
      this.socket.emit(event);
    }
  }

  /**
   * Creates observable from socket event
   */
  private listen<T>(event: string): Observable<T> {
    return new Observable<T>((observer) => {
      const handler = (data: T) => observer.next(data);

      this.socket.on(event, handler);

      return () => this.socket.off(event, handler);
    });
  }

  /** Creates a new room */
  createRoom(): void {
    this.emit(SubscriptionType.CREATE_ROOM);
  }

  /** Joins a random room */
  joinRoom(): void {
    this.emit(SubscriptionType.JOIN_ROOM);
  }

  /** Joins a specific room */
  joinSpecificRoom(roomId: string): void {
    this.emit(SubscriptionType.JOIN_SPECIFIC_ROOM, roomId);
  }

  /** Sends shot event */
  shootBall(data: IShotData): void {
    this.emit<IShotData>(SubscriptionType.TAKE_SHOT, data);
  }

  /** Sends shot completion */
  shotComplete(data: IShotComplete): void {
    this.emit<IShotComplete>(SubscriptionType.SHOT_COMPLETE, data);
  }

  /** Sends goalie dive */
  goalkieDive(data: IGoalieDive): void {
    this.emit<IGoalieDive>(SubscriptionType.GOALKIE_DIVE, data);
  }

  /** Leaves room */
  leaveRoom(roomId: string, eventType: string): void {
    this.emit(SubscriptionType.LEAVE_ROOM, {
      roomId,
      eventType,
    });
  }

  /** Room list updates */
  onRoomsUpdate(): Observable<IRoom[]> {
    return this.listen<IRoom[]>(SubscriptionType.ROOMS_UPDATE);
  }

  /** Room updates */
  onRoomUpdate(): Observable<IRoomUpdateEvent> {
    return this.listen<IRoomUpdateEvent>(SubscriptionType.ROOM_UPDATE);
  }

  /** Room ready */
  onRoomReady(): Observable<IRoom> {
    return this.listen<IRoom>(SubscriptionType.ROOM_READY);
  }

  /** Room created */
  onRoomCreated(): Observable<IRoom> {
    return this.listen<IRoom>(SubscriptionType.ROOM_CREATED);
  }

  /** Game start */
  onGameStart(): Observable<IGame> {
    return this.listen(SubscriptionType.INITITATED_GAME);
  }

  /** Shot info */
  onTakeShot(): Observable<IShotEvent> {
    return this.listen<IShotEvent>(SubscriptionType.SHOT_INFORMATION);
  }

  /** Result update */
  onResultUpdate(): Observable<IResultUpdateEvent> {
    return this.listen<IResultUpdateEvent>(SubscriptionType.RESULT_UPDATED);
  }

  /** Goalie dive event */
  onGoalkieDive(): Observable<IGoalieDive> {
    return this.listen<IGoalieDive>(SubscriptionType.GOALKIE_DIVE);
  }
}
