import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { DatabaseService } from './db.service';
import { AuthService } from './auth.service';

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface ProfileUpdateData {
  firstName: string;
  lastName: string;
}

export interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
}

@Injectable({
  providedIn: 'root'
})
export class AccountService {
  private userProfileSubject = new BehaviorSubject<UserProfile | null>(null);
  public userProfile$ = this.userProfileSubject.asObservable();

  constructor(
    private dbService: DatabaseService,
    private authService: AuthService
  ) {
    this.initializeProfile();
  }

  private initializeProfile(): void {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.loadUserProfile(user.id);
      } else {
        this.userProfileSubject.next(null);
      }
    });
  }

  private async loadUserProfile(userId: string): Promise<void> {
    try {
      const { data: { user }, error } = await this.dbService.auth.getUser();

      if (error) {
        throw error;
      }

      if (user) {
        const firstName = user.user_metadata?.['first_name'] || '';
        const lastName = user.user_metadata?.['last_name'] || '';

        const profile: UserProfile = {
          id: user.id,
          email: user.email!,
          firstName: firstName,
          lastName: lastName
        };

        this.userProfileSubject.next(profile);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      throw new Error('Failed to load user profile');
    }
  }

  async updateProfile(profileData: ProfileUpdateData): Promise<void> {
    try {
      const { error } = await this.dbService.auth.updateUser({
        data: {
          first_name: profileData.firstName,
          last_name: profileData.lastName
        }
      });

      if (error) {
        throw error;
      }

      // Reload the profile to reflect changes
      const currentUser = this.authService.getCurrentUser();
      if (currentUser) {
        await this.loadUserProfile(currentUser.id);

        // Force refresh the auth service to update the display name
        await this.refreshAuthService();
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      throw new Error(error.message || 'Failed to update profile');
    }
  }

  private async refreshAuthService(): Promise<void> {
    try {
      if (typeof this.authService.refreshCurrentUser === 'function') {
        await this.authService.refreshCurrentUser();
      } else {
        const { error: refreshError } = await this.dbService.auth.refreshSession();
        if (refreshError) {
          console.warn('Warning: Could not refresh session, but profile was updated');
        }
      }
    } catch (error) {
      console.error('Error refreshing auth service:', error);
    }
  }

  async changePassword(passwordData: PasswordChangeData): Promise<void> {
    try {
      // First verify current password by attempting to sign in
      const currentUser = this.getCurrentProfile();
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      // Verify current password
      const { error: signInError } = await this.dbService.auth.signInWithPassword({
        email: currentUser.email,
        password: passwordData.currentPassword
      });

      if (signInError) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      const { error: updateError } = await this.dbService.auth.updateUser({
        password: passwordData.newPassword
      });

      if (updateError) {
        throw updateError;
      }
    } catch (error: any) {
      console.error('Error changing password:', error);
      throw new Error(error.message || 'Failed to change password');
    }
  }

  getCurrentProfile(): UserProfile | null {
    return this.userProfileSubject.value;
  }

  async refreshProfile(): Promise<void> {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      await this.loadUserProfile(currentUser.id);
    }
  }
}
