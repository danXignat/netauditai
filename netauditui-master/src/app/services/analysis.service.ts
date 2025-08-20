import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface AnalysisRequest {
  performance_assessment: any;
  network_scan_result: any;
  packet_tracer_result: any;
}

export interface AnalysisResponse {
  analysis?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AnalysisService {
  private readonly ANALYSIS_ENDPOINT = environment.analysisUrl;

  private analysisResultSubject = new BehaviorSubject<string | null>(null);
  private isAnalyzingSubject = new BehaviorSubject<boolean>(false);
  private analysisErrorSubject = new BehaviorSubject<string | null>(null);

  public analysisResult$ = this.analysisResultSubject.asObservable();
  public isAnalyzing$ = this.isAnalyzingSubject.asObservable();
  public analysisError$ = this.analysisErrorSubject.asObservable();

  constructor(private http: HttpClient) {}

  analyzeScanResults(scanData: any): Observable<AnalysisResponse> {
    if (!scanData || !scanData.results) {
      return throwError(() => new Error('Invalid scan data provided'));
    }

    const analysisRequest: AnalysisRequest = {
      performance_assessment: scanData.results.performance_assessment || {},
      network_scan_result: scanData.results.network_scan_result || {},
      packet_tracer_result: scanData.results.packet_tracer_result || {}
    };

    this.isAnalyzingSubject.next(true);
    this.analysisErrorSubject.next(null);

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    return this.http.post<AnalysisResponse>(this.ANALYSIS_ENDPOINT, analysisRequest, { headers })
      .pipe(
        tap(response => {
          this.handleSuccessResponse(response);
        }),
        catchError(error => {
          this.handleErrorResponse(error);
          return throwError(() => error);
        })
      );
  }

  clearAnalysis(): void {
    this.analysisResultSubject.next(null);
    this.analysisErrorSubject.next(null);
    this.isAnalyzingSubject.next(false);
  }

  getCurrentAnalysis(): string | null {
    return this.analysisResultSubject.value;
  }

  getIsAnalyzing(): boolean {
    return this.isAnalyzingSubject.value;
  }

  getCurrentError(): string | null {
    return this.analysisErrorSubject.value;
  }

  private handleSuccessResponse(response: AnalysisResponse): void {
    this.isAnalyzingSubject.next(false);

    if (response.error) {
      this.analysisErrorSubject.next(response.error);
      this.analysisResultSubject.next(null);
    } else if (response.analysis) {
      this.analysisResultSubject.next(response.analysis);
      this.analysisErrorSubject.next(null);
    } else {
      this.analysisErrorSubject.next('Received unexpected response format');
      this.analysisResultSubject.next(null);
    }
  }

  private handleErrorResponse(error: HttpErrorResponse): void {
    this.isAnalyzingSubject.next(false);
    this.analysisResultSubject.next(null);

    let errorMessage = 'Failed to analyze scan results. Please try again.';

    if (error.status === 0) {
      errorMessage = 'Unable to connect to the analysis service. Please check if the service is running.';
    } else if (error.status >= 400 && error.status < 500) {
      errorMessage = 'Invalid request. Please check your scan data and try again.';
    } else if (error.status >= 500) {
      errorMessage = 'The analysis service is currently unavailable. Please try again later.';
    }

    if (error.error?.error) {
      errorMessage = `Analysis failed: ${error.error.error}`;
    }

    this.analysisErrorSubject.next(errorMessage);
  }
}
