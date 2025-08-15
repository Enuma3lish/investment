import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StockService, StockInfo } from '../../services/stock.service';
import { PortfolioService } from '../../services/portfolio.service';
import { AuthService } from '../../services/auth.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-trade',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './trade.html',
  styleUrls: ['./trade.scss'],
})
export class TradeComponent implements OnInit, OnDestroy {
  // ✅ FIXED: Better initialization with default values
  stockSymbol: string = '';
  quantity: number = 1;
  price: string = '';
  tradeType: 'buy' | 'sell' = 'buy';

  stockInfo: StockInfo | null = null;
  isLoadingStock: boolean = false;
  isLoadingTrade: boolean = false;

  errorMessage: string = '';
  successMessage: string = '';
  cashBalance: number = 0;

  private destroy$ = new Subject<void>();

  constructor(
    private stockService: StockService,
    private portfolioService: PortfolioService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.checkAuthentication();
    this.loadCashBalance();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private checkAuthentication(): void {
    if (!this.authService.isLoggedIn()) {
      console.log('❌ User not authenticated, redirecting to login');
      this.router.navigate(['/login']);
      return;
    }
  }

  private loadCashBalance(): void {
    this.portfolioService.getCashBalance()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (balance) => {
          this.cashBalance = balance || 0; // ✅ FIXED: Fallback to 0
          console.log('💰 Cash balance loaded:', this.cashBalance);
        },
        error: (error) => {
          console.error('❌ Error loading cash balance:', error);
          this.cashBalance = 0; // ✅ FIXED: Set default on error
        }
      });
  }

  // ✅ FIXED: Better stock information fetching with null safety
  fetchStockInfo(): void {
    // ✅ FIXED: Better validation
    if (!this.stockSymbol || this.stockSymbol.trim().length < 4) {
      this.stockInfo = null;
      return;
    }

    const formattedSymbol = this.stockService.formatStockId(this.stockSymbol);

    if (!this.stockService.isValidStockId(formattedSymbol)) {
      this.stockInfo = {
        stock_id: formattedSymbol,
        price: 0,
        status: 'error',
        error: 'Please enter a valid 4-digit Taiwan stock code'
      };
      return;
    }

    this.isLoadingStock = true;
    this.stockInfo = null;
    this.clearMessages();

    console.log('📊 Fetching stock info for:', formattedSymbol);

    this.stockService.getStockPrice(formattedSymbol)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (info: StockInfo) => {
          console.log('✅ Stock info received:', info);
          this.stockInfo = info;
          this.isLoadingStock = false;

          // ✅ FIXED: Since price is now always a number, no need for null checks
          if (info && info.status === 'success' && info.price > 0) {
            this.price = info.price.toString();
          }
        },
        error: (error) => {
          console.error('❌ Stock info fetch error:', error);
          this.stockInfo = {
            stock_id: formattedSymbol,
            price: 0,
            status: 'error',
            error: 'Failed to fetch stock information'
          };
          this.isLoadingStock = false;
        }
      });
  }

  // ✅ Handle stock symbol input changes with better validation
  onStockSymbolChange(): void {
    // ✅ FIXED: Better input sanitization
    if (this.stockSymbol) {
      this.stockSymbol = this.stockService.formatStockId(this.stockSymbol);
    }

    // Auto-fetch when 4 digits are entered
    if (this.stockSymbol && this.stockSymbol.length === 4) {
      setTimeout(() => this.fetchStockInfo(), 300); // Small delay for better UX
    } else {
      this.stockInfo = null;
    }
  }

  // ✅ Execute trade with enhanced validation
  executeTrade(): void {
    this.clearMessages();

    // Validation
    if (!this.validateTradeInputs()) {
      return;
    }

    this.isLoadingTrade = true;

    // ✅ FIXED: Better number parsing with validation
    const tradePrice = this.parsePrice(this.price);
    const tradeQuantity = this.quantity || 0;

    if (tradePrice <= 0 || tradeQuantity <= 0) {
      this.errorMessage = 'Invalid price or quantity values';
      this.isLoadingTrade = false;
      return;
    }

    const totalCost = tradePrice * tradeQuantity;

    // Check cash balance for buy orders
    if (this.tradeType === 'buy' && totalCost > this.cashBalance) {
      this.errorMessage = `Insufficient funds. You have ${this.formatCurrency(this.cashBalance)} but need ${this.formatCurrency(totalCost)}`;
      this.isLoadingTrade = false;
      return;
    }

    console.log(`🔄 Executing ${this.tradeType} order:`, {
      symbol: this.stockSymbol,
      quantity: tradeQuantity,
      price: tradePrice
    });

    const tradeObservable = this.tradeType === 'buy'
      ? this.portfolioService.buyStock(this.stockSymbol, tradeQuantity, tradePrice)
      : this.portfolioService.sellStock(this.stockSymbol, tradeQuantity, tradePrice);

    tradeObservable
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('✅ Trade executed successfully:', response);

          const action = this.tradeType.toUpperCase();
          this.successMessage = `Successfully ${action === 'BUY' ? 'bought' : 'sold'} ${tradeQuantity.toLocaleString()} shares of ${this.stockSymbol.toUpperCase()} at ${this.formatCurrency(tradePrice)} per share`;

          this.isLoadingTrade = false;
          this.loadCashBalance(); // Refresh cash balance

          // Clear form after successful trade
          setTimeout(() => {
            this.clearForm();
          }, 3000);
        },
        error: (error) => {
          console.error('❌ Trade execution error:', error);
          this.errorMessage = error?.message || 'Trade execution failed. Please try again.';
          this.isLoadingTrade = false;
        }
      });
  }

  // ✅ FIXED: Enhanced validation with better error messages
  private validateTradeInputs(): boolean {
    if (!this.stockSymbol || this.stockSymbol.trim().length !== 4) {
      this.errorMessage = 'Please enter a valid 4-digit stock symbol';
      return false;
    }

    if (!this.stockService.isValidStockId(this.stockSymbol)) {
      this.errorMessage = 'Invalid stock symbol format';
      return false;
    }

    if (!this.price || this.price.trim() === '' || this.parsePrice(this.price) <= 0) {
      this.errorMessage = 'Please enter a valid price greater than 0';
      return false;
    }

    if (!this.quantity || this.quantity <= 0) {
      this.errorMessage = 'Please enter a valid quantity greater than 0';
      return false;
    }

    return true;
  }

  // ✅ FIXED: Helper method for safe price parsing
  private parsePrice(priceStr: string): number {
    if (!priceStr || priceStr.trim() === '') {
      return 0;
    }
    const parsed = parseFloat(priceStr.trim());
    return isNaN(parsed) ? 0 : parsed;
  }

  // ✅ Utility methods with null safety
  formatCurrency(amount: number | null | undefined): string {
    const safeAmount = amount || 0;
    return this.portfolioService.formatTaiwanCurrency(safeAmount);
  }

  clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  clearForm(): void {
    this.stockSymbol = '';
    this.quantity = 1;
    this.price = '';
    this.stockInfo = null;
    this.clearMessages();
  }

  refreshStockInfo(): void {
    if (this.stockSymbol && this.stockSymbol.length === 4) {
      this.fetchStockInfo();
    }
  }

  navigateToPortfolio(): void {
    this.router.navigate(['/portfolio']);
  }

  navigateToHistory(): void {
    this.router.navigate(['/trade-history']);
  }

  // ✅ Handle authentication errors
  handleAuthError(): void {
    console.log('🚪 Authentication error - redirecting to login');
    this.authService.logout().subscribe();
    this.router.navigate(['/login']);
  }

  // ✅ FIXED: Helper methods for template
  get isFormValid(): boolean {
    return !!(
      this.stockSymbol &&
      this.stockSymbol.length === 4 &&
      this.price &&
      this.price.trim() !== '' &&
      this.parsePrice(this.price) > 0 &&
      this.quantity > 0 &&
      !this.isLoadingStock &&
      !this.isLoadingTrade
    );
  }

  get totalCost(): number {
    const priceValue = this.parsePrice(this.price);
    const quantityValue = this.quantity || 0;
    return priceValue * quantityValue;
  }
}
