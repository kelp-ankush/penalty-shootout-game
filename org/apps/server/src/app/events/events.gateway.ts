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
import { Logger } from '@nestjs/common';
import { EventType, IGame, IGoalieDive, ILeaveRoom, IShotComplete, IShotData, SubscriptionType } from '@org/shared-types'

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
  private readonly logger = new Logger(EventsGateway.name)

  constructor(
    private roomService: RoomService,
    private matchService: MatchService,
  ) { }


  handleConnection(client: Socket) {
   this.logger.log(`client connected: ${client.id} with user-id: ${client.handshake.auth.userId}`);
    this.clientIdToUserIdMap.set(
      client.id,
      client.handshake.auth.userId,
    );
    this.server.emit(SubscriptionType.ROOMS_UPDATE, this.roomService.getAvailableRooms());
  }

  handleDisconnect(client: Socket) {
   this.logger.log(`client disconnected: ${client.id} with user-id: ${client.handshake.auth.userId}`);

    const userId = this.clientIdToUserIdMap.get(client.id) || '';
    const roomIds = this.roomService.removeUserFromRooms(userId);

    for (const roomId of roomIds) {
      this.server.to(roomId).emit(SubscriptionType.ROOM_UPDATE, {
        event: 'user-left',
        msg: `Your opponent has left the room, start a fresh game!`,
        userId,
      });
    }
    this.server.emit(SubscriptionType.ROOMS_UPDATE, this.roomService.getAvailableRooms());

    this.clientIdToUserIdMap.delete(client.id);
  }

  @SubscribeMessage(SubscriptionType.CREATE_ROOM)
  async handleCreateRoom(@ConnectedSocket() client: Socket) {
    const userId = this.clientIdToUserIdMap.get(client.id) || "";
    const room = this.roomService.createRoom(userId);

    await client.join(room.id);

    this.server.emit(SubscriptionType.ROOMS_UPDATE, this.roomService.getAvailableRooms());

    return { event: SubscriptionType.ROOM_CREATED, data: room };
  }

  @SubscribeMessage(SubscriptionType.JOIN_ROOM)
  async handleJoinRoom(@ConnectedSocket() client: Socket) {
    const userId = this.clientIdToUserIdMap.get(client.id) || "";
    const room = this.roomService.joinRoom(userId);

    if (!room) {
      return { event: 'error', data: 'No available rooms' };
    }

    await client.join(room.id);

    this.server.to(room.id).emit(SubscriptionType.ROOM_READY, room);
    this.server.emit(SubscriptionType.ROOMS_UPDATE, this.roomService.getAvailableRooms());

    const game = this.handleStartGame(room.id);
    return { event: SubscriptionType.JOINED_ROOM, data: room, game };
  }

  @SubscribeMessage(SubscriptionType.JOIN_SPECIFIC_ROOM)
  async handleJoinSpecificRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() roomId: string,
  ) {
    const userId = this.clientIdToUserIdMap.get(client.id) || '';
    const room = this.roomService.joinSpecificRoom(userId, roomId);

    if (!room) {
      return { event: 'error', data: 'No available rooms' };
    }

    await client.join(room.id);

    this.server.to(room.id).emit(SubscriptionType.ROOM_READY, room);

    const game = this.handleStartGame(room.id);
    this.server.emit(SubscriptionType.ROOMS_UPDATE, this.roomService.getAvailableRooms());

    return { event: SubscriptionType.JOINED_ROOM, data: room, game };
  }

  handleStartGame(roomId: string): IGame {
    const room = this.roomService.getRoomByRoomId(roomId);
    if (!room) return;

    const game = this.matchService.createGame(room.id, room.users);

    this.server.to(room.id).emit(SubscriptionType.INITITATED_GAME, game);
    return game;
  }

  @SubscribeMessage(SubscriptionType.TAKE_SHOT)
  handleTakeShotGame(@MessageBody() data: IShotData,
  ) {
    const game = this.matchService.getGame(data.roomId);
    if (!game || game.isFinished) return;

    this.server.to(data.roomId).emit(SubscriptionType.SHOT_INFORMATION, { data, game });
  }

  @SubscribeMessage(SubscriptionType.SHOT_COMPLETE)
  handleShotComplete(
    @MessageBody()
    data: IShotComplete,
  ) {
    const room = this.roomService.getRoomByRoomId(data.roomId);
    if (!room) return;

    const updatedGame = this.matchService.updateScore(data);
    if (!updatedGame) return;

    this.server.to(data.roomId).emit(SubscriptionType.RESULT_UPDATED, { game: updatedGame });
  }

  @SubscribeMessage('goalkieDive')
  handleGoalkieDive(
    @MessageBody()
    data: IGoalieDive,
  ) {
    this.server.to(data.roomId).emit(SubscriptionType.GOALKIE_DIVE, data);
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: ILeaveRoom,
  ) {
    if (data.eventType === EventType.USER_LEFT) {
      const roomIds = this.roomService.removeUserFromRooms(
        this.clientIdToUserIdMap.get(client.id) || '',
      );

      for (const roomId of roomIds) {
        const res = {
          event: EventType.USER_LEFT,
          msg: `Your opponent has left the room due to resize-window, start a fresh game!`,
          userId: data.userId,
        };

        this.server.to(roomId).emit(SubscriptionType.ROOM_UPDATE, res);
      }
      this.server.emit(SubscriptionType.ROOMS_UPDATE, this.roomService.getAvailableRooms());
    } else {
      const room = this.roomService.getRoomByRoomId(data.roomId);
      if (!room) return;

      this.roomService.leaveRoom(data.userId, data.roomId);
      this.server
        .to(data.roomId)
        .emit(SubscriptionType.ROOMS_UPDATE, this.roomService.getAvailableRooms());
    }
  }
}