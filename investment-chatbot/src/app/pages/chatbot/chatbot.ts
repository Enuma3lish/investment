import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { PromptService } from '../../services/prompt.service';
import { AuthService } from '../../services/auth.service';

interface HistoryItem {
  symbol: string;
  prompt: string;
  result: any;
  timestamp: Date;
}

export interface AnalysisResult {
  symbol: string;
  prompt: string;
  twstock_analysis: {
    buy: string | boolean;
    sell: string | boolean;
    summary: any[];
    price: number;
    best_four_point: any;
    change?: number;
    change_percent?: number;
  };
  gemini_opinion: string;
  claude_opinion: string;
  raw_data?: any;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot.html',
  styleUrls: ['./chatbot.scss'],
})
export class ChatbotComponent implements OnInit, OnDestroy {
  symbol = '';
  prompt = '';
  result: AnalysisResult | null = null;
  loading = false;
  remainingPrompts = 10;

  history: HistoryItem[] = [];
  paginatedHistory: HistoryItem[] = [];
  currentPage = 1;
  itemsPerPage = 5;
  totalPages = 1;
  private currentSubscription: Subscription | null = null;
  private pollingTimeout: any = null;

  constructor(
    private promptService: PromptService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.remainingPrompts = this.getRemainingPrompts();
    this.loadHistory();
  }

  ngOnDestroy(): void {
    this.cancelCurrentRequest();
  }

  private cancelCurrentRequest() {
    if (this.currentSubscription) {
      console.log('🚫 Cancelling previous request');
      this.currentSubscription.unsubscribe();
      this.currentSubscription = null;
    }
    if (this.pollingTimeout) {
      clearTimeout(this.pollingTimeout);
      this.pollingTimeout = null;
    }
  }

  submitPrompt() {
    if (!this.symbol || !this.prompt || this.loading || this.remainingPrompts <= 0) return;

    // Validate stock symbol
    if (!this.promptService.isValidStockSymbol(this.symbol)) {
      alert('Please enter a valid 4-digit Taiwan stock code (e.g., 2330)');
      return;
    }

    this.cancelCurrentRequest();

    this.loading = true;
    this.result = null;

    console.log('🚀 Submitting prompt:', this.symbol, this.prompt);

    this.currentSubscription = this.promptService.sendPrompt(this.symbol, this.prompt).subscribe({
      next: (res) => {
        console.log('✅ Got response:', res);
        const taskId = res.task_id;
        console.log('🔄 Starting to poll for task:', taskId);

        this.pollResult(taskId, 20, 2000); // 20 attempts, 2 second intervals
        this.decrementPrompts();
      },
      error: (err) => {
        console.error('❌ Prompt error:', err);
        this.loading = false;
        this.currentSubscription = null;
        alert('Failed to submit analysis request: ' + err.message);
      }
    });
  }

  private pollResult(taskId: string, retries = 20, delayMs = 2000) {
    if (retries <= 0) {
      console.log('⏰ Polling timeout for task:', taskId);
      this.loading = false;
      this.result = null;
      alert('Analysis timed out. Please try again.');
      return;
    }

    console.log(`🔍 Polling attempt ${21 - retries}/20 for task:`, taskId);

    this.pollingTimeout = setTimeout(() => {
      if (!this.loading) {
        console.log('🚫 Polling cancelled (loading = false)');
        return;
      }

      this.currentSubscription = this.promptService.getResult(taskId).subscribe({
        next: (res) => {
          console.log('📝 Poll response:', res);
          if (res.status === 'done') {
            console.log('✅ Task completed:', taskId);

            if (res.result) {
              // ✅ FIXED: Better handling of API response structure
              this.result = {
                symbol: res.result.symbol || this.symbol,
                prompt: res.result.prompt || this.prompt,
                twstock_analysis: {
                  buy: res.result.twstock_analysis?.buy || false,
                  sell: res.result.twstock_analysis?.sell || false,
                  summary: res.result.twstock_analysis?.summary || [],
                  price: res.result.twstock_analysis?.price || 0,
                  best_four_point: res.result.twstock_analysis?.best_four_point || null,
                  change: (res.result.twstock_analysis as AnalysisResult['twstock_analysis'])?.change,
                  change_percent: (res.result.twstock_analysis as AnalysisResult['twstock_analysis'])?.change_percent
                },
                gemini_opinion: res.result.gemini_opinion || '',
                claude_opinion: res.result.claude_opinion || '',
                raw_data: res.result.raw_data || res.result
              };

              console.log('✅ Processed result:', this.result);
              this.saveToHistory();
            } else {
              console.warn('⚠️ Result is empty');
              this.result = null;
            }

            this.loading = false;
            this.currentSubscription = null;
          } else if (res.status === 'failed') {
            console.log('❌ Task failed:', taskId);
            this.loading = false;
            this.result = null;
            this.currentSubscription = null;
            alert('Analysis failed: ' + (res.error || 'Unknown error'));
          } else if (res.status === 'pending') {
            console.log('⏳ Task still pending, retrying...', retries - 1, 'attempts left');
            this.pollResult(taskId, retries - 1, delayMs);
          } else {
            console.log('❓ Unknown status:', res.status);
            this.pollResult(taskId, retries - 1, delayMs);
          }
        },
        error: (err) => {
          console.error('❌ Polling error:', err);
          this.loading = false;
          this.currentSubscription = null;
          alert('Failed to get analysis results: ' + err.message);
        }
      });
    }, delayMs);
  }

  private saveToHistory() {
    if (this.result) {
      const newHistoryItem: HistoryItem = {
        symbol: this.symbol,
        prompt: this.prompt,
        result: this.result,
        timestamp: new Date()
      };
      this.history.unshift(newHistoryItem);

      // Keep only last 20 items
      if (this.history.length > 20) {
        this.history = this.history.slice(0, 20);
      }

      localStorage.setItem('chatbotHistory', JSON.stringify(this.history));
      this.updatePagination();
    }
  }

  loadHistory() {
    try {
      const saved = localStorage.getItem('chatbotHistory');
      if (saved) {
        this.history = JSON.parse(saved);
        // Convert timestamp strings back to Date objects
        this.history.forEach(item => {
          if (typeof item.timestamp === 'string') {
            item.timestamp = new Date(item.timestamp);
          }
        });
        this.updatePagination();
      }
    } catch (error) {
      console.error('Error loading history:', error);
      this.history = [];
    }
  }

  updatePagination() {
    this.totalPages = Math.ceil(this.history.length / this.itemsPerPage);
    this.currentPage = Math.min(this.currentPage, this.totalPages) || 1;
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.paginatedHistory = this.history.slice(start, end);
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  // Load sample questions
  loadSampleQuestion(symbol: string, prompt: string) {
    this.symbol = symbol;
    this.prompt = prompt;
  }

  // Navigation methods
  navigateToTrade() {
    this.router.navigate(['/trade']);
  }

  navigateToPortfolio() {
    this.router.navigate(['/portfolio']);
  }

  // Utility methods
  private getRemainingPrompts(): number {
    const stored = localStorage.getItem('remainingPrompts');
    return stored ? parseInt(stored, 10) : 10;
  }

  private decrementPrompts() {
    this.remainingPrompts = Math.max(0, this.remainingPrompts - 1);
    localStorage.setItem('remainingPrompts', this.remainingPrompts.toString());
  }

  formatTime(timestamp: Date | string): string {
    try {
      const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
      return new Intl.DateTimeFormat('zh-TW', {
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      return 'Invalid date';
    }
  }

  logout() {
    this.cancelCurrentRequest();
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  onDeleteAccount() {
    const confirmed = confirm('Are you sure you want to delete your account?');
    if (!confirmed) return;

    this.authService.deleteAccount().subscribe({
      next: () => {
        this.authService.logout();
        this.router.navigate(['/register']);
      },
      error: (err) => {
        console.error('Account deletion failed:', err);
        alert('Failed to delete account: ' + err.message);
      }
    });
  }
}
