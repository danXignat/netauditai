import { Injectable } from '@angular/core';
import { User } from '@supabase/supabase-js';
import { BehaviorSubject } from 'rxjs';
import { DatabaseService } from './db.service';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
}

const STORAGE_KEY = 'netauditai.supabase.auth.token';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<UserProfile | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private initialized = false;
  private rememberMeKey = 'netauditai-remember-me';

  constructor(private dbService: DatabaseService) {
    this.initializeAuth();
  }

  private async initializeAuth(): Promise<void> {
    try {
      const shouldRemember = this.getRememberMePreference();

      if (!shouldRemember) {
        await this.clearSessionIfNotRemembered();
      }

      const { data: { session }, error: sessionError } = await this.dbService.auth.getSession();

      if (sessionError) {
        console.error('Session error:', sessionError);
        this.initialized = true;
        return;
      }

      if (session?.user) {
        await this.setCurrentUser(session.user);
      }

      this.dbService.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await this.setCurrentUser(session.user);
        } else if (event === 'SIGNED_OUT') {
          this.currentUserSubject.next(null);
          this.clearRememberMePreference();
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          await this.setCurrentUser(session.user);
        }
      });

      this.initialized = true;
    } catch (error) {
      console.error('Auth initialization error:', error);
      this.initialized = true;
    }
  }

  private async clearSessionIfNotRemembered(): Promise<void> {
    const shouldRemember = this.getRememberMePreference();
    if (!shouldRemember) {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }

  private getRememberMePreference(): boolean {
    return localStorage.getItem(this.rememberMeKey) === 'true';
  }

  private setRememberMePreference(remember: boolean): void {
    if (remember) {
      localStorage.setItem(this.rememberMeKey, 'true');
    } else {
      localStorage.removeItem(this.rememberMeKey);
    }
  }

  private clearRememberMePreference(): void {
    localStorage.removeItem(this.rememberMeKey);
  }

  private async setCurrentUser(user: User): Promise<void> {
    try {
      const firstName = user.user_metadata?.['first_name'] || '';
      const lastName = user.user_metadata?.['last_name'] || '';
      const displayName = `${firstName} ${lastName}`.trim() || user.email?.split('@')[0] || 'User';

      const userProfile: UserProfile = {
        id: user.id,
        email: user.email!,
        displayName: displayName
      };

      this.currentUserSubject.next(userProfile);
    } catch (error) {
      console.error('Error setting current user:', error);
    }
  }

  async signUp(email: string, password: string, firstName: string, lastName: string): Promise<void> {
    const { error } = await this.dbService.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName
        }
      }
    });

    if (error) throw new Error(error.message);
  }

  async signIn(email: string, password: string, rememberMe: boolean = false): Promise<void> {
    this.setRememberMePreference(rememberMe);

    const { error } = await this.dbService.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      this.clearRememberMePreference();
      throw new Error(error.message);
    }

    if (!rememberMe) {
      await this.moveSessionToSessionStorage();
    }
  }

  private async moveSessionToSessionStorage(): Promise<void> {
    try {
      const sessionData = localStorage.getItem(STORAGE_KEY);
      if (sessionData) {
        sessionStorage.setItem(STORAGE_KEY, sessionData);
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.error('Error moving session to sessionStorage:', error);
    }
  }

  async signOut(): Promise<void> {
    this.clearRememberMePreference();
    const { error } = await this.dbService.auth.signOut();
    if (error) throw new Error(error.message);
  }

  getCurrentUser(): UserProfile | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    return this.currentUserSubject.value !== null;
  }

  async waitForInitialization(): Promise<void> {
    if (this.initialized) return;

    return new Promise((resolve) => {
      const checkInitialized = () => {
        if (this.initialized) {
          resolve();
        } else {
          setTimeout(checkInitialized, 50);
        }
      };
      checkInitialized();
    });
  }

  async refreshCurrentUser(): Promise<void> {
    try {
      const { data: { user }, error } = await this.dbService.auth.getUser();

      if (error) {
        console.error('Error refreshing current user:', error);
        return;
      }

      if (user) {
        await this.setCurrentUser(user);
      }
    } catch (error) {
      console.error('Error refreshing current user:', error);
    }
  }
}
