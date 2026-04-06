import { Injectable } from '@nestjs/common';

/**
 * @export
 * @class AppService
 * @typedef {AppService}
 */
@Injectable()
export class AppService {
  /**
   *@returns {string}
   */
  getHello(): string {
    return 'Hello World!';
  }
}
