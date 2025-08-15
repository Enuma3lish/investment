import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-logout',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="logout-container">
      <!-- Logout in Progress -->
      <div *ngIf="isLoggingOut" class="logout-progress">
        <div class="logout-icon">
          <div class="spinner"></div>
        </div>
        <h2>Logging Out...</h2>
        <p>Please wait while we securely log you out.</p>
      </div>

      <!-- Logout Complete -->
      <div *ngIf="logoutComplete && !error" class="logout-success">
        <div class="success-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="#27ae60" stroke-width="2"/>
            <path d="M8 12l2 2 4-4" stroke="#27ae60" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>

        <h2>Logout Successful</h2>
        <p>You have been successfully logged out of your account.</p>

        <div class="logout-details">
          <div class="detail-item">
            <span class="icon">🔒</span>
            <span class="text">Your session has been terminated</span>
          </div>
          <div class="detail-item">
            <span class="icon">🧹</span>
            <span class="text">Local data has been cleared</span>
          </div>
          <div class="detail-item">
            <span class="icon">🛡️</span>
            <span class="text">Your account is secure</span>
          </div>
        </div>

        <div class="redirect-info">
          <p>Redirecting to login page in <strong>{{ countdown }}</strong> seconds...</p>
          <div class="countdown-bar">
            <div class="countdown-progress" [style.width.%]="((3 - countdown) / 3) * 100"></div>
          </div>
        </div>

        <div class="action-buttons">
          <button (click)="redirectNow()" class="btn-primary">
            Go to Login Now
          </button>
        </div>
      </div>

      <!-- Logout Error -->
      <div *ngIf="error" class="logout-error">
        <div class="error-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="#e74c3c" stroke-width="2"/>
            <line x1="15" y1="9" x2="9" y2="15" stroke="#e74c3c" stroke-width="2" stroke-linecap="round"/>
            <line x1="9" y1="9" x2="15" y2="15" stroke="#e74c3c" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>

        <h2>Logout Error</h2>
        <p>{{ error }}</p>

        <div class="action-buttons">
          <button (click)="goToLogin()" class="btn-primary">
            Continue to Login
          </button>
          <button (click)="performLogout()" class="btn-secondary">
            Try Again
          </button>
        </div>
      </div>

      <!-- Security Notice -->
      <div class="security-notice">
        <div class="notice-content">
          <h3>🔐 Security Tips</h3>
          <ul>
            <li>Always log out when using shared computers</li>
            <li>Close all browser windows after logging out</li>
            <li>Never share your login credentials</li>
            <li>Use strong, unique passwords</li>
          </ul>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .logout-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }

    .logout-progress,
    .logout-success,
    .logout-error {
      background: white;
      border-radius: 20px;
      padding: 3rem;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
      text-align: center;
      max-width: 500px;
      width: 100%;
      margin-bottom: 2rem;
      animation: slideIn 0.5s ease-out;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .logout-icon,
    .success-icon,
    .error-icon {
      margin-bottom: 2rem;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .spinner {
      width: 50px;
      height: 50px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #3498db;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    h2 {
      color: #2c3e50;
      font-size: 2rem;
      margin-bottom: 1rem;
      font-weight: 600;
    }

    p {
      color: #7f8c8d;
      font-size: 1.1rem;
      line-height: 1.6;
      margin-bottom: 2rem;
    }

    .logout-details {
      margin: 2rem 0;
      text-align: left;
    }

    .detail-item {
      display: flex;
      align-items: center;
      margin-bottom: 1rem;
      padding: 0.75rem;
      background: #f8f9fa;
      border-radius: 10px;
      border-left: 4px solid #27ae60;
    }

    .detail-item .icon {
      font-size: 1.5rem;
      margin-right: 1rem;
      min-width: 2rem;
    }

    .detail-item .text {
      color: #2c3e50;
      font-weight: 500;
    }

    .redirect-info {
      margin: 2rem 0;
      padding: 1.5rem;
      background: linear-gradient(135deg, #e3f2fd, #bbdefb);
      border-radius: 15px;
      border: 2px solid #2196f3;
    }

    .redirect-info p {
      margin-bottom: 1rem;
      color: #1565c0;
      font-weight: 600;
    }

    .redirect-info strong {
      color: #0d47a1;
      font-size: 1.2rem;
    }

    .countdown-bar {
      width: 100%;
      height: 8px;
      background: rgba(33, 150, 243, 0.2);
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 1rem;
    }

    .countdown-progress {
      height: 100%;
      background: linear-gradient(90deg, #2196f3, #1976d2);
      transition: width 1s linear;
      border-radius: 4px;
    }

    .action-buttons {
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
      margin-top: 2rem;
    }

    .btn-primary,
    .btn-secondary {
      padding: 0.75rem 2rem;
      border: none;
      border-radius: 25px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      min-width: 150px;
    }

    .btn-primary {
      background: linear-gradient(135deg, #3498db, #2980b9);
      color: white;
      box-shadow: 0 5px 15px rgba(52, 152, 219, 0.3);
    }

    .btn-primary:hover {
      background: linear-gradient(135deg, #2980b9, #3498db);
      transform: translateY(-3px);
      box-shadow: 0 8px 25px rgba(52, 152, 219, 0.4);
    }

    .btn-secondary {
      background: white;
      color: #7f8c8d;
      border: 2px solid #bdc3c7;
    }

    .btn-secondary:hover {
      background: #f8f9fa;
      border-color: #95a5a6;
      transform: translateY(-2px);
    }

    .security-notice {
      background: rgba(255, 255, 255, 0.95);
      border-radius: 15px;
      padding: 2rem;
      max-width: 500px;
      width: 100%;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .notice-content h3 {
      color: #2c3e50;
      margin-bottom: 1rem;
      font-size: 1.3rem;
      text-align: center;
    }

    .notice-content ul {
      list-style: none;
      padding: 0;
    }

    .notice-content li {
      position: relative;
      padding: 0.5rem 0 0.5rem 2rem;
      color: #5d6d7e;
      line-height: 1.5;
    }

    .notice-content li:before {
      content: "✓";
      position: absolute;
      left: 0;
      color: #27ae60;
      font-weight: bold;
      font-size: 1.1rem;
    }

    @media (max-width: 768px) {
      .logout-container {
        padding: 1rem;
      }

      .logout-progress,
      .logout-success,
      .logout-error {
        padding: 2rem;
        margin-bottom: 1rem;
      }

      h2 {
        font-size: 1.5rem;
      }

      p {
        font-size: 1rem;
      }

      .action-buttons {
        flex-direction: column;
        align-items: center;
      }

      .btn-primary,
      .btn-secondary {
        width: 100%;
        max-width: 250px;
      }
    }
  `]
})
export class LogoutComponent implements OnInit {
  isLoggingOut = true;
  logoutComplete = false;
  error = '';
  countdown = 3;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.performLogout();
  }

  performLogout(): void {
    console.log('🚪 Starting logout process...');

    try {
      // ✅ COMPLETELY SAFE: Use try-catch with separate checks
      let hasLogoutMethod = false;
      let logoutResult: any = null;

      // Check if logout method exists
      if (this.authService && typeof this.authService.logout === 'function') {
        hasLogoutMethod = true;
        logoutResult = this.authService.logout();
      }

      if (hasLogoutMethod && logoutResult) {
        // Check if result is Observable-like
        if ('subscribe' in logoutResult && typeof logoutResult.subscribe === 'function') {
          // Handle Observable response
          logoutResult.subscribe({
            next: (response: any) => {
              console.log('✅ Logout successful:', response);
              this.handleLogoutSuccess();
            },
            error: (error: any) => {
              console.error('❌ Logout error:', error);
              this.handleLogoutSuccess(); // Clear local data anyway
            }
          });
          return; // Exit early for Observable case
        }
      }

      // Handle void/sync logout or no logout method
      console.log('✅ Logout completed (no Observable)');
      this.handleLogoutSuccess();

    } catch (error: any) {
      console.error('❌ Logout exception:', error);
      this.handleLogoutSuccess(); // Clear local data anyway
    }
  }

  private handleLogoutSuccess(): void {
    this.isLoggingOut = false;
    this.logoutComplete = true;

    // Clear all local storage and session data
    this.clearLocalData();

    // Start countdown to redirect
    this.startRedirectCountdown();
  }

  private clearLocalData(): void {
    try {
      // Clear localStorage
      localStorage.clear();

      // Clear sessionStorage
      sessionStorage.clear();

      // Clear any cookies (if your app uses them)
      document.cookie.split(";").forEach(function(c) {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });

      console.log('🧹 Local data cleared');
    } catch (error) {
      console.error('❌ Error clearing local data:', error);
    }
  }

  private startRedirectCountdown(): void {
    const countdownInterval = setInterval(() => {
      this.countdown--;

      if (this.countdown <= 0) {
        clearInterval(countdownInterval);
        this.redirectToLogin();
      }
    }, 1000);
  }

  private redirectToLogin(): void {
    console.log('🔄 Redirecting to login...');

    // Force a hard redirect to ensure clean state
    window.location.href = '/login';

    // Fallback using Angular router
    setTimeout(() => {
      this.router.navigate(['/login'], { replaceUrl: true });
    }, 100);
  }

  // Manual redirect if user clicks button
  redirectNow(): void {
    this.countdown = 0;
    this.redirectToLogin();
  }

  // Go back to login immediately
  goToLogin(): void {
    this.redirectToLogin();
  }
}
