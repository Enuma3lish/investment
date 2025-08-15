import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpErrorResponse } from '@angular/common/http';
import { catchError, switchMap } from 'rxjs/operators';
import { throwError, EMPTY } from 'rxjs';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;

  constructor(private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler) {
    console.log('🔍 AuthInterceptor called for:', req.url);

    // Don't add auth header for login/register requests
    if (this.isAuthRequest(req.url)) {
      console.log('🚫 Skipping auth for auth endpoint');
      return next.handle(req);
    }

    // Add auth token to request
    const token = localStorage.getItem('access_token') || localStorage.getItem('access');
    console.log('🔑 Token found:', !!token);

    if (token) {
      req = this.addAuthHeader(req, token);
      console.log('✅ Added Authorization header');
    }

    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('❌ HTTP Error:', error.status, error.message);

        // Handle 401 errors
        if (error.status === 401) {
          console.log('🚪 Unauthorized - redirecting to login');
          this.clearTokensAndRedirect();
          return EMPTY;
        }

        // For other auth-related errors, redirect to login
        if (error.status === 403) {
          console.log('🚫 Forbidden - redirecting to login');
          this.clearTokensAndRedirect();
          return EMPTY;
        }

        return throwError(() => error);
      })
    );
  }

  private isAuthRequest(url: string): boolean {
    return url.includes('/auth/login/') ||
           url.includes('/auth/register/') ||
           url.includes('/auth/token/refresh/');
  }

  private addAuthHeader(req: HttpRequest<any>, token: string): HttpRequest<any> {
    return req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  private clearTokensAndRedirect() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('access');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('refresh');
    sessionStorage.clear();
    this.router.navigate(['/login']);
  }
}
