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

/**
 * @export
 * @class EventsGateway
 * @typedef {EventsGateway}
 * @implements {OnGatewayConnection}
 * @implements {OnGatewayDisconnect}
 */
@WebSocketGateway({
  cors: {
    origin: ['http://localhost:4200', 'https://penalty-shoots-ashy.vercel.app'],
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  /**
   *@type {Server}
   */
  @WebSocketServer()
  server: Server;

  /**
   *@private
   * @type {Map<string, string>}
   */
  private clientIdToUserIdMap: Map<string, string> = new Map();

  /** * Creates an instance of EventsGateway.
   *
   * @constructor
   * @param {RoomService} roomService
   * @param {MatchService} matchService
   */
  constructor(
    private roomService: RoomService,
    private matchService: MatchService,
  ) {}

  /**
   *@param {Socket} client
   */
  handleConnection(client: Socket) {
    console.log('client connected:', client.id, client.handshake.auth.userId);
    this.clientIdToUserIdMap.set(
      client.id,
      client.handshake.auth.userId as string,
    );
    this.server.emit('roomsUpdate', this.roomService.getAvailableRooms());
  }

  /**
   *@param {Socket} client
   */
  handleDisconnect(client: Socket) {
    console.log(
      'client disconnected:',
      client.id,
      client.handshake.auth.userId,
    );

    const roomIds = this.roomService.removeUserFromRooms(
      this.clientIdToUserIdMap.get(client.id) || '',
    );

    for (const roomId of roomIds) {
      this.server.to(roomId).emit('roomUpdate', {
        event: 'user-left',
        msg: `Your opponent has left the room, start a fresh game!`,
        userId: this.clientIdToUserIdMap.get(client.id),
      });
    }
    this.server.emit('roomsUpdate', this.roomService.getAvailableRooms());

    this.clientIdToUserIdMap.delete(client.id);
  }

  /**
   *@async
   * @param {Socket} client
   * @param {string} userId
   * @returns {unknown}
   */
  @SubscribeMessage('createRoom')
  async handleCreateRoom(@ConnectedSocket() client: Socket) {
    const userId = this.clientIdToUserIdMap.get(client.id)!;

    const room = this.roomService.createRoom(userId);

    await client.join(room.id);

    this.server.emit('roomsUpdate', this.roomService.getAvailableRooms());

    return { event: 'roomCreated', data: room };
  }

  /**
   *@async
   * @param {Socket} client
   * @returns {unknown}
   */
  @SubscribeMessage('joinRoom')
  async handleJoinRoom(@ConnectedSocket() client: Socket) {
    const userId = this.clientIdToUserIdMap.get(client.id)!;
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
  /**
   *@async
   * @param {Socket} client
   * @param {{ userId: string; roomId: string }} data
   * @returns {unknown}
   */
  @SubscribeMessage('joinSpecificRoom')
  async handleJoinSpecificRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    const userId = this.clientIdToUserIdMap.get(client.id)!;
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

  /**
   *@param {string} roomId
   * @returns {Game}
   */
  handleStartGame(roomId: string) {
    const room = this.roomService.getRoomByRoomId(roomId);
    if (!room) return;

    const game = this.matchService.createGame(room.id, room.users);

    this.server.to(room.id).emit('initiatedGame', game);
    return game;
  }

  /**
   *@param {{
   *       userId: string;
   *       roomId: string;
   *       power: string;
   *       destPos: { x: string; y: string };
   *     }} data
   */
  @SubscribeMessage('takeShot')
  handleTakeShotGame(
    @MessageBody()
    data: {
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

  /**
   *@param {{
   *       userId: string;
   *       roomId: string;
   *       isGoal: boolean;
   *       turn: string;
   *     }} data
   */
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

  /**
   *@param {{
   *       userId: string;
   *       roomId: string;
   *       destPos: { x: string; y: string };
   *     }} data
   */
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

  /**
   *@param {Socket} client
   * @param {{
   *       userId: string;
   *       roomId: string;
   *       eventType: string;
   *     }} data
   */
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
