import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { RoomService } from './rooms.service';
import { MatchService } from './match.service';

/**
 * @export
 * @class EventsModule
 * @typedef {EventsModule}
 */
@Module({
  providers: [RoomService, MatchService, EventsGateway],
})
export class EventsModule {}
