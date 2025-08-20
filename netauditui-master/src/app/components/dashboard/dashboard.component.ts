import {Component, OnInit, OnDestroy} from '@angular/core';
import {CommonModule} from '@angular/common';
import {Subject, takeUntil} from 'rxjs';

import {NzLayoutModule} from 'ng-zorro-antd/layout';
import {NzDropDownModule} from 'ng-zorro-antd/dropdown';
import {NzMenuModule} from 'ng-zorro-antd/menu';
import {NzAvatarModule} from 'ng-zorro-antd/avatar';
import {NzIconModule} from 'ng-zorro-antd/icon';
import {NzMessageService} from 'ng-zorro-antd/message';

import {AuthService, UserProfile} from '../../services/auth.service';
import {Router} from '@angular/router';
import {AnalysisViewerComponent} from '../analysis-viewer/analysis-viewer.component';
import {DeviceListComponent} from '../device-list/device-list.component';
import {NzCardComponent} from 'ng-zorro-antd/card';
import {AssistantComponent} from '../assistant/assistant.component';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  imports: [
    CommonModule,
    NzLayoutModule,
    NzDropDownModule,
    NzMenuModule,
    NzAvatarModule,
    NzIconModule,
    AnalysisViewerComponent,
    DeviceListComponent,
    NzCardComponent,
    AssistantComponent
  ],
  standalone: true,
})
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  currentUser: UserProfile | null = null;

  constructor(
    private authService: AuthService,
    private message: NzMessageService,
    private router: Router
  ) {
  }

  ngOnInit(): void {
    this.loadCurrentUser();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCurrentUser(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
      });
  }

  navigateToAccount(): void {
    this.router.navigate(['/account']);
  }

  async signOut(): Promise<void> {
    try {
      await this.authService.signOut();
      this.router.navigate(['/login']);
    } catch (error: any) {
      this.message.error(error.message || 'Failed to sign out');
    }
  }
}
