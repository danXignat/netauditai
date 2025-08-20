import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import {CommonModule, NgOptimizedImage} from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzMessageService } from 'ng-zorro-antd/message';

import { AuthService, UserProfile } from '../../services/auth.service';
import { DatabaseService } from '../../services/db.service';
import { CustomValidators } from '../../validators/custom-validators';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-login',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NzCardModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzCheckboxModule,
    NzDividerModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true
})
export class LoginComponent implements OnInit {
  @Input() initialMode: 'login' | 'register' = 'login';
  @Input() redirectUrl: string = '/dashboard';

  @Output() loginSuccess = new EventEmitter<UserProfile>();
  @Output() registerSuccess = new EventEmitter<void>();
  @Output() modeChanged = new EventEmitter<'login' | 'register'>();

  loginForm!: FormGroup;
  registerForm!: FormGroup;
  isLoginMode = true;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private dbService: DatabaseService,
    private router: Router,
    private message: NzMessageService,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    this.isLoginMode = this.initialMode === 'login';
    this.initializeForms();
  }

  get logoSrc(): string {
    return this.themeService.getLogoSrc();
  }

  initializeForms(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, CustomValidators.validEmail()]],
      password: ['', [Validators.required]],
      rememberMe: [false]
    });

    this.registerForm = this.fb.group({
      firstName: ['', [Validators.required, CustomValidators.validName()]],
      lastName: ['', [Validators.required, CustomValidators.validName()]],
      email: ['',
        [Validators.required, CustomValidators.validEmail()],
        [CustomValidators.goodEmail(this.dbService)]
      ],
      password: ['', [Validators.required, CustomValidators.strongPassword()]],
      confirmPassword: ['', [Validators.required]]
    });

    this.registerForm.get('confirmPassword')?.setValidators([
      Validators.required,
      CustomValidators.passwordMatch('password')
    ]);
  }

  toggleMode(): void {
    this.isLoginMode = !this.isLoginMode;
    this.resetForms();
    this.modeChanged.emit(this.isLoginMode ? 'login' : 'register');
  }

  resetForms(): void {
    this.loginForm.reset();
    this.registerForm.reset();
    this.loginForm.get('rememberMe')?.setValue(false);
  }

  async onLogin(): Promise<void> {
    if (this.loginForm.valid) {
      this.isLoading = true;
      try {
        const { email, password, rememberMe } = this.loginForm.value;
        await this.authService.signIn(email, password, rememberMe);

        const currentUser = this.authService.getCurrentUser();
        if (currentUser) {
          this.loginSuccess.emit(currentUser);
        }

        this.message.success('Login successful!');
        this.router.navigate([this.redirectUrl]);
      } catch (error: any) {
        this.message.error(error.message || 'Login failed');
      } finally {
        this.isLoading = false;
      }
    } else {
      this.markFormGroupTouched(this.loginForm);
    }
  }

  async onRegister(): Promise<void> {
    if (this.registerForm.valid) {
      this.isLoading = true;
      try {
        const { email, password, firstName, lastName } = this.registerForm.value;
        await this.authService.signUp(email, password, firstName, lastName);

        this.registerSuccess.emit();

        this.message.success('Registration successful! Please check your email to verify your account.');
        this.isLoginMode = true;
        this.resetForms();
      } catch (error: any) {
        this.message.error(error.message || 'Registration failed');
      } finally {
        this.isLoading = false;
      }
    } else {
      this.markFormGroupTouched(this.registerForm);
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  getErrorMessage(formGroup: FormGroup, field: string): string {
    const control = formGroup.get(field);
    if (control?.hasError('required')) {
      return `${this.getFieldDisplayName(field)} is required`;
    }
    if (control?.hasError('invalidEmail')) {
      return 'Please enter a valid email address';
    }
    if (control?.hasError('emailExists')) {
      return 'This email address is already registered. Please use a different email or try logging in.';
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
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm password'
    };
    return displayNames[field] || field;
  }

  isFieldInvalid(formGroup: FormGroup, field: string): boolean {
    const control = formGroup.get(field);
    return !!(control?.invalid && (control?.dirty || control?.touched));
  }
}
