import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { Router } from '@angular/router';

export interface LoginResponse {
  access: string;
  refresh: string;
  cash_balance?: number;
}

export interface RegisterRequest {
  username: string;
  password: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrl = 'http://localhost:8000/api';
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasToken());
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.checkTokenValidity();
  }

  private hasToken(): boolean {
    const token = localStorage.getItem('access'); // ✅ FIXED: Use 'access' to match jwt-interceptor
    return !!token;
  }

  private checkTokenValidity(): void {
    if (this.hasToken()) {
      this.isAuthenticatedSubject.next(true);
    } else {
      this.isAuthenticatedSubject.next(false);
    }
  }

  register(username: string, password: string): Observable<any> {
    const payload: RegisterRequest = { username, password };

    return this.http.post(`${this.baseUrl}/auth/register/`, payload, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    }).pipe(
      tap(response => {
        console.log('Registration successful:', response);
      }),
      catchError(this.handleError)
    );
  }

  login(username: string, password: string): Observable<LoginResponse> {
    const payload: LoginRequest = { username, password };

    return this.http.post<LoginResponse>(`${this.baseUrl}/auth/login/`, payload, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    }).pipe(
      tap(response => {
        // ✅ FIXED: Store tokens with keys that match jwt-interceptor
        if (response.access) {
          localStorage.setItem('access', response.access);
        }
        if (response.refresh) {
          localStorage.setItem('refresh', response.refresh);
        }

        this.isAuthenticatedSubject.next(true);
        console.log('Login successful, tokens stored');
      }),
      catchError(this.handleError)
    );
  }

  logout(): Observable<any> {
    const refreshToken = this.getRefreshToken();

    console.log('🚪 Logging out user...');

    // Clear tokens immediately (don't wait for server response)
    this.clearTokens();
    this.isAuthenticatedSubject.next(false);

    // ✅ FIXED: Don't send auth headers to logout endpoint
    if (refreshToken) {
      return this.http.post(`${this.baseUrl}/auth/logout/`,
        { refresh: refreshToken },
        {
          headers: new HttpHeaders({ 'Content-Type': 'application/json' }) // No auth header
        }
      ).pipe(
        catchError(error => {
          console.warn('Logout request failed, but tokens already cleared:', error);
          return throwError(() => error);
        })
      );
    } else {
      return new Observable(observer => {
        observer.next({ msg: 'logged out' });
        observer.complete();
      });
    }
  }

  // Method for account deletion (used in chatbot)
  deleteAccount(): Observable<any> {
    return this.http.delete(`${this.baseUrl}/auth/delete-account/`, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(() => {
        this.clearTokens();
        this.isAuthenticatedSubject.next(false);
      }),
      catchError(this.handleError)
    );
  }

  private clearTokens(): void {
    // ✅ FIXED: Clear tokens with keys that match jwt-interceptor
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    sessionStorage.clear();
  }

  getToken(): string | null {
    return localStorage.getItem('access'); // ✅ FIXED: Use 'access' key
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refresh'); // ✅ FIXED: Use 'refresh' key
  }

  isLoggedIn(): boolean {
    return this.hasToken();
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    if (token) {
      return new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      });
    }
    return new HttpHeaders({ 'Content-Type': 'application/json' });
  }

  // Method to refresh access token
  refreshAccessToken(): Observable<any> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http.post(`${this.baseUrl}/auth/token/refresh/`, {
      refresh: refreshToken
    }).pipe(
      tap((response: any) => {
        if (response.access) {
          localStorage.setItem('access', response.access); // ✅ FIXED: Use 'access' key
        }
      }),
      catchError(error => {
        this.logout().subscribe();
        this.router.navigate(['/login']);
        return throwError(() => error);
      })
    );
  }

  private handleError(error: any): Observable<never> {
    console.error('Auth Service Error:', error);

    let errorMessage = 'An unknown error occurred';

    if (error.error) {
      if (typeof error.error === 'string') {
        errorMessage = error.error;
      } else if (error.error.detail) {
        errorMessage = error.error.detail;
      } else if (error.error.message) {
        errorMessage = error.error.message;
      } else if (error.error.username) {
        errorMessage = `Username: ${error.error.username.join(', ')}`;
      } else if (error.error.password) {
        errorMessage = `Password: ${error.error.password.join(', ')}`;
      } else if (typeof error.error === 'object') {
        const fieldErrors = Object.entries(error.error)
          .map(([field, errors]: [string, any]) => {
            if (Array.isArray(errors)) {
              return `${field}: ${errors.join(', ')}`;
            }
            return `${field}: ${errors}`;
          });
        errorMessage = fieldErrors.join('; ');
      }
    } else if (error.message) {
      errorMessage = error.message;
    }

    switch (error.status) {
      case 400:
        if (!error.error) {
          errorMessage = 'Invalid request. Please check your input.';
        }
        break;
      case 401:
        errorMessage = 'Invalid credentials. Please check your username and password.';
        break;
      case 403:
        errorMessage = 'Access forbidden. Please contact support.';
        break;
      case 404:
        errorMessage = 'Service not found. Please try again later.';
        break;
      case 500:
        errorMessage = 'Server error. Please try again later.';
        break;
    }

    return throwError(() => new Error(errorMessage));
  }
}
