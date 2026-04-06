import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ImagePreloadService {

  preloadImages(urls: string[]): void {
    urls.forEach(url => {
      const img = new Image();
      img.src = url;
    });
  }
}