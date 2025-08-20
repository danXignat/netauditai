import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import {environment} from '../../environments/environment';

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  isLoading?: boolean;
}

export interface PromptRequest {
  prompt: string;
}

export interface ChatResponse {
  response?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AssistantService {
  private readonly CHAT_ENDPOINT = environment.assistantUrl;

  private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  private isExpandedSubject = new BehaviorSubject<boolean>(false);

  public messages$ = this.messagesSubject.asObservable();
  public isLoading$ = this.isLoadingSubject.asObservable();
  public isExpanded$ = this.isExpandedSubject.asObservable();

  constructor(private http: HttpClient) {
    this.addWelcomeMessage();
  }

  sendMessage(content: string): Observable<ChatResponse> {
    if (!content.trim()) {
      return throwError(() => new Error('Message content cannot be empty'));
    }

    const userMessage = this.createMessage(content, 'user');
    this.addMessage(userMessage);

    const loadingMessage = this.createMessage('', 'assistant', true);
    this.addMessage(loadingMessage);

    this.isLoadingSubject.next(true);

    const request: PromptRequest = { prompt: content };

    return this.http.post<ChatResponse>(this.CHAT_ENDPOINT, request)
      .pipe(
        tap(response => {
          this.handleSuccessResponse(response, loadingMessage.id);
        }),
        catchError(error => {
          this.handleErrorResponse(error, loadingMessage.id);
          return throwError(() => error);
        })
      );
  }

  /**
   * Toggle chat window expanded state
   */
  toggleExpanded(): void {
    this.isExpandedSubject.next(!this.isExpandedSubject.value);
  }

  /**
   * Set expanded state
   */
  setExpanded(expanded: boolean): void {
    this.isExpandedSubject.next(expanded);
  }

  /**
   * Start a new chat (clear history)
   */
  startNewChat(): void {
    this.messagesSubject.next([]);
    this.addWelcomeMessage();
    this.isLoadingSubject.next(false);
  }

  /**
   * Get current messages
   */
  getCurrentMessages(): ChatMessage[] {
    return this.messagesSubject.value;
  }

  /**
   * Get expanded state
   */
  getIsExpanded(): boolean {
    return this.isExpandedSubject.value;
  }

  /**
   * Get loading state
   */
  getIsLoading(): boolean {
    return this.isLoadingSubject.value;
  }

  /**
   * Private helper methods
   */
  private createMessage(content: string, role: 'user' | 'assistant', isLoading = false): ChatMessage {
    return {
      id: this.generateMessageId(),
      content,
      role,
      timestamp: new Date(),
      isLoading
    };
  }

  private addMessage(message: ChatMessage): void {
    const currentMessages = this.messagesSubject.value;
    this.messagesSubject.next([...currentMessages, message]);
  }

  private updateMessage(messageId: string, updates: Partial<ChatMessage>): void {
    const currentMessages = this.messagesSubject.value;
    const updatedMessages = currentMessages.map(msg =>
      msg.id === messageId ? { ...msg, ...updates } : msg
    );
    this.messagesSubject.next(updatedMessages);
  }

  private removeMessage(messageId: string): void {
    const currentMessages = this.messagesSubject.value;
    const filteredMessages = currentMessages.filter(msg => msg.id !== messageId);
    this.messagesSubject.next(filteredMessages);
  }

  private handleSuccessResponse(response: ChatResponse, loadingMessageId: string): void {
    this.isLoadingSubject.next(false);

    if (response.error) {
      this.updateMessage(loadingMessageId, {
        content: `Sorry, I encountered an error: ${response.error}`,
        isLoading: false
      });
    } else if (response.response) {
      this.updateMessage(loadingMessageId, {
        content: response.response,
        isLoading: false
      });
    } else {
      this.updateMessage(loadingMessageId, {
        content: 'Sorry, I received an unexpected response format.',
        isLoading: false
      });
    }
  }

  private handleErrorResponse(error: HttpErrorResponse, loadingMessageId: string): void {
    this.isLoadingSubject.next(false);

    let errorMessage = 'Sorry, I\'m having trouble connecting right now.';

    if (error.status === 0) {
      errorMessage = 'Unable to connect to the assistant service. Please check if the service is running.';
    } else if (error.status >= 400 && error.status < 500) {
      errorMessage = 'There was an issue with your request. Please try again.';
    } else if (error.status >= 500) {
      errorMessage = 'The assistant service is currently unavailable. Please try again later.';
    }

    this.updateMessage(loadingMessageId, {
      content: errorMessage,
      isLoading: false
    });
  }

  private addWelcomeMessage(): void {
    const welcomeMessage = this.createMessage(
      'Hello! I\'m your AI assistant. How can I help you today?',
      'assistant'
    );
    this.addMessage(welcomeMessage);
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
