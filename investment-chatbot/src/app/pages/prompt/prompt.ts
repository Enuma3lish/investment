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
  result: string;
  timestamp: Date;
}

@Component({
  selector: 'app-prompt',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './prompt.html',
  styleUrls: ['./prompt.scss'],
})
export class PromptComponent implements OnInit, OnDestroy {
  symbol = '';
  prompt = '';
  result = '';
  loading = false;
  remainingPrompts = 10;
  error = '';

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
      this.currentSubscription.unsubscribe();
      this.currentSubscription = null;
    }
    if (this.pollingTimeout) {
      clearTimeout(this.pollingTimeout);
      this.pollingTimeout = null;
    }
  }

  submitPrompt() {
    if (!this.symbol || !this.prompt || this.loading || this.remainingPrompts <= 0) {
      return;
    }

    if (!this.promptService.isValidStockSymbol(this.symbol)) {
      this.error = 'Please enter a valid 4-digit Taiwan stock code';
      return;
    }

    if (this.prompt.trim().length < 5) {
      this.error = 'Please enter a more detailed question (at least 5 characters)';
      return;
    }

    this.cancelCurrentRequest();
    this.loading = true;
    this.result = '';
    this.error = '';

    this.currentSubscription = this.promptService.sendPrompt(this.symbol, this.prompt).subscribe({
      next: (res) => {
        const taskId = res.task_id;
        this.pollResult(taskId, 15, 2000);
        this.decrementPrompts();
      },
      error: (err) => {
        this.error = err.message || 'Failed to submit analysis request';
        this.loading = false;
        this.currentSubscription = null;
      }
    });
  }

  private pollResult(taskId: string, retries = 15, delayMs = 2000) {
    if (retries <= 0) {
      this.loading = false;
      this.error = 'Analysis timed out. Please try again.';
      return;
    }

    this.pollingTimeout = setTimeout(() => {
      if (!this.loading) return;

      this.currentSubscription = this.promptService.getResult(taskId).subscribe({
        next: (res) => {
          if (res.status === 'done' && res.result) {
            this.result = this.formatAnalysisResult(res.result);
            this.saveToHistory();
            this.loading = false;
            this.currentSubscription = null;
          } else if (res.status === 'failed') {
            this.error = res.error || 'Analysis failed';
            this.loading = false;
            this.currentSubscription = null;
          } else if (res.status === 'pending') {
            this.pollResult(taskId, retries - 1, delayMs);
          } else {
            this.pollResult(taskId, retries - 1, delayMs);
          }
        },
        error: (err) => {
          this.error = err.message || 'Failed to get analysis results';
          this.loading = false;
          this.currentSubscription = null;
        }
      });
    }, delayMs);
  }

  private formatAnalysisResult(result: any): string {
    let output = `Analysis for ${result.symbol?.toUpperCase()}\n`;
    output += `Question: ${result.prompt}\n\n`;

    if (result.twstock_analysis) {
      output += '📊 Technical Analysis:\n';
      if (result.twstock_analysis.price) {
        output += `Current Price: NT$${result.twstock_analysis.price}\n`;
      }
      if (result.twstock_analysis.buy) {
        output += '📈 Buy Signal Detected\n';
      }
      if (result.twstock_analysis.sell) {
        output += '📉 Sell Signal Detected\n';
      }
      if (!result.twstock_analysis.buy && !result.twstock_analysis.sell) {
        output += '➖ Neutral Signal\n';
      }
      output += '\n';
    }

    if (result.claude_opinion) {
      output += '🧠 Claude\'s Analysis:\n';
      output += `${result.claude_opinion}\n\n`;
    }

    if (result.gemini_opinion) {
      output += '🤖 Gemini\'s Analysis:\n';
      output += `${result.gemini_opinion}\n\n`;
    }

    return output;
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

      if (this.history.length > 20) {
        this.history = this.history.slice(0, 20);
      }

      localStorage.setItem('promptHistory', JSON.stringify(this.history));
      this.updatePagination();
    }
  }

  loadHistory() {
    try {
      const saved = localStorage.getItem('promptHistory');
      if (saved) {
        this.history = JSON.parse(saved);
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

  private getRemainingPrompts(): number {
    const stored = localStorage.getItem('remainingPrompts');
    return stored ? parseInt(stored, 10) : 10;
  }

  private decrementPrompts() {
    this.remainingPrompts = Math.max(0, this.remainingPrompts - 1);
    localStorage.setItem('remainingPrompts', this.remainingPrompts.toString());
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
        this.error = 'Failed to delete account';
      }
    });
  }
}
