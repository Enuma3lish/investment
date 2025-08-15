import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, timeout } from 'rxjs/operators';

// ✅ FIXED: Proper interface with correct types
export interface StockInfo {
  stock_id: string;
  price: number; // ✅ Always a number, never null
  open?: number | null;
  high?: number | null;
  low?: number | null;
  volume?: number | null;
  change?: number | null;
  change_percent?: number | null;
  status: 'success' | 'error';
  error?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class StockService {
  private baseUrl = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('access');
    return new HttpHeaders({
      'Authorization': `Bearer ${token || ''}`,
      'Content-Type': 'application/json'
    });
  }

  // ✅ FIXED: Stock price fetching with proper type handling
  getStockPrice(stockId: string): Observable<StockInfo> {
    console.log('📈 Fetching stock price for:', stockId);

    // Validate stock ID format
    if (!this.isValidStockId(stockId)) {
      return of({
        stock_id: stockId,
        price: 0, // ✅ Always return number
        status: 'error',
        error: 'Invalid stock ID format. Please enter a 4-digit Taiwan stock code.'
      });
    }

    // Check if user is authenticated
    const token = localStorage.getItem('access');
    if (!token) {
      return of({
        stock_id: stockId,
        price: 0, // ✅ Always return number
        status: 'error',
        error: 'Please log in to fetch stock information.'
      });
    }

    return this.http.get<any>(`${this.baseUrl}/price/?stock_id=${stockId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      timeout(10000), // 10 second timeout
      map(response => {
        console.log('✅ Stock price response:', response);

        // ✅ FIXED: Ensure proper return type
        if (response && typeof response === 'object') {
          const stockInfo: StockInfo = {
            stock_id: stockId,
            price: this.safeNumberRequired(response.price || response.current_price, 0),
            open: this.safeNumberOptional(response.open),
            high: this.safeNumberOptional(response.high),
            low: this.safeNumberOptional(response.low),
            volume: this.safeNumberOptional(response.volume),
            change: this.safeNumberOptional(response.change),
            change_percent: this.safeNumberOptional(response.change_percent),
            status: 'success'
          };
          return stockInfo;
        }

        // Fallback for unexpected response format
        const errorInfo: StockInfo = {
          stock_id: stockId,
          price: 0,
          status: 'error',
          error: 'Unexpected response format from server'
        };
        return errorInfo;
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('❌ Stock price fetch error:', error);

        let errorMessage = 'Failed to fetch stock information';

        if (error.status === 401) {
          errorMessage = 'Authentication failed. Please log in again.';
        } else if (error.status === 403) {
          errorMessage = 'Access denied. Please check your permissions.';
        } else if (error.status === 404) {
          errorMessage = `Stock ${stockId} not found.`;
        } else if (error.status === 429) {
          errorMessage = 'Too many requests. Please wait and try again.';
        } else if (error.status === 0) {
          errorMessage = 'Network error. Please check your connection.';
        } else if (error.error) {
          if (typeof error.error === 'string') {
            errorMessage = error.error;
          } else if (error.error.detail) {
            errorMessage = error.error.detail;
          } else if (error.error.message) {
            errorMessage = error.error.message;
          }
        }

        const errorInfo: StockInfo = {
          stock_id: stockId,
          price: 0, // ✅ Always return number
          status: 'error',
          error: errorMessage
        };
        return of(errorInfo);
      })
    );
  }

  // ✅ Helper method for required number fields (always returns number)
  private safeNumberRequired(value: any, fallback: number): number {
    if (value === null || value === undefined) {
      return fallback;
    }

    const num = Number(value);
    if (isNaN(num)) {
      return fallback;
    }

    return num;
  }

  // ✅ Helper method for optional number fields (can return null)
  private safeNumberOptional(value: any): number | null {
    if (value === null || value === undefined) {
      return null;
    }

    const num = Number(value);
    if (isNaN(num)) {
      return null;
    }

    return num;
  }

  // ✅ Get multiple stock prices with proper error handling
  getMultipleStockPrices(stockIds: string[]): Observable<StockInfo[]> {
    if (!stockIds || stockIds.length === 0) {
      return of([]);
    }

    const requests = stockIds.map(id => this.getStockPrice(id));

    return new Observable(observer => {
      const results: StockInfo[] = [];
      let completed = 0;

      requests.forEach((request, index) => {
        request.subscribe({
          next: (result) => {
            results[index] = result;
            completed++;

            if (completed === requests.length) {
              observer.next(results);
              observer.complete();
            }
          },
          error: (error) => {
            results[index] = {
              stock_id: stockIds[index] || '',
              price: 0, // ✅ Always return number
              status: 'error',
              error: 'Request failed'
            };
            completed++;

            if (completed === requests.length) {
              observer.next(results);
              observer.complete();
            }
          }
        });
      });
    });
  }

  // ✅ Enhanced Taiwan stock ID validation
  isValidStockId(stockId: string): boolean {
    if (!stockId || typeof stockId !== 'string') {
      return false;
    }

    const trimmed = stockId.trim();

    // Taiwan stock codes are 4 digits
    if (!/^\d{4}$/.test(trimmed)) {
      return false;
    }

    // Additional validation: first digit should be 1-9 (no leading zeros)
    const firstDigit = trimmed.charAt(0);
    return firstDigit !== '0';
  }

  // ✅ Enhanced stock ID formatting
  formatStockId(stockId: string): string {
    if (!stockId || typeof stockId !== 'string') {
      return '';
    }

    // Remove all non-numeric characters and limit to 4 digits
    const cleaned = stockId.replace(/\D/g, '').slice(0, 4);
    return cleaned;
  }

  // ✅ Check if Taiwan Stock Exchange is open
  isMarketOpen(): boolean {
    try {
      const now = new Date();
      const taiwanTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Taipei"}));
      const hour = taiwanTime.getHours();
      const minute = taiwanTime.getMinutes();
      const day = taiwanTime.getDay();

      // Taiwan Stock Exchange: Monday-Friday, 9:00-13:30
      const isWeekday = day >= 1 && day <= 5;
      const isMarketHours = (hour === 9 && minute >= 0) ||
                           (hour >= 10 && hour <= 12) ||
                           (hour === 13 && minute <= 30);

      return isWeekday && isMarketHours;
    } catch (error) {
      console.warn('Error checking market hours:', error);
      return false; // Conservative fallback
    }
  }

  // ✅ Get market status message
  getMarketStatusMessage(): string {
    if (this.isMarketOpen()) {
      return 'Market is currently open';
    } else {
      return 'Market is currently closed';
    }
  }

  // ✅ Format stock symbol for display
  formatStockSymbolForDisplay(stockId: string): string {
    if (!stockId) return '';
    return stockId.toUpperCase().padStart(4, '0');
  }
}
