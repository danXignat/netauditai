import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzDividerModule } from 'ng-zorro-antd/divider';

import { AnalysisService } from '../../services/analysis.service';

@Component({
  selector: 'app-analysis-viewer',
  standalone: true,
  imports: [
    CommonModule,
    NzCardModule,
    NzIconModule,
    NzButtonModule,
    NzEmptyModule,
    NzSpinModule,
    NzAlertModule,
    NzDividerModule
  ],
  templateUrl: './analysis-viewer.component.html',
  styleUrls: ['./analysis-viewer.component.scss']
})
export class AnalysisViewerComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  analysisResult: string | null = null;
  isAnalyzing = false;
  analysisError: string | null = null;

  constructor(private analysisService: AnalysisService) {}

  ngOnInit(): void {
    this.subscribeToAnalysisState();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private subscribeToAnalysisState(): void {
    this.analysisService.analysisResult$
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        this.analysisResult = result;
      });

    this.analysisService.isAnalyzing$
      .pipe(takeUntil(this.destroy$))
      .subscribe(analyzing => {
        this.isAnalyzing = analyzing;
      });

    this.analysisService.analysisError$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => {
        this.analysisError = error;
      });
  }

  clearAnalysis(): void {
    this.analysisService.clearAnalysis();
  }

  formatAnalysisText(text: string): string {
    if (!text) return '';

    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold text
      .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic text
      .replace(/^### (.*$)/gm, '<h3>$1</h3>') // H3 headers
      .replace(/^## (.*$)/gm, '<h2>$1</h2>') // H2 headers
      .replace(/^# (.*$)/gm, '<h1>$1</h1>') // H1 headers
      .replace(/^\d+\. (.*$)/gm, '<div class="numbered-item">$1</div>') // Numbered lists
      .replace(/^- (.*$)/gm, '<div class="bullet-item">• $1</div>') // Bullet lists
      .replace(/\n\n/g, '<br><br>') // Double line breaks
      .replace(/\n/g, '<br>'); // Single line breaks
  }

  hasAnalysisContent(): boolean {
    return !!(this.analysisResult && this.analysisResult.trim().length > 0);
  }
}
