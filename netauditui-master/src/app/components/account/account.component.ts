import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';

import { AccountService, UserProfile, ProfileUpdateData, PasswordChangeData } from '../../services/account.service';
import { AuthService, UserProfile as AuthUserProfile } from '../../services/auth.service';
import { CustomValidators } from '../../validators/custom-validators';
import { AssistantComponent } from '../assistant/assistant.component';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NzLayoutModule,
    NzCardModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzDividerModule,
    NzDropDownModule,
    NzMenuModule,
    NzAvatarModule,
    NzIconModule,
    AssistantComponent
  ],
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.scss']
})
export class AccountComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  accountForm!: FormGroup;
  currentUser: AuthUserProfile | null = null;
  userProfile: UserProfile | null = null;

  isProfileLoading = false;
  isPasswordLoading = false;

  private originalFormValue: any = null;

  constructor(
    private fb: FormBuilder,
    private accountService: AccountService,
    private authService: AuthService,
    private router: Router,
    private message: NzMessageService,
    private modal: NzModalService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadUserProfile();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.accountForm = this.fb.group({
      email: [{ value: '', disabled: true }],
      firstName: ['', [Validators.required, CustomValidators.validName()]],
      lastName: ['', [Validators.required, CustomValidators.validName()]],
      currentPassword: [''],
      newPassword: ['', CustomValidators.strongPassword()],
      confirmNewPassword: ['']
    });

    // Add password confirmation validator
    this.accountForm.get('confirmNewPassword')?.setValidators([
      CustomValidators.passwordMatch('newPassword')
    ]);

    // Track form changes for unsaved changes detection
    this.accountForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // Store original form value when first loaded
        if (this.originalFormValue === null && this.userProfile) {
          this.originalFormValue = {
            firstName: this.userProfile.firstName,
            lastName: this.userProfile.lastName,
            currentPassword: '',
            newPassword: '',
            confirmNewPassword: ''
          };
        }
      });
  }

  private loadCurrentUser(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
      });
  }

  private loadUserProfile(): void {
    this.accountService.userProfile$
      .pipe(takeUntil(this.destroy$))
      .subscribe(profile => {
        this.userProfile = profile;
        if (profile) {
          this.accountForm.patchValue({
            email: profile.email,
            firstName: profile.firstName,
            lastName: profile.lastName,
            currentPassword: '',
            newPassword: '',
            confirmNewPassword: ''
          });

          // Set original form value for change detection after form is populated
          this.setOriginalFormValue(profile);
        }
      });
  }

  private setOriginalFormValue(profile: UserProfile): void {
    this.originalFormValue = {
      firstName: profile.firstName,
      lastName: profile.lastName,
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: ''
    };
  }

  async navigateToDashboard(): Promise<void> {
    if (this.hasUnsavedChanges()) {
      this.modal.confirm({
        nzTitle: 'Unsaved Changes',
        nzContent: 'You have unsaved changes. Are you sure you want to go back to your Dashboard?',
        nzOkText: 'Go back to Dashboard',
        nzOkType: 'primary',
        nzOkDanger: true,
        nzCancelText: 'Stay',
        nzOnOk: () => {
          this.router.navigate(['/dashboard']);
        }
      });
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  async updateProfile(): Promise<void> {
    if (!this.isProfileFormValid()) {
      this.markProfileFieldsTouched();
      return;
    }

    this.isProfileLoading = true;
    try {
      const profileData: ProfileUpdateData = {
        firstName: this.accountForm.get('firstName')?.value,
        lastName: this.accountForm.get('lastName')?.value
      };

      await this.accountService.updateProfile(profileData);
      this.message.success('Profile updated successfully!');

      // Update original form value after successful save
      this.originalFormValue = {
        ...this.originalFormValue,
        firstName: profileData.firstName,
        lastName: profileData.lastName
      };
    } catch (error: any) {
      this.message.error(error.message || 'Failed to update profile');
    } finally {
      this.isProfileLoading = false;
    }
  }

  async changePassword(): Promise<void> {
    if (!this.isPasswordFormValid()) {
      this.markPasswordFieldsTouched();
      return;
    }

    this.isPasswordLoading = true;
    try {
      const passwordData: PasswordChangeData = {
        currentPassword: this.accountForm.get('currentPassword')?.value,
        newPassword: this.accountForm.get('newPassword')?.value
      };

      await this.accountService.changePassword(passwordData);
      this.message.success('Password changed successfully!');

      // Clear password fields after successful change
      this.accountForm.patchValue({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
      });

      // Update original form value
      this.originalFormValue = {
        ...this.originalFormValue,
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
      };
    } catch (error: any) {
      this.message.error(error.message || 'Failed to change password');
    } finally {
      this.isPasswordLoading = false;
    }
  }

  async signOut(): Promise<void> {
    try {
      await this.authService.signOut();
      this.router.navigate(['/login']);
    } catch (error: any) {
      this.message.error(error.message || 'Failed to sign out');
    }
  }

  isProfileFormValid(): boolean {
    const firstName = this.accountForm.get('firstName');
    const lastName = this.accountForm.get('lastName');
    return !!(firstName?.valid && lastName?.valid);
  }

  hasProfileChanges(): boolean {
    if (!this.originalFormValue) return false;

    const currentValues = {
      firstName: this.accountForm.get('firstName')?.value || '',
      lastName: this.accountForm.get('lastName')?.value || ''
    };

    const originalValues = {
      firstName: this.originalFormValue.firstName || '',
      lastName: this.originalFormValue.lastName || ''
    };

    return JSON.stringify(currentValues) !== JSON.stringify(originalValues);
  }

  isPasswordFormValid(): boolean {
    const currentPassword = this.accountForm.get('currentPassword');
    const newPassword = this.accountForm.get('newPassword');
    const confirmNewPassword = this.accountForm.get('confirmNewPassword');

    return !!(
      currentPassword?.value &&
      newPassword?.valid &&
      confirmNewPassword?.valid &&
      newPassword?.value === confirmNewPassword?.value
    );
  }

  private markProfileFieldsTouched(): void {
    this.accountForm.get('firstName')?.markAsTouched();
    this.accountForm.get('lastName')?.markAsTouched();
  }

  private markPasswordFieldsTouched(): void {
    this.accountForm.get('currentPassword')?.markAsTouched();
    this.accountForm.get('newPassword')?.markAsTouched();
    this.accountForm.get('confirmNewPassword')?.markAsTouched();
  }

  private hasUnsavedChanges(): boolean {
    if (!this.originalFormValue) return false;

    const currentValues = {
      firstName: this.accountForm.get('firstName')?.value || '',
      lastName: this.accountForm.get('lastName')?.value || '',
      currentPassword: this.accountForm.get('currentPassword')?.value || '',
      newPassword: this.accountForm.get('newPassword')?.value || '',
      confirmNewPassword: this.accountForm.get('confirmNewPassword')?.value || ''
    };

    return JSON.stringify(currentValues) !== JSON.stringify(this.originalFormValue);
  }

  getErrorMessage(field: string): string {
    const control = this.accountForm.get(field);
    if (control?.hasError('required')) {
      return `${this.getFieldDisplayName(field)} is required`;
    }
    if (control?.hasError('invalidName')) {
      return 'Name can only contain letters and spaces';
    }
    if (control?.hasError('passwordMismatch')) {
      return 'Passwords do not match';
    }
    if (control?.hasError('strongPassword')) {
      const errors = control.errors!['strongPassword'];
      const messages = [];
      if (errors.minLength) messages.push('at least 6 characters');
      if (errors.missingUpperCase) messages.push('one uppercase letter');
      if (errors.missingLowerCase) messages.push('one lowercase letter');
      if (errors.missingNumeric) messages.push('one number');
      if (errors.missingSpecialChar) messages.push('one special character');
      return `Password must contain ${messages.join(', ')}`;
    }
    return '';
  }

  private getFieldDisplayName(field: string): string {
    const displayNames: { [key: string]: string } = {
      firstName: 'First name',
      lastName: 'Last name',
      currentPassword: 'Current password',
      newPassword: 'New password',
      confirmNewPassword: 'Confirm new password'
    };
    return displayNames[field] || field;
  }

  isFieldInvalid(field: string): boolean {
    const control = this.accountForm.get(field);
    return !!(control?.invalid && (control?.dirty || control?.touched));
  }

  get hasPasswordFields(): boolean {
    const currentPassword = this.accountForm.get('currentPassword')?.value;
    const newPassword = this.accountForm.get('newPassword')?.value;
    const confirmNewPassword = this.accountForm.get('confirmNewPassword')?.value;

    return !!(currentPassword || newPassword || confirmNewPassword);
  }
}
