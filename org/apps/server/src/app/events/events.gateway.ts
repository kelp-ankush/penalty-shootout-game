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
import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { EventType, IGame, IRoom, SubscriptionType } from '@org/shared';
import { IEventResponse } from '../core/interfaces/event.interface';
import {
  GoalieDiveDto,
  JoinSpecificRoomDto,
  LeaveRoomDto,
  ShotCompleteDto,
  TakeShotGameDto,
} from '../core/dto/event.dto';

@UsePipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
  }),
)
@WebSocketGateway({
  namespace: '/game',
  path: '/ws',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private clientIdToUserIdMap: Map<string, string> = new Map();
  private readonly logger = new Logger(EventsGateway.name);

  constructor(private roomService: RoomService, private matchService: MatchService) {}

  handleConnection(client: Socket): void {
    this.logger.log(`client connected: ${client.id} with user-id: ${client.handshake.auth.userId}`);
    this.clientIdToUserIdMap.set(client.id, client.handshake.auth.userId);
    this.server.emit(SubscriptionType.ROOMS_UPDATE, this.roomService.getAvailableRooms());
  }

  handleDisconnect(client: Socket): void {
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
  async handleCreateRoom(@ConnectedSocket() client: Socket): Promise<{ event: SubscriptionType; data: IRoom }> {
    const userId = this.clientIdToUserIdMap.get(client.id) || '';
    const room = this.roomService.createRoom(userId);

    await client.join(room.id);

    this.server.emit(SubscriptionType.ROOMS_UPDATE, this.roomService.getAvailableRooms());

    return { event: SubscriptionType.ROOM_CREATED, data: room };
  }

  @SubscribeMessage(SubscriptionType.JOIN_ROOM)
  async handleJoinRoom(@ConnectedSocket() client: Socket): Promise<IEventResponse> {
    const userId = this.clientIdToUserIdMap.get(client.id) || '';
    const room = this.roomService.joinRoom(userId);

    if (!room) {
      this.logger.fatal(`No room available`);
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
    @MessageBody() data: JoinSpecificRoomDto,
  ): Promise<IEventResponse> {
    const userId = this.clientIdToUserIdMap.get(client.id) || '';
    const room = this.roomService.joinSpecificRoom(userId, data.roomId);

    if (!room) {
      this.logger.fatal(`No room available with roomId: ${data.roomId}`);
    }

    await client.join(room.id);

    this.server.to(room.id).emit(SubscriptionType.ROOM_READY, room);

    const game = this.handleStartGame(room.id);
    this.server.emit(SubscriptionType.ROOMS_UPDATE, this.roomService.getAvailableRooms());

    return { event: SubscriptionType.JOINED_ROOM, data: room, game };
  }

  handleStartGame(roomId: string): IGame {
    const room = this.roomService.getRoomByRoomId(roomId);
    if (!room) {
      this.logger.fatal(`No room available with roomId: ${roomId}`);
    }

    const game = this.matchService.createGame(room.id, room.users);

    this.server.to(room.id).emit(SubscriptionType.INITITATED_GAME, game);

    return game;
  }

  @SubscribeMessage(SubscriptionType.TAKE_SHOT)
  handleTakeShotGame(@MessageBody() data: TakeShotGameDto): void {
    const game = this.matchService.getGame(data.roomId);
    if (!game) {
      this.logger.fatal(`No game available with roomId: ${data.roomId}`);
    }

    if (game.isFinished) {
      this.logger.fatal(`The game has been finished!`);
    }

    this.server.to(data.roomId).emit(SubscriptionType.SHOT_INFORMATION, { data, game });
  }

  @SubscribeMessage(SubscriptionType.SHOT_COMPLETE)
  handleShotComplete(
    @MessageBody()
    data: ShotCompleteDto,
  ): void {
    const room = this.roomService.getRoomByRoomId(data.roomId);
    if (!room) {
      this.logger.fatal(`No room available with roomId: ${data.roomId}`);
    }

    const updatedGame = this.matchService.updateScore(data);
    if (!updatedGame) {
      this.logger.fatal(`No room available with roomId: ${updatedGame.roomId}`);
    }

    this.server.to(data.roomId).emit(SubscriptionType.RESULT_UPDATED, { game: updatedGame });
  }

  @SubscribeMessage(SubscriptionType.GOALKIE_DIVE)
  handleGoalkieDive(
    @MessageBody()
    data: GoalieDiveDto,
  ): void {
    this.server.to(data.roomId).emit(SubscriptionType.GOALKIE_DIVE, data);
  }

  @SubscribeMessage(SubscriptionType.LEAVE_ROOM)
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: LeaveRoomDto,
  ): void {
    const userId = this.clientIdToUserIdMap.get(client.id) || '';
    if (data.eventType === EventType.USER_LEFT) {
      const roomIds = this.roomService.removeUserFromRooms(this.clientIdToUserIdMap.get(client.id) || '');

      for (const roomId of roomIds) {
        const res = {
          event: EventType.USER_LEFT,
          msg: `Your opponent has left the room due to resize-window, start a fresh game!`,
          userId,
        };

        this.server.to(roomId).emit(SubscriptionType.ROOM_UPDATE, res);
      }
      this.server.emit(SubscriptionType.ROOMS_UPDATE, this.roomService.getAvailableRooms());
    } else {
      const room = this.roomService.getRoomByRoomId(data.roomId);
      if (!room) {
        this.logger.fatal(`No room available with roomId: ${data.roomId}`);
      }

      this.roomService.leaveRoom(userId, data.roomId);
      this.server.to(data.roomId).emit(SubscriptionType.ROOMS_UPDATE, this.roomService.getAvailableRooms());
    }
  }
}
