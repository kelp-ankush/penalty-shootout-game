import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RoomService } from './rooms.service';
import { MatchService } from './match.service';
import { Game } from '../core/interfaces/game.interface';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:4200', 'https://penalty-shoots-ashy.vercel.app'],
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private clientIdToUserIdMap: Map<string, string> = new Map();

  constructor(
    private roomService: RoomService,
    private matchService: MatchService,
  ) { }


  handleConnection(client: Socket) {
    console.log('client connected:', client.id, client.handshake.auth.userId);
    this.clientIdToUserIdMap.set(
      client.id,
      client.handshake.auth.userId,
    );
    this.server.emit('roomsUpdate', this.roomService.getAvailableRooms());
  }

  handleDisconnect(client: Socket) {
    console.log('client disconnected:', client.id, client.handshake.auth.userId);

    const userId = this.clientIdToUserIdMap.get(client.id) || '';
    const roomIds = this.roomService.removeUserFromRooms(userId);

    for (const roomId of roomIds) {
      this.server.to(roomId).emit('roomUpdate', {
        event: 'user-left',
        msg: `Your opponent has left the room, start a fresh game!`,
        userId,
      });
    }
    this.server.emit('roomsUpdate', this.roomService.getAvailableRooms());

    this.clientIdToUserIdMap.delete(client.id);
  }

  @SubscribeMessage('createRoom')
  async handleCreateRoom(@ConnectedSocket() client: Socket) {
    const userId = this.clientIdToUserIdMap.get(client.id) || "";
    const room = this.roomService.createRoom(userId);

    await client.join(room.id);

    this.server.emit('roomsUpdate', this.roomService.getAvailableRooms());

    return { event: 'roomCreated', data: room };
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(@ConnectedSocket() client: Socket) {
    const userId = this.clientIdToUserIdMap.get(client.id) || "";
    const room = this.roomService.joinRoom(userId);

    if (!room) {
      return { event: 'error', data: 'No available rooms' };
    }

    await client.join(room.id);

    this.server.to(room.id).emit('roomReady', room);
    this.server.emit('roomsUpdate', this.roomService.getAvailableRooms());

    const game = this.handleStartGame(room.id);
    return { event: 'joinedRoom', data: room, game };
  }

  @SubscribeMessage('joinSpecificRoom')
  async handleJoinSpecificRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    const userId = this.clientIdToUserIdMap.get(client.id) || '';
    const room = this.roomService.joinSpecificRoom(userId, data.roomId);

    if (!room) {
      return { event: 'error', data: 'No available rooms' };
    }

    await client.join(room.id);

    this.server.to(room.id).emit('roomReady', room);

    const game = this.handleStartGame(room.id);
    this.server.emit('roomsUpdate', this.roomService.getAvailableRooms());

    return { event: 'joinedRoom', data: room, game };
  }

  handleStartGame(roomId: string): Game {
    const room = this.roomService.getRoomByRoomId(roomId);
    if (!room) return;

    const game = this.matchService.createGame(room.id, room.users);

    this.server.to(room.id).emit('initiatedGame', game);
    return game;
  }

  @SubscribeMessage('takeShot')
  handleTakeShotGame(@MessageBody() data: {
    userId: string;
    roomId: string;
    power: string;
    destPos: { x: string; y: string };
  },
  ) {
    const game = this.matchService.getGame(data.roomId);
    if (!game || game.isFinished) return;

    this.server.to(data.roomId).emit('shotInformation', { data, game });
  }

  @SubscribeMessage('shotComplete')
  handleShotComplete(
    @MessageBody()
    data: {
      userId: string;
      roomId: string;
      isGoal: boolean;
      turn: string;
    },
  ) {
    const room = this.roomService.getRoomByRoomId(data.roomId);
    if (!room) return;

    const updatedGame = this.matchService.updateScore(data);
    if (!updatedGame) return;

    this.server.to(data.roomId).emit('resultUpdated', { game: updatedGame });
  }

  @SubscribeMessage('goalkieDive')
  handleGoalkieDive(
    @MessageBody()
    data: {
      userId: string;
      roomId: string;
      destPos: { x: string; y: string };
    },
  ) {
    this.server.to(data.roomId).emit('goalkieDive', data);
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      userId: string;
      roomId: string;
      eventType: string;
    },
  ) {
    if (data.eventType === 'user-left') {
      const roomIds = this.roomService.removeUserFromRooms(
        this.clientIdToUserIdMap.get(client.id) || '',
      );

      for (const roomId of roomIds) {
        const res = {
          event: 'user-left',
          msg: `Your opponent has left the room due to resize-window, start a fresh game!`,
          userId: data.userId,
        };

        this.server.to(roomId).emit('roomUpdate', res);
      }
      this.server.emit('roomsUpdate', this.roomService.getAvailableRooms());
    } else {
      const room = this.roomService.getRoomByRoomId(data.roomId);
      if (!room) return;

      this.roomService.leaveRoom(data.userId, data.roomId);
      this.server
        .to(data.roomId)
        .emit('roomsUpdate', this.roomService.getAvailableRooms());
    }
  }
}