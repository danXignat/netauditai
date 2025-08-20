import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { NzTableModule } from 'ng-zorro-antd/table';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';

import { DataService, TableEntry } from '../../services/data.service';
import { ScanService } from '../../services/scan.service';
import { EntryModalComponent, EntryFormData } from '../entry-modal/entry-modal.component';
import { ReportViewerComponent } from '../report-viewer/report-viewer.component';
import { NzPopconfirmDirective } from 'ng-zorro-antd/popconfirm';

@Component({
  selector: 'app-device-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzTableModule,
    NzRadioModule,
    NzIconModule,
    NzButtonModule,
    EntryModalComponent,
    ReportViewerComponent,
    NzPopconfirmDirective
  ],
  templateUrl: './device-list.component.html',
  styleUrls: ['./device-list.component.scss']
})
export class DeviceListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  entries = signal<TableEntry[]>([]);
  isLoading = signal<boolean>(false);

  selectedDeviceId: string | null = null;

  isModalVisible = false;
  isEditMode = false;
  editingEntry: TableEntry | null = null;

  constructor(
    private dataService: DataService,
    private scanService: ScanService,
    private message: NzMessageService
  ) {}

  ngOnInit(): void {
    this.loadDevices();
    this.subscribeToEntries();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private subscribeToEntries(): void {
    this.dataService.entries$
      .pipe(takeUntil(this.destroy$))
      .subscribe(entries => {
        this.entries.set(entries);
        if (this.selectedDeviceId && !entries.find(entry => entry.id === this.selectedDeviceId)) {
          this.clearSelection();
        }
      });
  }

  private async loadDevices(): Promise<void> {
    this.isLoading.set(true);
    try {
      await this.dataService.loadEntries();
    } catch (error: any) {
      this.message.error(error.message || 'Failed to load devices');
    } finally {
      this.isLoading.set(false);
    }
  }

  selectDevice(device: TableEntry): void {
    this.selectedDeviceId = device.id!;
    this.scanService.setSelectedDevice(device);
  }

  openModal(): void {
    this.isEditMode = false;
    this.editingEntry = null;
    this.isModalVisible = true;
  }

  openEditModal(entry: TableEntry): void {
    this.isEditMode = true;
    this.editingEntry = entry;
    this.isModalVisible = true;

    if (this.selectedDeviceId === entry.id) {
      this.clearSelection();
    }
  }

  onModalCancel(): void {
    this.isModalVisible = false;
    this.editingEntry = null;
  }

  async onModalSave(formData: EntryFormData): Promise<void> {
    this.isLoading.set(true);
    try {
      if (this.isEditMode && this.editingEntry?.id) {
        await this.dataService.updateEntry(this.editingEntry.id, formData);
        this.message.success('Device updated successfully!');
      } else {
        await this.dataService.createEntry(formData);
        this.message.success('Device added successfully!');
      }

      this.isModalVisible = false;
      this.editingEntry = null;
    } catch (error: any) {
      this.message.error(error.message || 'Operation failed');
    } finally {
      this.isLoading.set(false);
    }
  }

  async deleteEntry(id: string): Promise<void> {
    this.isLoading.set(true);
    try {
      await this.dataService.deleteEntry(id);
      this.message.success('Entry deleted successfully!');

      if (this.selectedDeviceId === id) {
        this.clearSelection();
      }
    } catch (error: any) {
      this.message.error(error.message || 'Failed to delete entry');
    } finally {
      this.isLoading.set(false);
    }
  }

  clearSelection(): void {
    this.selectedDeviceId = null;
    this.scanService.setSelectedDevice(null);
  }

  onDeviceSelectionChange(deviceId: string): void {
    const device = this.entries().find(entry => entry.id === deviceId);
    if (device) {
      this.selectDevice(device);
    }
  }
}
