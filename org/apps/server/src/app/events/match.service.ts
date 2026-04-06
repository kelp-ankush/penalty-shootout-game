import { Injectable } from '@nestjs/common';
import { IGame, IShotComplete } from '@org/shared';

@Injectable()
export class MatchService {

  private games: IGame[] = [];

  createGame(roomId: string, players: string[]): IGame {
    const game: IGame = {
      roomId,
      players,
      turn: players[0],
      score: players.reduce((acc, p) => {
        acc[p] = 0;
        return acc;
      }, {}),
      shots: players.reduce((acc, p) => {
        acc[p] = [];
        return acc;
      }, {}),
      round: 1,
      maxRounds: 5,
      isFinished: false,
      winner: null,
    };

    this.games.push(game);
    return game;
  }

  getGame(roomId: string) {
    return this.games.find((g) => g.roomId === roomId);
  }

  updateScore(data: IShotComplete): IGame | null {
    const game = this.getGame(data.roomId);
    if (!game || game.isFinished) return null;

    const { userId, isGoal } = data;

    game.shots[userId].push(isGoal ? 1 : 0);
    if (isGoal) game.score[userId] += 1;

    const p1 = game.players[0];
    const p2 = game.players[1];

    const nextTurn = p1 === data.turn ? p2 : p1;
    game.turn = nextTurn;

    const shotsP1 = game.shots[p1].length;
    const shotsP2 = game.shots[p2].length;

    if (shotsP1 === shotsP2) {
      game.round = shotsP1;
    }

    const remainingP1 = game.maxRounds - shotsP1;
    const remainingP2 = game.maxRounds - shotsP2;

    if (game.score[p1] > game.score[p2] + remainingP2) {
      game.isFinished = true;
      game.winner = p1;
    } else if (game.score[p2] > game.score[p1] + remainingP1) {
      game.isFinished = true;
      game.winner = p2;
    }

    if (!game.isFinished && game.round >= game.maxRounds) {
      game.isFinished = true;

      if (game.score[p1] > game.score[p2]) game.winner = p1;
      else if (game.score[p2] > game.score[p1]) game.winner = p2;
      else game.winner = 'draw';
    }

    return game;
  }
}
