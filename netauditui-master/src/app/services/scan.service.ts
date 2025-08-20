import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { TableEntry } from './data.service';
import {environment} from '../../environments/environment';

export interface ScanRequest {
  method: string;
  ip: string;
  username: string;
  private_key: string;
  sudo_pwd: string;
}

@Injectable({
  providedIn: 'root'
})
export class ScanService {
  private readonly apiUrl = environment.scannerUrl;

  private selectedDeviceSubject = new BehaviorSubject<TableEntry | null>(null);
  public selectedDevice$ = this.selectedDeviceSubject.asObservable();

  constructor(private http: HttpClient) {}

  scan(req: ScanRequest): Observable<any> {
    return this.http.post<any>(this.apiUrl, req);
  }

  setSelectedDevice(device: TableEntry | null): void {
    this.selectedDeviceSubject.next(device);
  }
}
