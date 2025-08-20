import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable, map, switchMap, timer } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    return this.waitForAuthInit().pipe(
      switchMap(() => this.authService.currentUser$),
      map(user => {
        if (user) {
          return true;
        } else {
          this.router.navigate(['/login']);
          return false;
        }
      })
    );
  }

  private waitForAuthInit(): Observable<boolean> {
    return timer(0, 100).pipe(
      switchMap(async () => {
        await this.authService.waitForInitialization();
        return true;
      }),
      map(() => true)
    );
  }
}

@Injectable({
  providedIn: 'root'
})
export class LoginGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    return this.waitForAuthInit().pipe(
      switchMap(() => this.authService.currentUser$),
      map(user => {
        if (!user) {
          return true;
        } else {
          this.router.navigate(['/dashboard']);
          return false;
        }
      })
    );
  }

  private waitForAuthInit(): Observable<boolean> {
    return timer(0, 100).pipe(
      switchMap(async () => {
        await this.authService.waitForInitialization();
        return true;
      }),
      map(() => true)
    );
  }
}
