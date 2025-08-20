import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { DatabaseService } from './db.service';
import { AuthService } from './auth.service';

export interface TableEntry {
  id?: string;
  user_id: string;
  device: string;
  username: string;
  ip: string;
}

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private entriesSubject = new BehaviorSubject<TableEntry[]>([]);
  public entries$ = this.entriesSubject.asObservable();

  constructor(
    private dbService: DatabaseService,
    private authService: AuthService
  ) {}

  async loadEntries(): Promise<void> {
    try {
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      const { data, error } = await this.dbService
        .from('devices')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const entries = data.map(entry => ({
        ...entry,
        date: new Date(entry.date)
      }));

      this.entriesSubject.next(entries);
    } catch (error: any) {
      console.error('Error loading entries:', error);
      throw new Error(error.message || 'Failed to load entries');
    }
  }

  async createEntry(entry: Omit<TableEntry, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<void> {
    try {
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      const { data, error } = await this.dbService
        .from('devices')
        .insert({
          device: entry.device,
          user_id: currentUser.id,
          username: entry.username,
          ip: entry.ip,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      await this.loadEntries();
    } catch (error: any) {
      console.error('Error creating entry:', error);
      throw new Error(error.message || 'Failed to create entry');
    }
  }

  async updateEntry(id: string, updates: Partial<Omit<TableEntry, 'id' | 'author' | 'created_at'>>): Promise<void> {
    try {
      const updateData: any = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      const { error } = await this.dbService
        .from('devices')
        .update(updateData)
        .eq('id', id);

      if (error) {
        throw error;
      }

      await this.loadEntries();
    } catch (error: any) {
      console.error('Error updating entry:', error);
      throw new Error(error.message || 'Failed to update entry');
    }
  }

  async deleteEntry(id: string): Promise<void> {
    try {
      const { error } = await this.dbService
        .from('devices')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      await this.loadEntries();
    } catch (error: any) {
      console.error('Error deleting entry:', error);
      throw new Error(error.message || 'Failed to delete entry');
    }
  }
}
