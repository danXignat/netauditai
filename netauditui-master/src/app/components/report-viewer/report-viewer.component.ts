import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzMessageService } from 'ng-zorro-antd/message';
import { ScanService, ScanRequest } from '../../services/scan.service';
import { AnalysisService } from '../../services/analysis.service';
import { TableEntry } from '../../services/data.service';

@Component({
  selector: 'app-report-viewer',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzInputModule,
    NzButtonModule,
    NzCardModule,
    NzDividerModule,
    NzSpinModule,
    NzIconModule,
    NzFormModule
  ],
  templateUrl: './report-viewer.component.html',
  styleUrls: ['./report-viewer.component.scss']
})
export class ReportViewerComponent implements OnInit, OnDestroy {
  private scanService = inject(ScanService);
  private analysisService = inject(AnalysisService);
  private message = inject(NzMessageService);
  private http = inject(HttpClient);
  private destroy$ = new Subject<void>();

  result: any = null;
  loading = false;
  selectedDevice: TableEntry | null = null;

  privateKeyContent: string = '';
  privateKeyLoaded: boolean = false;

  sudoPassword: string = '';

  ngOnInit(): void {
    this.scanService.selectedDevice$
      .pipe(takeUntil(this.destroy$))
      .subscribe(device => {
        this.selectedDevice = device;
        this.clearPrivateKey();
        this.clearSudoPassword();
        this.result = null;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearPrivateKey();
    this.clearSudoPassword();
  }

  get isFormValid(): boolean {
    return this.selectedDevice !== null &&
      this.privateKeyLoaded &&
      this.sudoPassword.trim().length > 0;
  }

  getKeys(obj: object): string[] {
    return Object.keys(obj || {});
  }

  formatResultTitle(key: string): string {
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  getFormattedJson(data: any): string {
    if (typeof data === 'string') {
      return data;
    }
    return JSON.stringify(data, null, 2);
  }

  formatJsonOutput(data: any): string {
    if (typeof data === 'string') {
      return data;
    }

    let jsonString = JSON.stringify(data, null, 2);

    jsonString = jsonString
      .replace(/"([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}(?::[0-9]+)?)"(\s*:)/g, '<span class="json-ip">"$1"</span>$2')
      .replace(/"([^"]+)"(\s*:)/g, '<span class="json-key">"$1"</span>$2')
      .replace(/:\s*"([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}(?::[0-9]+)?)"/g, ': <span class="json-ip">"$1"</span>')
      .replace(/:\s*"([^"]*)"/g, ': <span class="json-string">"$1"</span>')
      .replace(/:\s*(-?\d+(?:\.\d+)?)/g, ': <span class="json-number">$1</span>')
      .replace(/:\s*(true|false)/g, ': <span class="json-boolean">$1</span>')
      .replace(/:\s*(null)/g, ': <span class="json-null">$1</span>');

    return jsonString;
  }

  formatPacketTracerOutput(data: any): string {
    if (typeof data === 'string') {
      return data;
    }

    let jsonString = JSON.stringify(data, null, 2);

    // Apply security-based color coding for packet tracer results
    jsonString = jsonString
      .replace(/"([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}(?::[0-9]+)?)"(\s*:)/g, '<span class="json-ip">"$1"</span>$2')
      .replace(/"([^"]+)"(\s*:)/g, '<span class="json-key">"$1"</span>$2')
      // Green for safe/clear indicators
      .replace(/:\s*"([^"]*\b(?:clear|safe|normal|ok|passed|clean|legitimate|allowed|accepted|valid|trusted)\b[^"]*)"/gi, ': <span class="json-security-clear">"$1"</span>')
      // Red for suspicious/malicious indicators
      .replace(/:\s*"([^"]*\b(?:suspicious|malicious|blocked|threat|danger|warning|alert|infected|compromised|unsafe|denied|rejected|invalid|untrusted|risky|harmful)\b[^"]*)"/gi, ': <span class="json-security-suspicious">"$1"</span>')
      // IP addresses
      .replace(/:\s*"([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}(?::[0-9]+)?)"/g, ': <span class="json-ip">"$1"</span>')
      // Regular strings
      .replace(/:\s*"([^"]*)"/g, ': <span class="json-string">"$1"</span>')
      // Numbers
      .replace(/:\s*(-?\d+(?:\.\d+)?)/g, ': <span class="json-number">$1</span>')
      // Booleans
      .replace(/:\s*(true|false)/g, ': <span class="json-boolean">$1</span>')
      // Null values
      .replace(/:\s*(null)/g, ': <span class="json-null">$1</span>');

    return jsonString;
  }

  // Helper method to determine if a result should use packet tracer formatting
  isPacketTracerResult(key: string): boolean {
    return key.toLowerCase().includes('packet') ||
           key.toLowerCase().includes('tracer') ||
           key.toLowerCase().includes('security') ||
           key.toLowerCase().includes('threat');
  }

  onPrivateKeyFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.privateKeyContent = e.target?.result as string;
        this.privateKeyLoaded = true;

        if (!this.isValidPrivateKey(this.privateKeyContent)) {
          this.message.error('Invalid private key format');
          this.clearPrivateKey();
        }
      };
      reader.onerror = () => {
        this.message.error('Failed to read private key file');
        this.clearPrivateKey();
      };
      reader.readAsText(file);
    }
  }

  onSudoPasswordChange(value: string): void {
    this.sudoPassword = value;
  }

  private isValidPrivateKey(content: string): boolean {
    const privateKeyPatterns = [
      /-----BEGIN RSA PRIVATE KEY-----/,
      /-----BEGIN PRIVATE KEY-----/,
      /-----BEGIN OPENSSH PRIVATE KEY-----/,
      /-----BEGIN EC PRIVATE KEY-----/,
      /-----BEGIN DSA PRIVATE KEY-----/
    ];

    return privateKeyPatterns.some(pattern => pattern.test(content));
  }

  private clearPrivateKey(): void {
    this.privateKeyContent = '';
    this.privateKeyLoaded = false;
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  private clearSudoPassword(): void {
    this.sudoPassword = '';
  }

  private clearAllSensitiveData(): void {
    this.clearPrivateKey();
    this.clearSudoPassword();
  }

  getValidationErrors(): string[] {
    const errors: string[] = [];

    if (!this.selectedDevice) {
      errors.push('Please select a device first');
    }
    if (!this.privateKeyLoaded) {
      errors.push('Please upload your SSH private key');
    }
    if (!this.sudoPassword.trim()) {
      errors.push('Please enter the sudo password');
    }

    return errors;
  }

  onSubmit(): void {
    const errors = this.getValidationErrors();
    if (errors.length > 0) {
      errors.forEach(error => this.message.error(error));
      return;
    }

    const request: ScanRequest = {
      method: 'ssh',
      ip: this.selectedDevice!.ip,
      username: this.selectedDevice!.username,
      private_key: this.privateKeyContent,
      sudo_pwd: this.sudoPassword
    };

    this.loading = true;
    this.scanService.scan(request).subscribe({
      next: res => {
        this.result = res;
        this.loading = false;
        this.message.success('Scan completed successfully');

        // Automatically trigger analysis after successful scan
        this.triggerAnalysis(res);

        // SECURITY OPTIONS: Clear sensitive data after successful scan
        this.clearSudoPassword();  // Clear sudo password after successful scan
        this.clearPrivateKey();    // Clear private key after successful scan (forces re-upload)
        // this.clearAllSensitiveData(); // Alternative: Clear both password and private key
      },
      error: err => {
        console.error('Scan error:', err);
        this.result = null;
        this.loading = false;
        this.message.error('Scan failed: ' + (err.error?.message || err.message || 'Unknown error'));
      }
    });
  }

  private triggerAnalysis(scanResult: any): void {
    if (!scanResult || !scanResult.results) {
      return;
    }

    const hasRequiredData =
      scanResult.results.performance_assessment ||
      scanResult.results.network_scan_result ||
      scanResult.results.packet_tracer_result;

    if (!hasRequiredData) {
      return;
    }

    // Only trigger analysis if the service exists
    if (this.analysisService) {
      this.analysisService.analyzeScanResults(scanResult).subscribe({
        next: (analysisResponse) => {
          // Analysis completed successfully
        },
        error: (error) => {
          console.error('Analysis failed:', error);
          this.message.warning('Scan completed, but analysis failed. Please check the Analysis Dashboard for details.');
        }
      });
    }
  }
}
