import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Socket, io } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import {
  IRoomUpdateEvent,
} from '../models/socket.model';
import { IRoom } from '../models/common.model';
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
    this.emit('createRoom');
  }

  /** Joins a random room */
  joinRoom(): void {
    this.emit('joinRoom');
  }

  /** Joins a specific room */
  joinSpecificRoom(roomId: string): void {
    this.emit('joinSpecificRoom', { roomId });
  }

  /** Leaves room */
  leaveRoom(roomId: string, eventType: string): void {
    this.emit('leaveRoom', {
      roomId,
      eventType,
    });
  }

  /** Room list updates */
  onRoomsUpdate(): Observable<IRoom[]> {
    return this.listen<IRoom[]>('roomsUpdate');
  }

  /** Room updates */
  onRoomUpdate(): Observable<IRoomUpdateEvent> {
    return this.listen<IRoomUpdateEvent>('roomUpdate');
  }

  /** Room ready */
  onRoomReady(): Observable<IRoom> {
    return this.listen<IRoom>('roomReady');
  }

  /** Room created */
  onRoomCreated(): Observable<IRoom> {
    return this.listen<IRoom>('roomCreated');
  }
}
