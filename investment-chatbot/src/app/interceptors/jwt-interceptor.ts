import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {

  constructor(private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    console.log('🔍 JWT Interceptor called for:', req.url);

    // ✅ FIXED: More comprehensive auth endpoint detection
    const authEndpoints = [
      '/api/auth/login/',
      '/api/auth/register/',
      '/api/auth/logout/',
      '/api/auth/token/',
      '/auth/login/',
      '/auth/register/',
      '/auth/logout/',
      '/auth/token/'
    ];

    const isAuthEndpoint = authEndpoints.some(endpoint => req.url.includes(endpoint));

    if (isAuthEndpoint) {
      console.log('🔓 Auth endpoint detected, skipping token attachment for:', req.url);
      return next.handle(req).pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('❌ Auth endpoint error:', error);
          return throwError(() => error);
        })
      );
    }

    // Get token from localStorage
    const token = localStorage.getItem('access');
    console.log('🔑 Token exists:', !!token);

    if (token) {
      // ✅ FIXED: Better token validation
      try {
        // Check if token is properly formatted (JWT has 3 parts separated by dots)
        const tokenParts = token.split('.');
        if (tokenParts.length !== 3) {
          console.log('⚠️ Invalid token format, removing from storage');
          this.clearTokens();
          return next.handle(req);
        }

        // Check if token is expired
        const payload = JSON.parse(atob(tokenParts[1]));
        const currentTime = Math.floor(Date.now() / 1000);

        if (payload.exp && payload.exp < currentTime) {
          console.log('⚠️ Token expired, removing from storage');
          this.clearTokens();
          // Redirect to login for expired tokens
          this.router.navigate(['/login']);
          return throwError(() => new Error('Token expired'));
        }

        // Token is valid, add to request
        const cloned = req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('✅ Added Authorization header to:', req.url);

        return next.handle(cloned).pipe(
          catchError((error: HttpErrorResponse) => {
            console.error('❌ Request error:', error.status, error.message);

            // Handle 401 errors by clearing tokens and redirecting
            if (error.status === 401) {
              console.log('🚪 401 Unauthorized - clearing tokens and redirecting');
              this.clearTokens();
              this.router.navigate(['/login']);
            }

            return throwError(() => error);
          })
        );

      } catch (error) {
        console.log('⚠️ Error processing token:', error);
        this.clearTokens();
        return next.handle(req);
      }
    }

    console.log('❌ No valid token found, proceeding without auth');
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          console.log('🚪 401 Unauthorized - redirecting to login');
          this.router.navigate(['/login']);
        }
        return throwError(() => error);
      })
    );
  }

  private clearTokens(): void {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    sessionStorage.clear();
    console.log('🗑️ Cleared all tokens');
  }
}
