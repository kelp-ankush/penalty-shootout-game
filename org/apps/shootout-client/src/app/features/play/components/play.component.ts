import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  EventEmitter,
  inject,
  input,
  OnInit,
  Output,
  Renderer2,
  signal,
  ViewChild,
} from '@angular/core';
import { NgClass } from '@angular/common';
import gsap from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import {
  calculateClampedTime,
  calculateTrajectory,
  checkGoal,
  getContainerCoords,
  getViewPortCoords,
  jumphitboxes,
  lefthitboxes,
  righthitboxes,
} from './utils/play.util';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ICachedShot, IGame, IGoalieDiveEvent, IResultUpdateEvent, IShotEvent, IPoint } from '@org/shared-types';
import { ASSETS } from '../../../core/utils/images.constants';
import { SocketService } from '../../../core/services/socket.service';
import { GameAnimationService } from '../services/game-animation.service';

/**
 * @export
 * @class Play
 * @typedef {Play}
 * @implements {OnInit, AfterViewInit}
 */
@Component({
  selector: 'app-play',
  templateUrl: './play.html',
  styleUrls: ['./play.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass],
  standalone: true
})
export class Play implements OnInit, AfterViewInit {
  userId = input<string>('');
  roomId = input<string>('');

  turn = signal<string>('');
  scores = signal<Record<string, number>>({});

  shotTaken = signal(false);
  shouldGoalkieDive = false;
  goalkieDivedClient = false;
  goalkieAnimationDone = signal<string>('not-dived');
  ballAnimationDone = signal<boolean>(false);

  goalkieDiveDirection = signal<string>(ASSETS.GOALKEEPER.LEFT);
  playerImage = signal<string>(ASSETS.PLAYER.BLUE);
  netsImage = ASSETS.ENVIRONMENT.NETS
  audienceImage = ASSETS.ENVIRONMENT.AUDIENCE
  fieldImage = ASSETS.ENVIRONMENT.FIELD

  round = signal(1);

  maxRounds = 5;

  ballPos = signal<IPoint>({ x: 0, y: 0 });
  initialBallPos: IPoint = { x: 0, y: 0 };

  goalkiePos = signal<IPoint>({ x: 0, y: 0 });
  initialGoalkiePos: IPoint = { x: 0, y: 0 };

  initialArrowPos: IPoint = { x: 0, y: 0 };

  myScore = signal(0);
  opponentScore = signal(0);
  showPlayground = signal(false);

  myShots = signal<number[]>([]);
  opponentShots = signal<number[]>([]);

  winner = signal<string | null>(null);
  Math = Math;

  isDragging = false;

  angle = 0;

  game: IGame | null = null;

  goalAudio = new Audio('audio/goal.mp3');
  saveAudio = new Audio('audio/save.mp3');

  powerChosen = false;

  canShoot = computed(() => {
    const ballAnimationDone = this.ballAnimationDone();
    const goalkieAnimationDone = this.goalkieAnimationDone();
    if (!ballAnimationDone) return false;
    return goalkieAnimationDone !== 'diving';
  });

  cachedShot: ICachedShot | null = null;

  showTutorial = false;

  tutorialStepsForStriker = [
    'Drag the arrow downwards to aim your shot',
    'Click "Lock Aim" to confirm direction',
    'You’ll see a marker showing where your shot will go until the striker starts moving',
    'Click on the power bar to set shot strength',
  ];

  tutorialStepsForGoalkeeper = [
    'Once the striker begins running, you can dive',
    'Tap the goalpost area to dive in that direction',
  ];

  intersectionFrame = 0;

  rp: DOMRect | null = null;

  @Output() gameEnded = new EventEmitter<void>();

  @ViewChild('ball') ballRef!: ElementRef;

  @ViewChild('goalkie') goalkieRef!: ElementRef;

  @ViewChild('player') playerRef!: ElementRef;

  @ViewChild('nets') netsRef!: ElementRef;

  @ViewChild('playground') playgroundRef!: ElementRef;

  private socketService = inject(SocketService);
  private gameAnimationService = inject(GameAnimationService)
  private renderer = inject(Renderer2)

  /** * Creates an instance of Play.
   *
   * @constructor
   * @param {SocketService} socketService
   * @param {Renderer2} renderer
   * @param {GameAnimationService} gameAnimationService
   */
  constructor(
  ) {
    gsap.registerPlugin(MotionPathPlugin);
    gsap.registerPlugin(ScrollTrigger);

    effect(() => {
      this.round();
      if (this.showPlayground()) {
        this.initializeValues();
      }
    });

    effect(() => {
      if (this.winner()) {
        setTimeout(() => {
          this.gameEnded.emit();
        }, 5000);
      }
    });

    effect(() => {
      const canShoot = this.canShoot();
      if (!this.cachedShot) return;
      if (canShoot && this.game && this.userId() === this.game.turn) {
        this.socketService.shotComplete({
          userId: this.userId(),
          roomId: this.roomId(),
          isGoal: this.cachedShot.isGoal,
          turn: this.cachedShot.turn,
        });

        this.cachedShot = null;
      }
    });

    effect(() => {
      const showPlayground = this.showPlayground();
      this.checkIfToShowTutorials(showPlayground);
    });
  }

  ngOnInit() {
    const showPlayground = this.showPlayground();
    this.checkIfToShowTutorials(showPlayground);

    this.socketService.onGameStart().subscribe((data: IGame) => this.handleGameStart(data));

    this.socketService.onTakeShot().subscribe((res: IShotEvent) => this.handleTakeShot(res));

    this.socketService
      .onGoalkieDive()
      .subscribe((data: IGoalieDiveEvent) => this.handleGoalkieDive(data));

    this.socketService
      .onResultUpdate()
      .subscribe((data: IResultUpdateEvent) => this.handleResultUpdate(data));

    this.goalAudio.load();
    this.saveAudio.load();
  }

  ngAfterViewInit(): void {
    const playgroundRef = this.playgroundRef.nativeElement as HTMLElement;
    if (playgroundRef) {
      const rect = playgroundRef.getBoundingClientRect();
      this.rp = rect;
    }
  }

  /**
   *@param {MouseEvent} event
   */
  onGoalkieChooseDirection(event: MouseEvent) {
    if (this.winner() || !this.rp) return;
    if (
      !this.shouldGoalkieDive ||
      this.goalkieDivedClient ||
      this.goalkieAnimationDone() === 'dive-completed' ||
      this.goalkieAnimationDone() === 'diving'
    )
      return;

    const containerPos = getContainerCoords(
      { x: event.clientX - 40, y: event.clientY - 80 },
      this.rp,
    );

    this.goalkiePos.set({ x: containerPos.x, y: containerPos.y });

    this.socketService.goalkieDive({
      userId: this.userId(),
      roomId: this.roomId(),
      destPos: { x: containerPos.x, y: containerPos.y },
    });

    this.goalkieDivedClient = true;
  }

  /**
   *@param {(MouseEvent | PointerEvent)} e
   */
  onMouseMove = (e: MouseEvent | PointerEvent) => {
    if (!this.isDragging || this.winner() || !this.rp) return;
    const arrowElem = document.getElementById('arrow') as HTMLElement;

    if (arrowElem) {
      const calcX =
        this.initialArrowPos.x > arrowElem?.getBoundingClientRect().left
          ? arrowElem?.getBoundingClientRect().left
          : arrowElem?.getBoundingClientRect().right;

      if (this.isDragging && arrowElem && e.x !== 0 && e.y !== 0) {
        const YDiff = this.initialArrowPos.y - e.y;

        const radians = Math.atan2(this.initialArrowPos.y - e.y, this.initialArrowPos.x - e.x);

        const degrees = radians * (180 / Math.PI);

        arrowElem.style.height = this.Math.max(132, this.Math.abs(YDiff) * 1.5) + 'px';
        arrowElem.style.transformOrigin = 'bottom';
        this.angle = degrees > 0 ? 90 - degrees : 90 + degrees;
        arrowElem.style.transform =
          'rotate(' + (degrees > 0 ? 90 - degrees : 90 + degrees) + 'deg)';
        this.ballPos.set(
          getContainerCoords(
            { x: calcX - 10, y: arrowElem?.getBoundingClientRect().top - 20 },
            this.rp,
          ),
        );
      }
    }
  };

  /**
   *@param {MouseEvent} e
   */
  onMouseDown(e: MouseEvent) {
    if (this.winner()) return;

    e.preventDefault();
    this.isDragging = true;

    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
  }

  /**
   *@param {IPointerEvent} e
   */
  onIPointerDown(e: PointerEvent) {
    if (this.winner()) return;

    e.preventDefault();
    this.isDragging = true;

    document.addEventListener('pointermove', this.onMouseMove);
    document.addEventListener('pointerup', this.onMouseUp);
  }

  onMouseUp = () => {
    if (this.winner()) return;

    this.isDragging = false;

    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
  };

  onLockDirection() {
    if (this.winner() || !this.rp) return;

    if (this.ballPos().x === 0 && this.ballPos().y === 0) {
      alert('Use arrow to select where to shoot');
      return;
    }

    const nets = this.netsRef?.nativeElement as HTMLElement;
    const netsRect = nets?.getClientRects()[0];
    const lockAim = document.getElementById('lock-aim') as HTMLElement;

    if (nets && netsRect ) {
      const circle = document.createElement('div');
      const ballPosView = getViewPortCoords(this.ballPos(), this.rp);

      const left = ballPosView.x - netsRect.left;
      const top = ballPosView.y - netsRect.top + 16;

      circle.className = `w-4 h-4 rounded-full border-2 border-red-500 bg-transparent absolute animate-pulse z-[9999]`;
      circle.style = `left: ${left}px; top: ${top}px`;
      circle.id = 'marker';

      nets?.appendChild(circle);
      if (this.game && this.game.turn === this.userId()) lockAim?.classList?.add('invisible');
    }

    const arrow = document.getElementById('arrow') as HTMLElement;
    if (arrow) arrow.classList.add('hidden');

    const indicator = document.getElementById('indicator') as HTMLElement;
    if (indicator) indicator.classList.add('indicator');
  }

  onLockPower() {
    if (this.winner() || this.powerChosen || !this.rp) return;


    const indicator = document.getElementById('indicator') as HTMLElement;
    const marker = document.getElementById('marker');
    const powerContianer = document.getElementById('power-container') as HTMLElement;

    const powerRect = powerContianer?.getClientRects()[0];
    const indicatorRect = indicator?.getClientRects()[0];
    const markerRect = marker?.getClientRects()[0];

    if (indicator && indicatorRect && powerContianer && powerRect && marker && markerRect) {
      indicator.classList.remove('indicator');
      this.powerChosen = true;

      const left = indicatorRect.left;
      const right = indicatorRect.right;

      const avg = (left + right) / 2;

      const power = avg - powerRect.x;

      indicator.style.left = (left - powerRect.left).toString() + 'px';

      this.shotTaken.set(true);
      if (this.game && this.userId() === this.game.turn) {
        const rp = this.rp;
        setTimeout(() => {
          this.socketService.shootBall({
            userId: this.userId(),
            roomId: this.roomId(),
            power,
            destPos: getContainerCoords({ x: markerRect.x, y: markerRect.y }, rp),
          });
          indicator.style.left = (-2).toString() + 'px';
          indicator.style.top = (-12).toString() + 'px';
        }, 2000);
      }
    }
  }

  resetPositions() {
    const ball = this.ballRef?.nativeElement;
    const goalkie = this.goalkieRef?.nativeElement;
    const player = this.playerRef?.nativeElement;

    if (!ball || !goalkie) return;

    this.renderer.setStyle(player, 'animation', 'none');

    this.ballPos.set({
      x: 0,
      y: 0,
    });

    this.goalkiePos.set({
      x: 0,
      y: 0,
    });

    gsap.to(goalkie, {
      x: 0,
      y: 0,
    });

    this.goalkieDiveDirection.set(ASSETS.GOALKEEPER.LEFT);

    this.shouldGoalkieDive = false;
    this.goalkieDivedClient = false;

    this.renderer.setStyle(goalkie, 'animation', 'none');

    this.powerChosen = false;

    this.goalkieAnimationDone.set('not-dived');
    this.ballAnimationDone.set(false);
    this.cachedShot = null;
    this.intersectionFrame = 0;
  }

  /**
   *@param {*} data
   */
  handleGameStart(data: IGame) {
    this.turn.set(data.turn);
    this.scores.set(data.score);

    if (data.turn === data.players[0]) {
      this.playerImage.set(ASSETS.PLAYER.BLUE);
    } else {
      this.playerImage.set(ASSETS.PLAYER.RED);
    }

    this.game = data;

    for (const [key, value] of Object.entries(data.score ?? {})) {
      if (key === this.userId()) this.myScore.set(value as number);
      else this.opponentScore.set(value as number);
    }

    this.showPlayground.set(true);
  }

  /**
   *@param {*} res
   */
  handleTakeShot(res: IShotEvent) {
    if(!this.rp) return;
    const { data, game } = res;

    this.shouldGoalkieDive = true;

    this.game = game;
    const time = calculateClampedTime(Number(data.power));

    this.ballPos.set(data.destPos);

    const player = this.playerRef?.nativeElement;

    const ball = this.ballRef?.nativeElement;
    const marker = document.getElementById('marker');

    if (!ball || !player) return;

    const vertex = this.initialBallPos;
    const point2 = getViewPortCoords(data.destPos, this.rp);

    const coords: IPoint[] = calculateTrajectory(vertex, point2);

    this.animatePlayer(player);
    this.gameAnimationService.animateBall(ball, coords, time, this.handleCheckGoal.bind(this));

    if (marker) {
      marker.remove();
    }
  }

  /**
   *@returns {boolean}
   */
  handleCheckGoal() {
    this.ballAnimationDone.set(true);
    const ball = this.ballRef?.nativeElement as HTMLElement;

    const goalkie = this.goalkieRef?.nativeElement as HTMLElement;
    const nets = this.netsRef?.nativeElement as HTMLElement;

    let frame: {
      x: number;
      y: number;
      width: number;
      height: number;
    } | null = null;
    const frameNumber = this.Math.min(this.intersectionFrame, 45);

    if (this.goalkieDiveDirection().includes('YAMJkV')) {
      frame = lefthitboxes[frameNumber];
    } else if (this.goalkieDiveDirection().includes('YAMEJh')) {
      frame = righthitboxes[frameNumber];
    } else {
      frame = jumphitboxes[frameNumber];
    }

    if (!goalkie || !nets || !ball || !frame) return;

    const r = ball.getBoundingClientRect();
    const t = goalkie.getBoundingClientRect();
    const n = nets.getBoundingClientRect();

    const keeperBox = {
      top: t.top + frame.y,
      left: t.left + frame.x,
      bottom: t.top + frame.y + frame.height,
      right: t.left + frame.x + frame.width,
    };

    const isGoal = checkGoal(r, n, keeperBox);

    if (isGoal) {
      setTimeout(() => {
        this.playGoalSound();
      }, 100);
    } else {
      setTimeout(() => {
        this.playSaveSound();
      }, 100);
    }
    if (this.game && this.userId() === this.game.turn) {
      this.cachedShot = {
        userId: this.userId(),
        roomId: this.roomId(),
        isGoal,
        turn: this.game.turn,
      };
    }

    return isGoal;
  }

  /**
   *@param {*} data
   */
  handleGoalkieDive(data: IGoalieDiveEvent) {
    if (!this.shouldGoalkieDive || !this.rp) return;
    const goalkie = this.goalkieRef?.nativeElement as HTMLElement;

    this.shouldGoalkieDive = false;

    const rect = goalkie.getBoundingClientRect();
    const startX = rect.x;

    const destPosLocal = getViewPortCoords(data.destPos, this.rp);

    const endX = destPosLocal.x;

    let xDiff = endX - startX;

    if (xDiff < 0) {
      xDiff -= 40;
      this.goalkieDiveDirection.set(ASSETS.GOALKEEPER.LEFT);
    } else if (xDiff <= 150) {
      xDiff -= 60;
      this.goalkieDiveDirection.set(ASSETS.GOALKEEPER.JUMP);
    } else {
      xDiff -= 40;
      this.goalkieDiveDirection.set(ASSETS.GOALKEEPER.RIGHT);
    }

    if (!goalkie) return;
    if (destPosLocal.x !== 0 || destPosLocal.y !== 0) {
      this.gameAnimationService.animateGoalkie(
        goalkie,
        xDiff,
        this.setGoalkieAnimationDone.bind(this, 'diving'),
        (frame: number) => this.updateCurrentIntersectionFrame(frame),
        this.setGoalkieAnimationDone.bind(this, 'dived'),
      );
    }
  }

  /**
   *@param {*} data
   */
  handleResultUpdate(data: IResultUpdateEvent) {
    this.game = data.game;
    this.turn.set(data.game.turn);
    this.scores.set(data.game.score);

    this.winner.set(data.game?.winner ?? null);

    if (data.game.turn === data.game.players[0]) {
      this.playerImage.set(ASSETS.PLAYER.BLUE);
    } else {
      this.playerImage.set(ASSETS.PLAYER.RED);
    }

    for (const userId of data.game.players) {
      if (userId === this.userId()) {
        this.myScore.set(data.game.score[userId] as number);
        this.myShots.set(data.game.shots[userId]);
      } else {
        this.opponentScore.set(data.game.score[userId] as number);
        this.opponentShots.set(data.game.shots[userId]);
      }
    }

    this.shotTaken.set(false);
    this.ballPos.set(this.initialBallPos);
    this.goalkiePos.set(this.initialGoalkiePos);
    setTimeout(() => this.resetPositions(), 1000);

    this.round.update((r) => r + 1);
  }

  /**
   *@private
   */
  private initializeValues() {
    setTimeout(() => {
      const ballRect = this.ballRef?.nativeElement?.getBoundingClientRect();
      const goalkieRect = (this.goalkieRef?.nativeElement as HTMLElement)?.getBoundingClientRect();
      const arrowRect = (document.getElementById('arrow') as HTMLElement)?.getBoundingClientRect();

      if (this.initialBallPos.x === 0)
        this.initialBallPos = { x: ballRect?.x ?? 0, y: ballRect?.y ?? 0 };
      if (this.initialGoalkiePos.x === 0)
        this.initialGoalkiePos = { x: goalkieRect?.x ?? 0, y: goalkieRect?.y ?? 0 };
      this.initialArrowPos = { x: arrowRect?.x ?? 0, y: arrowRect?.y ?? 0 };
    }, 200);
  }

  /**
   *@private
   * @param {HTMLElement} player
   */
  private animatePlayer(player: HTMLElement) {
    this.renderer.setStyle(player, 'animation', 'moveForward 4s alternate 0.6s, kick 4s steps(96)');
  }

  private playGoalSound() {
    this.goalAudio.currentTime = 0;
    this.goalAudio.play()
  }

  private playSaveSound() {
    this.saveAudio.currentTime = 0;
    this.saveAudio.play()
  }

  /**
   *@private
   * @param {string} status
   */
  private setGoalkieAnimationDone(status: string) {
    if (status === 'dived' && !this.ballAnimationDone()) {
      this.goalkieAnimationDone.set('not-dived');
      this.shouldGoalkieDive = true;
      this.goalkieDivedClient = false;
    } else if (status === 'dived' && this.ballAnimationDone()) {
      this.goalkieAnimationDone.set('dive-completed');
      this.shouldGoalkieDive = false;
      this.goalkieDivedClient = true;
    } else {
      this.goalkieAnimationDone.set(status);
    }
  }

  /**
   *@private
   * @param {number} index
   */
  private updateCurrentIntersectionFrame(index: number) {
    this.intersectionFrame = index;
  }

  /**
   *@private
   * @param {boolean} showPlayground
   */
  private checkIfToShowTutorials(showPlayground: boolean) {
    const tutorialSeen = JSON.parse(localStorage.getItem('tutorialSeen') || 'false');
    if (tutorialSeen) {
      this.showTutorial = false;
    } else if (showPlayground) {
      this.showTutorial = true;
      localStorage.setItem('tutorialSeen', JSON.stringify(true));
    }
  }
}
