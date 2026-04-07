import { IsBoolean, IsEnum, IsNumber, IsNumberString, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { EventType } from '@org/shared';



export class JoinSpecificRoomDto {
    @IsString()
    roomId: string;
}

class DestPosDto {
    @IsNumber()
    x: number;

    @IsNumber()
    y: number;
}

export class TakeShotGameDto {
    @IsNumberString()
    userId: string;

    @IsString()
    roomId: string;

    @IsNumber()
    power: number;

    @ValidateNested()
    @Type(() => DestPosDto)
    destPos: DestPosDto;
}

export class ShotCompleteDto {
    @IsNumberString()
    userId: string;

    @IsString()
    roomId: string;

    @IsBoolean()
    isGoal: boolean;

    @IsString()
    turn: string;
}

export class GoalieDiveDto {
    @IsNumberString()
    userId: string;

    @IsString()
    roomId: string;

    @ValidateNested()
    @Type(() => DestPosDto)
    destPos: DestPosDto;
}

export class LeaveRoomDto {
    @IsString()
    roomId: string;

    @IsEnum(EventType)
    eventType: EventType;
}

