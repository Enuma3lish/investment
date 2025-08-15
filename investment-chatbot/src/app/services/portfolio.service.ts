import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

export interface PortfolioItem {
  id?: number;
  symbol: string;
  stock_id?: string;
  quantity: number;
  buy_price: number;
  current_price?: number;
  total_value?: number;
  profit_loss?: number;
  buy_time?: string;
}

export interface PortfolioResponse {
  holdings: PortfolioItem[];
  stocks?: PortfolioItem[]; // Alternative field name
  cash_balance: number;
  total_portfolio_value?: number;
  user_id?: number;
}

export interface TradeResponse {
  msg: string;
  total_cost?: number;
  total_proceeds?: number;
  remaining_cash?: number;
  new_cash_balance?: number;
  total_profit?: number;
}

export interface TradeHistoryItem {
  id: number;
  stock_id: string;
  side: 'BUY' | 'SELL';
  price: number;
  quantity: number;
  ts: string; // timestamp
  total_value?: number;
}

@Injectable({
  providedIn: 'root'
})
export class PortfolioService {
  private baseUrl = 'http://localhost:8000/api'; // Adjust to your Django backend URL
  private cashBalanceSubject = new BehaviorSubject<number>(0);
  public cashBalance$ = this.cashBalanceSubject.asObservable();

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('access'); // ✅ FIXED: Use 'access' to match jwt-interceptor
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // Get user's portfolio
  getPortfolio(): Observable<PortfolioResponse> {
    return this.http.get<any>(`${this.baseUrl}/holdings/`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => {
        // Handle both possible response formats
        const holdings = response.holdings || response.stocks || [];
        const cashBalance = response.cash_balance || 0;

        // Update cash balance subject
        this.cashBalanceSubject.next(cashBalance);

        // Transform holdings to match expected format
        const transformedHoldings = holdings.map((item: any) => ({
          id: item.id,
          symbol: item.stock_id || item.symbol,
          stock_id: item.stock_id || item.symbol,
          quantity: item.quantity,
          buy_price: item.buy_price,
          current_price: item.current_price || item.buy_price,
          total_value: item.total_value || (item.quantity * (item.current_price || item.buy_price)),
          profit_loss: item.profit_loss || 0,
          buy_time: item.buy_time
        }));

        return {
          holdings: transformedHoldings,
          stocks: transformedHoldings, // Provide both field names for compatibility
          cash_balance: cashBalance,
          total_portfolio_value: response.total_portfolio_value || 0,
          user_id: response.user_id
        };
      }),
      catchError(this.handleError)
    );
  }

  // Get user's cash balance
  getCashBalance(): Observable<number> {
    return this.http.get<{cash_balance: number, user_id: number}>(`${this.baseUrl}/balance/`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => {
        this.cashBalanceSubject.next(response.cash_balance);
        return response.cash_balance;
      }),
      catchError(this.handleError)
    );
  }

  // Buy stock
  buyStock(stockId: string, quantity: number, price: number): Observable<TradeResponse> {
    const payload = {
      stock_id: stockId,
      buy_price: price,
      quantity: quantity
    };

    return this.http.post<TradeResponse>(`${this.baseUrl}/trade/buy/`, payload, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => {
        // Update cash balance if provided
        if (response.remaining_cash !== undefined) {
          this.cashBalanceSubject.next(response.remaining_cash);
        }
        return response;
      }),
      catchError(this.handleError)
    );
  }

  // Sell stock
  sellStock(stockId: string, quantity: number, price: number): Observable<TradeResponse> {
    const payload = {
      stock_id: stockId,
      sell_price: price,
      quantity: quantity
    };

    return this.http.post<TradeResponse>(`${this.baseUrl}/trade/sell/`, payload, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => {
        // Update cash balance if provided
        if (response.new_cash_balance !== undefined) {
          this.cashBalanceSubject.next(response.new_cash_balance);
        }
        return response;
      }),
      catchError(this.handleError)
    );
  }

  // Get stock price
  getStockPrice(stockId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/price/?stock_id=${stockId}`, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  // Get trade history
  getTradeHistory(): Observable<TradeHistoryItem[]> {
    return this.http.get<TradeHistoryItem[]>(`${this.baseUrl}/history/`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => {
        // Ensure response is an array
        if (Array.isArray(response)) {
          return response.map(item => ({
            id: item.id,
            stock_id: item.stock_id,
            side: item.side,
            price: item.price,
            quantity: item.quantity,
            ts: item.ts,
            total_value: item.total_value || (item.price * item.quantity)
          }));
        }
        return [];
      }),
      catchError(this.handleError)
    );
  }

  // Validate Taiwan stock symbol
  isValidTaiwanStockSymbol(symbol: string): boolean {
    // Taiwan stock codes are typically 4 digits
    const symbolRegex = /^\d{4}$/;
    return symbolRegex.test(symbol);
  }

  // Format currency for Taiwan
  formatTaiwanCurrency(amount: number): string {
    try {
      return new Intl.NumberFormat('zh-TW', {
        style: 'currency',
        currency: 'TWD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }).format(amount || 0);
    } catch (error) {
      // Fallback if TWD is not supported
      return `NT$${(amount || 0).toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      })}`;
    }
  }

  // Reset cash balance (for testing)
  resetCashBalance(): Observable<any> {
    return this.http.post(`${this.baseUrl}/balance/`, { reset: true }, {
      headers: this.getAuthHeaders()
    }).pipe(
      map((response: any) => {
        // Handle both possible response field names
        const newBalance = response.new_balance || response.cash_balance || 0;
        this.cashBalanceSubject.next(newBalance);
        return response;
      }),
      catchError(this.handleError)
    );
  }

  private handleError(error: any): Observable<never> {
    console.error('Portfolio Service Error:', error);

    let errorMessage = 'An unknown error occurred';

    if (error.error) {
      if (typeof error.error === 'string') {
        errorMessage = error.error;
      } else if (error.error.detail) {
        errorMessage = error.error.detail;
      } else if (error.error.message) {
        errorMessage = error.error.message;
      }
    } else if (error.message) {
      errorMessage = error.message;
    }

    return throwError(() => new Error(errorMessage));
  }
}
