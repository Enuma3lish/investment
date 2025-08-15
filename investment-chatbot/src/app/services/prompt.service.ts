import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

export interface PromptRequest {
  stock_id: string;
  prompt: string;
}

export interface PromptResponse {
  task_id: string;
  stock_id: string;
  prompt: string;
  status: string;
}

export interface AnalysisResultResponse {
  status: 'done' | 'pending' | 'failed';
  result?: any;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PromptService {
  private baseUrl = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('access'); // ✅ FIXED: Use 'access' to match jwt-interceptor

    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  sendPrompt(stockId: string, prompt: string): Observable<PromptResponse> {
    const payload: PromptRequest = {
      stock_id: stockId,
      prompt: prompt
    };

    return this.http.post<PromptResponse>(`${this.baseUrl}/analyze/`, payload, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  getResult(taskId: string): Observable<AnalysisResultResponse> {
    return this.http.get<AnalysisResultResponse>(`${this.baseUrl}/analyze/${taskId}/`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  isValidStockSymbol(symbol: string): boolean {
    // Taiwan stock codes are typically 4 digits
    const symbolRegex = /^\d{4}$/;
    return symbolRegex.test(symbol);
  }

  private handleError(error: any): Observable<never> {
    console.error('Prompt Service Error:', error);

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

    switch (error.status) {
      case 400:
        errorMessage = 'Invalid request. Please check your input.';
        break;
      case 401:
        errorMessage = 'Please log in to access this feature.';
        break;
      case 403:
        errorMessage = 'Access denied. Please check your permissions.';
        break;
      case 429:
        errorMessage = 'Too many requests. Please wait before trying again.';
        break;
      case 500:
        errorMessage = 'Server error. Please try again later.';
        break;
    }

    return throwError(() => new Error(errorMessage));
  }
}
