import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, OnInit, signal } from '@angular/core';
import { ASSETS } from './core/utils/images.constants';
import { Play } from './features/play/components/play.component';
import { SocketService } from './core/services/socket.service';
import { ImagePreloadService } from './core/services/image-preload.service';
import { inject } from '@angular/core';
import { EventType, IRoom, IRoomUpdateEvent } from '@org/shared';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  imports: [Play],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  userId = '';
  rooms = signal<IRoom[]>([]);
  status = signal<string>('');
  currentRoom = signal<IRoom | null>(null);
  userLeft = signal<string>('');
  socketService = inject(SocketService);
  imagePreloadService = inject(ImagePreloadService);
  private destroyRef = inject(DestroyRef);

  constructor() {
    this.userId = this.generateOrGetUserId();
  }

  ngOnInit(): void {
    this.preloadAssets();
    this.listenToSocketEvents();
  }

  @HostListener('window:resize')
  onResize(): void {
    if (this.currentRoom()) {
      this.leaveRoom(EventType.USER_LEFT);
    }
  }

  private generateOrGetUserId(): string {
    let localUserId = window.localStorage.getItem('userId');

    if (!localUserId) {
      localUserId = Array.from({ length: 6 }, () => Math.floor(Math.random() * 10)).join('');
      window.localStorage.setItem('userId', localUserId);
    }

    return localUserId;
  }

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

  private listenToSocketEvents(): void {
    this.socketService
      .onRoomsUpdate()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((rooms: IRoom[]) => {
        this.rooms.set(rooms);
        this.status.set('Available rooms fetched');
      });

    this.socketService
      .onRoomUpdate()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data: IRoomUpdateEvent) => {
        if (data.event === EventType.USER_LEFT) {
          this.handleUserLeftEvent(data);
        }
      });

    this.socketService
      .onRoomReady()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((room: IRoom) => {
        this.currentRoom.set(room);
        window.localStorage.setItem('current-room', JSON.stringify(room));
        this.status.set('Room full, Game ready!');
      });

    this.socketService
      .onRoomCreated()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((room: IRoom) => {
        this.currentRoom.set(room);
        window.localStorage.setItem('current-room', JSON.stringify(room));
        this.status.set('Joined the room, waiting for another user!');
      });
  }

  private handleUserLeftEvent(data: IRoomUpdateEvent): void {
    this.currentRoom.set(null);
    window.localStorage.removeItem('current-room');

    const message =
      data.userId !== this.userId
        ? data.msg
        : 'You resized the window, which is strictly not allowed! Start a fresh game.';

    this.userLeft.set(message);

    setTimeout(() => {
      this.userLeft.set('');
    }, 2000);
  }

  createRoom(): void {
    this.socketService.createRoom();
  }

  joinRoom(): void {
    this.socketService.joinRoom();
  }

  joinSpecificRoom(roomId: string): void {
    this.socketService.joinSpecificRoom(roomId);
  }

  leaveRoom(eventType: EventType): void {
    const room = this.currentRoom();

    if (!room) {
      console.warn('No room to leave');
      return;
    }

    this.socketService.leaveRoom({ roomId: room.id, eventType });
    this.rooms.set(this.rooms().filter((r) => r.id !== room.id));
  }
}
