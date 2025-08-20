import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

const STORAGE_KEY = 'netauditai.supabase.auth.token';

class CustomStorageAdapter {
  getItem(key: string): string | null {
    return localStorage.getItem(key) || sessionStorage.getItem(key);
  }

  setItem(key: string, value: string): void {
    const rememberMe = localStorage.getItem('netauditai-remember-me') === 'true';

    if (rememberMe) {
      localStorage.setItem(key, value);
    } else {
      sessionStorage.setItem(key, value);
    }
  }

  removeItem(key: string): void {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private static supabaseClient: SupabaseClient = createClient(
    environment.supabaseUrl,
    environment.supabaseAnonKey,
    {
      auth: {
        persistSession: true,
        storageKey: STORAGE_KEY,
        storage: new CustomStorageAdapter(),
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );

  constructor() {}

  getClient(): SupabaseClient {
    return DatabaseService.supabaseClient;
  }

  get auth() {
    return this.getClient().auth;
  }

  from(tableName: string) {
    return this.getClient().from(tableName);
  }
}
