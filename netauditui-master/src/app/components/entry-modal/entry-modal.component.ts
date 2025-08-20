import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';

import { TableEntry } from '../../services/data.service';

export interface EntryFormData {
  device: string;
  username: string;
  ip: string;
}

@Component({
  selector: 'app-entry-modal',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NzModalModule,
    NzFormModule,
    NzInputModule,
    NzDatePickerModule
  ],
  templateUrl: './entry-modal.component.html',
  styleUrls: ['./entry-modal.component.scss'],
  standalone: true
})
export class EntryModalComponent implements OnChanges {
  @Input() visible = false;
  @Input() loading = false;
  @Input() editMode = false;
  @Input() entryData: TableEntry | null = null;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() save = new EventEmitter<EntryFormData>();
  @Output() cancel = new EventEmitter<void>();

  entryForm!: FormGroup;

  constructor(private fb: FormBuilder) {
    this.initializeForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['entryData'] || changes['editMode']) {
      this.updateForm();
    }
  }

  private initializeForm(): void {
    this.entryForm = this.fb.group({
      device: ['', [Validators.required, Validators.maxLength(255)]],
      username: ['', [Validators.required, Validators.maxLength(100)]],
      ip: ['', [Validators.required, this.ipValidator]]
    });
  }

  private updateForm(): void {
    if (this.editMode && this.entryData) {
      this.entryForm.patchValue({
        device: this.entryData.device || '',
        username: this.entryData.username || '',
        ip: this.entryData.ip || ''
      });
    } else {
      this.entryForm.reset();
    }
  }

  private ipValidator(control: any) {
    if (!control.value || !control.value.trim()) return null;
    const ipPattern = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^host\.docker\.internal$|^localhost$/;
    const value = control.value.trim();

    if (value === 'localhost' || value === 'host.docker.internal') {
      return null;
    }

    if (!ipPattern.test(value)) {
      return { invalidIp: true };
    }

    if (value.includes('.')) {
      const octets = value.split('.');
      if (octets.length === 4) {
        for (const octet of octets) {
          const num = parseInt(octet, 10);
          if (isNaN(num) || num < 0 || num > 255) {
            return { invalidIp: true };
          }
        }
      }
    }

    return null;
  }

  get modalTitle(): string {
    return this.editMode ? 'Edit Device' : 'Add New Device';
  }

  get okText(): string {
    return this.editMode ? 'Update' : 'Create';
  }

  handleCancel(): void {
    this.visibleChange.emit(false);
    this.cancel.emit();
  }

  handleOk(): void {
    if (this.entryForm.valid) {
      this.save.emit(this.entryForm.value);
    } else {
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.entryForm.controls).forEach(key => {
      const control = this.entryForm.get(key);
      control?.markAsTouched();
    });
  }

  getErrorMessage(field: string): string {
    const control = this.entryForm.get(field);
    if (control?.hasError('required')) {
      return `${this.getFieldDisplayName(field)} is required`;
    }
    if (control?.hasError('maxlength')) {
      const maxLength = control.errors!['maxlength'].requiredLength;
      return `Maximum ${maxLength} characters allowed`;
    }
    if (control?.hasError('invalidIp')) {
      return 'Please enter a valid IP address';
    }
    return '';
  }

  private getFieldDisplayName(field: string): string {
    const displayNames: { [key: string]: string } = {
      device: 'Device name',
      username: 'Username',
      ip: 'IP Address'
    };
    return displayNames[field] || field;
  }

  isFieldInvalid(field: string): boolean {
    const control = this.entryForm.get(field);
    return !!(control?.invalid && (control?.dirty || control?.touched));
  }
}
