import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PortfolioService, TradeHistoryItem } from '../../services/portfolio.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';

// ✅ FIXED: Interface to match HTML template expectations
interface TradeForDisplay {
  id: number;
  timestamp: string;
  symbol: string;
  action: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  revenue?: number;
}

@Component({
  selector: 'app-trade-history',
  standalone: true,
  imports: [CommonModule, DatePipe, CurrencyPipe, FormsModule],
  templateUrl: './trade-history.html', // ✅ FIXED: Use external template
  styleUrls: ['./trade-history.scss'],
})
export class TradeHistoryComponent implements OnInit, OnDestroy {
  trades: TradeForDisplay[] = []; // ✅ FIXED: Match HTML template variable name
  loading = false;
  error = '';
  totalRevenue = 0; // ✅ FIXED: Add totalRevenue for HTML template

  constructor(
    private portfolioService: PortfolioService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadTradeHistory();
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  loadTradeHistory(): void {
    this.loading = true;
    this.error = '';

    this.portfolioService.getTradeHistory().subscribe({
      next: (data: TradeHistoryItem[]) => {
        console.log('Raw trade data:', data);

        // ✅ FIXED: Transform data to match HTML template expectations
        this.trades = this.transformTradeData(data || []);
        this.calculateTotalRevenue();
        this.loading = false;

        console.log('Transformed trades for display:', this.trades);
        console.log('Total revenue:', this.totalRevenue);
      },
      error: (err: HttpErrorResponse) => {
        this.error = this.extractErrorMessage(err, 'Failed to load trade history');
        this.loading = false;
        console.error('❌ Trade history error:', err);
      }
    });
  }

  // ✅ FIXED: Transform backend data to match HTML template structure
  private transformTradeData(apiData: TradeHistoryItem[]): TradeForDisplay[] {
    return apiData.map(item => ({
      id: item.id,
      timestamp: item.ts, // API uses 'ts', HTML expects 'timestamp'
      symbol: item.stock_id, // API uses 'stock_id', HTML expects 'symbol'
      action: item.side, // API uses 'side', HTML expects 'action'
      quantity: item.quantity,
      price: item.price,
      revenue: this.calculateRevenue(item) // Calculate revenue for each trade
    }));
  }

  // ✅ FIXED: Calculate revenue for individual trade (required by HTML template)
  private calculateRevenue(trade: TradeHistoryItem): number {
    const totalValue = trade.quantity * trade.price;
    // For BUY orders, revenue is negative (cost)
    // For SELL orders, revenue is positive (income)
    return trade.side === 'SELL' ? totalValue : -totalValue;
  }

  // ✅ FIXED: Method required by HTML template
  getRevenue(trade: TradeForDisplay): number {
    return trade.revenue || 0;
  }

  // ✅ FIXED: Calculate total revenue for summary
  private calculateTotalRevenue(): void {
    this.totalRevenue = this.trades.reduce((total, trade) => {
      return total + this.getRevenue(trade);
    }, 0);
  }

  private extractErrorMessage(err: HttpErrorResponse, defaultMessage: string): string {
    if (err.error) {
      if (typeof err.error === 'string') {
        return err.error;
      }
      if (err.error.error) {
        return err.error.error;
      }
      if (err.error.detail) {
        return err.error.detail;
      }
    }

    switch (err.status) {
      case 401:
        return 'Please log in to view your trade history.';
      case 403:
        return 'Access denied. Please check your permissions.';
      case 404:
        return 'Trade history not found.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return defaultMessage;
    }
  }

  // ✅ Navigation methods
  navigateToTrade(): void {
    this.router.navigate(['/trade']);
  }

  navigateToPortfolio(): void {
    this.router.navigate(['/portfolio']);
  }

  // ✅ Refresh method for manual reload
  refreshHistory(): void {
    console.log('🔄 Manual refresh triggered');
    this.loadTradeHistory();
  }
}
