import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {

  detectThemeFromBackground(): boolean {
    const bodyStyles = window.getComputedStyle(document.body);
    const backgroundColor = bodyStyles.backgroundColor;
    return this.isColorDark(backgroundColor);
  }

  getLogoSrc(): string {
    const isDarkTheme = this.detectThemeFromBackground();
    return isDarkTheme
      ? 'assets/logo_big_dark.png'
      : 'assets/logo_big_light.png';
  }

  private isColorDark(color: string): boolean {
    let r, g, b;

    if (color.startsWith('rgb(')) {
      const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (match) {
        r = parseInt(match[1]);
        g = parseInt(match[2]);
        b = parseInt(match[3]);
      }
    } else if (color.startsWith('rgba(')) {
      const match = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/);
      if (match) {
        r = parseInt(match[1]);
        g = parseInt(match[2]);
        b = parseInt(match[3]);
      }
    } else {
      return false;
    }

    if (r !== undefined && g !== undefined && b !== undefined) {
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance < 0.5;
    }

    return false;
  }
}
