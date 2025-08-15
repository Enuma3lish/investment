import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { PortfolioService, PortfolioItem, PortfolioResponse } from '../../services/portfolio.service';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-portfolio',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe],
  templateUrl: './portfolio.html',
  styleUrls: ['./portfolio.scss'],
})
export class PortfolioComponent implements OnInit, OnDestroy {
  portfolio: PortfolioItem[] = [];
  cashBalance = 0;
  totalPortfolioValue = 0;
  totalProfitLoss = 0;
  errorMessage = '';
  successMessage = '';
  isLoading = false;
  isLoadingTrade = false;

  private cashBalanceSubscription?: Subscription;

  constructor(
    private portfolioService: PortfolioService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Subscribe to cash balance updates
    this.cashBalanceSubscription = this.portfolioService.cashBalance$.subscribe(
      balance => {
        this.cashBalance = balance;
      }
    );

    this.loadPortfolio();
    this.loadCashBalance();
  }

  ngOnDestroy(): void {
    if (this.cashBalanceSubscription) {
      this.cashBalanceSubscription.unsubscribe();
    }
  }

  loadPortfolio() {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.portfolioService.getPortfolio().subscribe({
      next: (res: PortfolioResponse) => {
        try {
          this.portfolio = res.holdings || res.stocks || [];
          this.cashBalance = res.cash_balance || 0;
          this.totalPortfolioValue = res.total_portfolio_value || 0;
          this.calculateTotals();
          this.isLoading = false;
          console.log('Portfolio loaded:', this.portfolio);
          console.log('Cash balance:', this.cashBalance);

          if (this.portfolio.length === 0) {
            this.successMessage = 'Portfolio is empty. Start trading to see your holdings here!';
          } else {
            this.successMessage = '';
          }
        } catch (error) {
          console.error('Error processing portfolio data:', error);
          this.errorMessage = 'Error processing portfolio data';
          this.isLoading = false;
        }
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage = this.extractErrorMessage(err, 'Failed to load portfolio');
        this.isLoading = false;
        console.error('Portfolio load error:', err);

        // If authentication error, redirect to login
        if (err.status === 401) {
          this.router.navigate(['/login']);
        }
      },
    });
  }

  loadCashBalance() {
    this.portfolioService.getCashBalance().subscribe({
      next: (balance) => {
        this.cashBalance = balance;
        console.log('Cash balance loaded:', balance);
      },
      error: (err) => {
        console.error('Error loading cash balance:', err);
        // Don't show error for balance loading failure
      }
    });
  }

  private calculateTotals() {
    try {
      this.totalProfitLoss = this.portfolio.reduce((total, item) => {
        return total + (item.profit_loss || 0);
      }, 0);

      // Recalculate total portfolio value if not provided by backend
      if (!this.totalPortfolioValue) {
        this.totalPortfolioValue = this.portfolio.reduce((total, item) => {
          const itemValue = item.total_value || (item.quantity * (item.current_price || item.buy_price || 0));
          return total + itemValue;
        }, 0) + this.cashBalance;
      }
    } catch (error) {
      console.error('Error calculating totals:', error);
      this.totalProfitLoss = 0;
      this.totalPortfolioValue = this.cashBalance;
    }
  }

  buyStock(symbol: string) {
    if (!symbol) {
      alert('Invalid stock symbol');
      return;
    }

    // Validate stock symbol format
    if (!this.portfolioService.isValidTaiwanStockSymbol(symbol)) {
      alert('Please enter a valid 4-digit Taiwan stock code (e.g., 2330)');
      return;
    }

    const availableStock = this.portfolio.find(stock => stock.symbol === symbol);
    const currentPrice = availableStock?.current_price || availableStock?.buy_price || 0;

    // Input validation
    const qtyInput = prompt(`Enter quantity to BUY for ${symbol}:`, '1000');
    if (!qtyInput || isNaN(Number(qtyInput)) || Number(qtyInput) <= 0) {
      alert('Please enter a valid positive quantity');
      return;
    }

    const priceInput = prompt(`Enter price per share for ${symbol}:`, currentPrice > 0 ? currentPrice.toString() : '100');
    if (!priceInput || isNaN(Number(priceInput)) || Number(priceInput) <= 0) {
      alert('Please enter a valid positive price');
      return;
    }

    const quantity = Number(qtyInput);
    const price = Number(priceInput);
    const totalCost = quantity * price;

    // Check if user has enough cash
    if (this.cashBalance < totalCost) {
      alert(`Insufficient funds. You have ${this.formatCurrency(this.cashBalance)} but need ${this.formatCurrency(totalCost)}`);
      return;
    }

    this.isLoadingTrade = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.portfolioService.buyStock(symbol, quantity, price).subscribe({
      next: (response) => {
        this.loadPortfolio(); // Reload portfolio data
        this.isLoadingTrade = false;

        const formattedPrice = this.formatCurrency(price);
        this.successMessage = `Successfully bought ${quantity.toLocaleString()} shares of ${symbol.toUpperCase()} at ${formattedPrice} per share`;

        // Auto-clear success message after 5 seconds
        setTimeout(() => {
          this.successMessage = '';
        }, 5000);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage = this.extractErrorMessage(err, 'Buy transaction failed');
        this.isLoadingTrade = false;
        console.error('Buy error:', err);
      },
    });
  }

  sellStock(symbol: string, availableQuantity?: number) {
    if (!symbol) {
      alert('Invalid stock symbol');
      return;
    }

    const stock = this.portfolio.find(s => s.symbol === symbol);
    const maxQty = availableQuantity || stock?.quantity || 0;

    if (maxQty <= 0) {
      alert(`You don't own any shares of ${symbol}`);
      return;
    }

    const currentPrice = stock?.current_price || stock?.buy_price || 0;

    // Input validation
    const qtyInput = prompt(`Enter quantity to SELL for ${symbol} (Available: ${maxQty.toLocaleString()}):`, maxQty.toString());
    if (!qtyInput || isNaN(Number(qtyInput)) || Number(qtyInput) <= 0) {
      alert('Please enter a valid positive quantity');
      return;
    }

    const quantity = Number(qtyInput);
    if (quantity > maxQty) {
      alert(`You can't sell ${quantity.toLocaleString()} shares. You only have ${maxQty.toLocaleString()} shares of ${symbol}`);
      return;
    }

    const priceInput = prompt(`Enter price per share for ${symbol}:`, currentPrice > 0 ? currentPrice.toString() : '100');
    if (!priceInput || isNaN(Number(priceInput)) || Number(priceInput) <= 0) {
      alert('Please enter a valid positive price');
      return;
    }

    const price = Number(priceInput);
    this.isLoadingTrade = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.portfolioService.sellStock(symbol, quantity, price).subscribe({
      next: (response) => {
        this.loadPortfolio(); // Reload portfolio data
        this.isLoadingTrade = false;

        const formattedPrice = this.formatCurrency(price);
        let message = `Successfully sold ${quantity.toLocaleString()} shares of ${symbol.toUpperCase()} at ${formattedPrice} per share`;

        // Add profit/loss info if available in response
        try {
          if (response && response.total_profit !== undefined) {
            const profitText = response.total_profit >= 0 ? 'Profit' : 'Loss';
            const formattedProfit = this.formatCurrency(Math.abs(response.total_profit));
            message += `. ${profitText}: ${formattedProfit}`;
          }
        } catch (error) {
          console.warn('Error processing profit info:', error);
        }

        this.successMessage = message;

        // Auto-clear success message after 5 seconds
        setTimeout(() => {
          this.successMessage = '';
        }, 5000);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage = this.extractErrorMessage(err, 'Sell transaction failed');
        this.isLoadingTrade = false;
        console.error('Sell error:', err);
      },
    });
  }

  private extractErrorMessage(err: HttpErrorResponse, defaultMessage: string): string {
    if (err && err.error) {
      if (typeof err.error === 'string') {
        return err.error;
      }
      if (err.error.error) {
        return err.error.error;
      }
      if (err.error.detail) {
        return err.error.detail;
      }
      if (err.error.message) {
        return err.error.message;
      }
      if (typeof err.error === 'object') {
        try {
          const errors = Object.values(err.error).flat();
          if (errors.length > 0) {
            return errors.join(', ');
          }
        } catch (error) {
          console.warn('Error processing error object:', error);
        }
      }
    }

    switch (err?.status) {
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return 'Please log in to access your portfolio.';
      case 403:
        return 'Access denied. Please check your permissions.';
      case 404:
        return 'Portfolio data not found.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return defaultMessage;
    }
  }

  // Navigation methods
  navigateToTrade() {
    try {
      this.router.navigate(['/trade']);
    } catch (error) {
      console.error('Navigation error:', error);
    }
  }

  navigateToTradeHistory() {
    try {
      this.router.navigate(['/trade-history']);
    } catch (error) {
      console.error('Navigation error:', error);
    }
  }

  refreshPortfolio() {
    this.loadPortfolio();
    this.loadCashBalance();
  }

  resetCashBalance() {
    if (confirm('Are you sure you want to reset your cash balance to NT$1,000,000?')) {
      this.portfolioService.resetCashBalance().subscribe({
        next: (response) => {
          this.successMessage = 'Cash balance reset successfully!';
          this.loadCashBalance();
          setTimeout(() => {
            this.successMessage = '';
          }, 3000);
        },
        error: (err) => {
          this.errorMessage = 'Failed to reset cash balance';
          console.error('Reset balance error:', err);
        }
      });
    }
  }

  // Helper methods for template
  getProfitLossClass(profitLoss: number): string {
    if (profitLoss > 0) return 'profit';
    if (profitLoss < 0) return 'loss';
    return 'neutral';
  }

  getProfitLossSymbol(profitLoss: number): string {
    if (profitLoss > 0) return '+';
    return '';
  }

  // Calculate profit/loss percentage
  getProfitLossPercentage(item: PortfolioItem): number {
    try {
      if (!item?.buy_price || !item?.current_price) return 0;
      return ((item.current_price - item.buy_price) / item.buy_price) * 100;
    } catch (error) {
      console.warn('Error calculating profit/loss percentage:', error);
      return 0;
    }
  }

  // Format numbers for display
  formatNumber(num: number): string {
    try {
      return new Intl.NumberFormat('en-US').format(num || 0);
    } catch (error) {
      console.warn('Error formatting number:', error);
      return (num || 0).toString();
    }
  }

  // Currency formatting method
  formatCurrency(amount: number): string {
    return this.portfolioService.formatTaiwanCurrency(amount);
  }

  // Get stock performance indicator
  getStockPerformance(item: PortfolioItem): string {
    try {
      const percentage = this.getProfitLossPercentage(item);
      if (percentage > 5) return '🚀'; // Strong gain
      if (percentage > 0) return '📈'; // Gain
      if (percentage < -5) return '📉'; // Strong loss
      if (percentage < 0) return '⚠️'; // Loss
      return '➖'; // Neutral
    } catch (error) {
      console.warn('Error getting stock performance:', error);
      return '➖';
    }
  }

  // Clear messages
  clearMessages() {
    this.errorMessage = '';
    this.successMessage = '';
  }

  // Get total value for an item
  getTotalValue(item: PortfolioItem): number {
    try {
      return item.total_value || (item.quantity * (item.current_price || item.buy_price || 0));
    } catch (error) {
      console.warn('Error calculating total value:', error);
      return 0;
    }
  }

  // Math reference for template
  get Math() {
    return Math;
  }

  // Check if portfolio is empty
  get isPortfolioEmpty(): boolean {
    return !this.portfolio || this.portfolio.length === 0;
  }

  // Get portfolio performance summary
  get portfolioPerformance(): string {
    try {
      if (this.totalProfitLoss === 0) return 'neutral';
      return this.totalProfitLoss > 0 ? 'positive' : 'negative';
    } catch (error) {
      console.warn('Error calculating portfolio performance:', error);
      return 'neutral';
    }
  }
}
