import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnInit,
  OnDestroy,
  signal,
} from '@angular/core';
import { debounceTime, delay, of, Subject, switchMap, takeUntil } from 'rxjs';
import { ASSETS } from './core/utils/images.constants';
import { Play } from './features/play/components/play.component';
import { SocketService } from './core/services/socket.service';
import { ImagePreloadService } from './core/services/image-preload.service';
import { inject } from '@angular/core';
import { EventType, IRoom, IRoomUpdateEvent } from "@org/shared-types"

/**
 * Root component handling room lifecycle and socket events
 */
@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  imports: [Play],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit, OnDestroy {
  /** Unique user identifier */
  userId = '';

  /** Available rooms list */
  rooms = signal<IRoom[]>([]);

  /** Current UI status message */
  status = signal<string>('');

  /** Currently active room */
  currentRoom = signal<IRoom | null>(null);

  /** Message when a user leaves */
  userLeft = signal<string>('');

  /** Emits user-left messages */
  private readonly userLeft$ = new Subject<string>();

  /** Destroy notifier for unsubscribing */
  private readonly destroy$ = new Subject<void>();

  socketService = inject(SocketService);
  imagePreloadService = inject(ImagePreloadService);

  /**
   * Initializes component and assigns user ID
   * @param socketService Handles socket communication
   * @param imagePreload Service for preloading images
   */
  constructor() {
    this.userId = this.generateOrGetUserId();
  }

  /**
   * Generates or retrieves user ID from localStorage
   * @returns Generated or existing user ID
   */
  private generateOrGetUserId(): string {
    let localUserId = window.localStorage.getItem('userId');

    if (!localUserId) {
      localUserId = Array.from({ length: 6 }, () =>
        Math.floor(Math.random() * 10),
      ).join('');
      window.localStorage.setItem('userId', localUserId);
    }

    return localUserId;
  }

  /**
   * Handles window resize event
   * Leaves room if user resizes screen
   */
  @HostListener('window:resize')
  onResize(): void {
    if (this.currentRoom()) {
      this.leaveRoom(EventType.USER_LEFT);
    }
  }

  /**
   * Lifecycle hook - Initializes subscriptions and preload logic
   */
  ngOnInit(): void {
    this.handleUserLeftMessage();
    this.preloadAssets();
    this.listenToSocketEvents();
  }

  /**
   * Cleans up subscriptions
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Handles debounced user-left messages
   */
  private handleUserLeftMessage(): void {
    this.userLeft$
      .pipe(
        debounceTime(300),
        switchMap((msg: string) => {
          this.userLeft.set(msg);
          return of(null).pipe(delay(2000));
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(() => this.userLeft.set(''));
  }

  /**
   * Preloads required game assets
   */
  private preloadAssets(): void {
    this.imagePreloadService.preloadImages([
      ASSETS.PLAYER.BLUE,
      ASSETS.PLAYER.RED,
      ASSETS.GOALKEEPER.JUMP,
      ASSETS.GOALKEEPER.RIGHT,
      ASSETS.GOALKEEPER.LEFT,
      ASSETS.ENVIRONMENT.FIELD,
      ASSETS.ENVIRONMENT.AUDIENCE,
      ASSETS.ENVIRONMENT.NETS,
    ]);
  }

  /**
   * Subscribes to all socket events
   */
  private listenToSocketEvents(): void {
    this.socketService
      .onRoomsUpdate()
      .pipe(takeUntil(this.destroy$))
      .subscribe((rooms: IRoom[]) => {
        this.rooms.set(rooms);
        this.status.set('Available rooms fetched');
      });

    this.socketService
      .onRoomUpdate()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: IRoomUpdateEvent) => {
        if (data.event === EventType.USER_LEFT) {
          this.handleUserLeftEvent(data);
        }
      });

    this.socketService
      .onRoomReady()
      .pipe(takeUntil(this.destroy$))
      .subscribe((room: IRoom) => {
        this.currentRoom.set(room);
        window.localStorage.setItem('current-room', JSON.stringify(room));
        this.status.set('Room full, Game ready!');
      });

    this.socketService
      .onRoomCreated()
      .pipe(takeUntil(this.destroy$))
      .subscribe((room: IRoom) => {
        this.currentRoom.set(room);
        window.localStorage.setItem('current-room', JSON.stringify(room));
        this.status.set('Joined the room, waiting for another user!');
      });
  }

  /**
   * Handles user-left socket event
   * @param data Event payload
   */
  private handleUserLeftEvent(data: IRoomUpdateEvent): void {
    this.currentRoom.set(null);
    window.localStorage.removeItem('current-room');

    const message =
      data.userId !== this.userId
        ? data.msg
        : 'You resized the window, which is strictly not allowed! Start a fresh game.';

    this.userLeft$.next(message);
  }

  /**
   * Creates a new room
   */
  createRoom(): void {
    this.socketService.createRoom();
  }

  /**
   * Joins a random room
   */
  joinRoom(): void {
    this.socketService.joinRoom();
  }

  /**
   * Joins a specific room
   * @param roomId Room identifier
   */
  joinSpecificRoom(roomId: string): void {
    this.socketService.joinSpecificRoom(roomId);
  }

  /**
   * Leaves the current room
   * @param eventType Optional event type
   */
  leaveRoom(eventType = ''): void {
    const room = this.currentRoom();

    if (!room) {
      console.warn('No room to leave');
      return;
    }

    this.socketService.leaveRoom(room.id, eventType);
    this.rooms.set(this.rooms().filter((r) => r.id !== room.id));
  }
}
