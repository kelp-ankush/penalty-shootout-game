import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

/**
 * @export
 * @class AppController
 * @typedef {AppController}
 */
@Controller()
export class AppController {
  /**
   * @constructor
   * @param {AppService} appService
   */
  constructor(private readonly appService: AppService) {}

  /**
   * @returns {string}
   */
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
