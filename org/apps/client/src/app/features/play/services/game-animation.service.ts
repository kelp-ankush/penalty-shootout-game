import { Injectable } from '@angular/core';
import { IPoint } from '@org/shared';
import { gsap } from 'gsap';

@Injectable({ providedIn: 'root' })
export class GameAnimationService {

  animateBall(ball: HTMLElement, coords: IPoint[], time: number, onComplete?: () => void): void {
    setTimeout(() => {
      gsap.to(ball, {
        duration: time,
        motionPath: { path: coords, curviness: 1.5 },
        ease: 'none',

        onComplete: () => {
          const isGoal = onComplete ? onComplete() : null;
          if (!isGoal) {
            const currentX = gsap.getProperty(ball, 'x') as number;
            const currentY = gsap.getProperty(ball, 'y') as number;

            gsap.to(ball, {
              y: currentY + 140, 
              x: currentX,
              duration: 1,
              ease: 'bounce.out',
            });
          }
          gsap.to(ball, {
            x: 0,
            y: 0,
            duration: 1,
            delay: 1,
            ease: 'power2.out',
          });
        },
      });
    }, 2800);
  }

  animateGoalkie(
    goalkie: HTMLElement,
    xDiff: number,
    onStart: () => void,
    onUpdate: (frame: number) => void,
    onComplete: () => void,
  ): void {
    const totalSize = 11040;
    const frames = 46;
    const tl = gsap.timeline();

    gsap.set(goalkie, {
      backgroundPosition: '0px 0px',
    });
    
    gsap.to(
      { progress: 0 },
      {
        progress: 1,
        duration: 1.5,
        ease: 'none',
        onUpdate: function () {
          const frame = Math.floor(this['targets']()[0].progress * 46);
          onUpdate(frame);
        },
      },
    );

    tl.to(
      goalkie,
      {
        backgroundPosition: `-${totalSize}px 0px`,
        duration: 1.5,
        ease: `steps(${frames})`,
        onStart: () => {
          onStart?.();
        },
        onComplete: () => {
          onComplete?.() 
        },
      },
      0,
    );

    gsap.to(
      goalkie,
      {
        x: `+=${xDiff}`,
        duration: 1.5,
        ease: 'steps(46)',
      },
    );
  }
}


