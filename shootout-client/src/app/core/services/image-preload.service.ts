import { Injectable } from '@angular/core';

/**
 * @export
 * @class ImagePreloadService
 * @typedef {ImagePreloadService}
 */
@Injectable({
  providedIn: 'root'
})
export class ImagePreloadService {

  /**
   *@param {string[]} urls 
   */
  preloadImages(urls: string[]): void {
    urls.forEach(url => {
      const img = new Image();
      img.src = url;
    });
  }
}