import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { RoomService } from './rooms.service';
import { MatchService } from './match.service';

@Module({
  providers: [RoomService, MatchService, EventsGateway],
})
export class EventsModule {}
