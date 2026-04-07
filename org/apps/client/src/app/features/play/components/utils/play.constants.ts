import { IFrame } from '../../../../core/interfaces/game.interface';

export const tutorialStepsForStriker: string[] = [
  'Drag the arrow downwards to aim your shot',
  'Click "Lock Aim" to confirm direction',
  'You’ll see a marker showing where your shot will go until the striker starts moving',
  'Click on the power bar to set shot strength',
];

export const tutorialStepsForGoalkeeper: string[] = [
  'Once the striker begins running, you can dive',
  'Tap the goalpost area to dive in that direction',
];

export const leftHitBoxes: IFrame[] = [
  ...Array.from({ length: 9 }, () => ({
    x: 100,
    y: 20,
    width: 65,
    height: 160,
  })),
  ...Array.from({ length: 6 }, () => ({
    x: 110,
    y: 30,
    width: 75,
    height: 150,
  })),
  ...Array.from({ length: 10 }, () => ({
    x: 40,
    y: 45,
    width: 145,
    height: 155,
  })),
  ...Array.from({ length: 21 }, () => ({
    x: 20,
    y: 60,
    width: 180,
    height: 120,
  })),
];

export const rightHitBoxes: IFrame[] = [
  ...Array.from({ length: 9 }, () => ({
    x: 75,
    y: 20,
    width: 65,
    height: 160,
  })),

  ...Array.from({ length: 6 }, () => ({
    x: 55,
    y: 30,
    width: 75,
    height: 150,
  })),

  ...Array.from({ length: 10 }, () => ({
    x: 55,
    y: 45,
    width: 145,
    height: 155,
  })),

  ...Array.from({ length: 21 }, () => ({
    x: 40,
    y: 60,
    width: 180,
    height: 120,
  })),
];

export const jumpHitBoxes: IFrame[] = [
  ...Array.from({ length: 10 }, () => ({
    x: 80,
    y: 25,
    width: 60,
    height: 155,
  })),

  ...Array.from({ length: 8 }, () => ({
    x: 75,
    y: 38,
    width: 65,
    height: 140,
  })),

  ...Array.from({ length: 2 }, () => ({
    x: 70,
    y: 32,
    width: 65,
    height: 150,
  })),

  ...Array.from({ length: 14 }, () => ({
    x: 50,
    y: 0,
    width: 70,
    height: 185,
  })),

  ...Array.from({ length: 2 }, () => ({
    x: 75,
    y: 35,
    width: 80,
    height: 165,
  })),

  ...Array.from({ length: 3 }, () => ({
    x: 60,
    y: 20,
    width: 70,
    height: 150,
  })),

  ...Array.from({ length: 7 }, () => ({
    x: 80,
    y: 42,
    width: 54,
    height: 145,
  })),
];
