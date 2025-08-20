import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';

import { AssistantService, ChatMessage } from '../../services/assistant.service';

@Component({
  selector: 'app-assistant',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzButtonModule,
    NzCardModule,
    NzInputModule,
    NzIconModule,
    NzSpinModule,
    NzDividerModule,
    NzToolTipModule
  ],
  templateUrl: './assistant.component.html',
  styleUrls: ['./assistant.component.scss']
})
export class AssistantComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  @ViewChild('messageInput') private messageInput!: ElementRef;

  private destroy$ = new Subject<void>();
  private shouldScrollToBottom = false;

  messages: ChatMessage[] = [];
  isExpanded = false;
  isLoading = false;
  currentMessage = '';
  isClosing = false;

  constructor(private assistantService: AssistantService) {}

  ngOnInit(): void {
    // Subscribe to service observables
    this.assistantService.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(messages => {
        this.messages = messages;
        this.shouldScrollToBottom = true;
      });

    this.assistantService.isExpanded$
      .pipe(takeUntil(this.destroy$))
      .subscribe(expanded => {
        this.isExpanded = expanded;
        if (expanded) {
          // Focus input when chat opens
          setTimeout(() => this.focusInput(), 100);
        }
      });

    this.assistantService.isLoading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => {
        this.isLoading = loading;
        if (loading) {
          this.shouldScrollToBottom = true;
        }
      });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleChat(): void {
    this.assistantService.toggleExpanded();
  }

  closeChat(): void {
    this.isClosing = true;
    setTimeout(() => {
      this.assistantService.setExpanded(false);
      this.isClosing = false;
    }, 400); // Match animation duration
  }

  sendMessage(): void {
    if (!this.currentMessage.trim() || this.isLoading) {
      return;
    }

    const message = this.currentMessage.trim();
    this.currentMessage = '';

    this.assistantService.sendMessage(message).subscribe({
      next: () => {
        // Success handled by service
      },
      error: (error) => {
        console.error('Failed to send message:', error);
        // Error handled by service
      }
    });
  }

  startNewChat(): void {
    this.assistantService.startNewChat();
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  formatTimestamp(timestamp: Date): string {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private scrollToBottom(): void {
    if (this.messagesContainer) {
      const element = this.messagesContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    }
  }

  private focusInput(): void {
    if (this.messageInput) {
      this.messageInput.nativeElement.focus();
    }
  }
}
