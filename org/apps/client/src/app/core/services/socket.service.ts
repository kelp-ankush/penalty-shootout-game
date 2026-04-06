import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Socket, io } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { IGame, IGoalieDive, IResultUpdateEvent, IRoom, IRoomUpdateEvent, IShotComplete, IShotData, IShotEvent, SubscriptionType } from '@org/shared-types';


@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private readonly socket: Socket;

  private readonly userId: string;

  
  constructor() {
    this.userId = this.getOrCreateUserId();

    this.socket = io(environment.apiUrl, {
      auth: { userId: this.userId },
    });
  }


  private getOrCreateUserId(): string {
    let id = window.localStorage.getItem('userId');

    if (!id) {
      id = Array.from({ length: 6 }, () => Math.floor(Math.random() * 10)).join('');
      window.localStorage.setItem('userId', id);
    }

    return id;
  }


  private emit<T>(event: string, data?: T): void {
    if (data) {
      this.socket.emit(event, data);
    } else {
      this.socket.emit(event);
    }
  }

  private listen<T>(event: string): Observable<T> {
    return new Observable<T>((observer) => {
      const handler = (data: T) => observer.next(data);

      this.socket.on(event, handler);

      return () => this.socket.off(event, handler);
    });
  }

  createRoom(): void {
    this.emit(SubscriptionType.CREATE_ROOM);
  }

  joinRoom(): void {
    this.emit(SubscriptionType.JOIN_ROOM);
  }

  joinSpecificRoom(roomId: string): void {
    this.emit(SubscriptionType.JOIN_SPECIFIC_ROOM, roomId);
  }

  shootBall(data: IShotData): void {
    this.emit<IShotData>(SubscriptionType.TAKE_SHOT, data);
  }

  shotComplete(data: IShotComplete): void {
    this.emit<IShotComplete>(SubscriptionType.SHOT_COMPLETE, data);
  }

  goalkieDive(data: IGoalieDive): void {
    this.emit<IGoalieDive>(SubscriptionType.GOALKIE_DIVE, data);
  }

  leaveRoom(roomId: string, eventType: string): void {
    this.emit(SubscriptionType.LEAVE_ROOM, {
      roomId,
      eventType,
    });
  }

  onRoomsUpdate(): Observable<IRoom[]> {
    return this.listen<IRoom[]>(SubscriptionType.ROOMS_UPDATE);
  }

  onRoomUpdate(): Observable<IRoomUpdateEvent> {
    return this.listen<IRoomUpdateEvent>(SubscriptionType.ROOM_UPDATE);
  }

  onRoomReady(): Observable<IRoom> {
    return this.listen<IRoom>(SubscriptionType.ROOM_READY);
  }

  onRoomCreated(): Observable<IRoom> {
    return this.listen<IRoom>(SubscriptionType.ROOM_CREATED);
  }

  onGameStart(): Observable<IGame> {
    return this.listen(SubscriptionType.INITITATED_GAME);
  }

  onTakeShot(): Observable<IShotEvent> {
    return this.listen<IShotEvent>(SubscriptionType.SHOT_INFORMATION);
  }

  onResultUpdate(): Observable<IResultUpdateEvent> {
    return this.listen<IResultUpdateEvent>(SubscriptionType.RESULT_UPDATED);
  }

  onGoalkieDive(): Observable<IGoalieDive> {
    return this.listen<IGoalieDive>(SubscriptionType.GOALKIE_DIVE);
  }
}
