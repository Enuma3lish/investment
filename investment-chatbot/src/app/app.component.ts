import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router } from '@angular/router';
import { AuthService } from './services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Investment Chatbot';
  isAuthenticated = false; // ✅ FIXED: Add this property
  private authSubscription?: Subscription;

  constructor(
    public authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    // ✅ FIXED: Subscribe to authentication state
    this.authSubscription = this.authService.isAuthenticated$.subscribe(
      isAuth => {
        this.isAuthenticated = isAuth;
        console.log('🔐 Auth state changed:', isAuth);
      }
    );
  }

  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  logout() {
    this.authService.logout().subscribe({
      next: () => {
        console.log('✅ Logout successful');
        this.router.navigate(['/login']);
      },
      error: (error) => {
        console.error('❌ Logout error:', error);
        // Even if logout request fails, clear local state
        this.router.navigate(['/login']);
      }
    });
  }

  navigateToPortfolio() {
    this.router.navigate(['/portfolio']);
  }

  navigateToTrade() {
    this.router.navigate(['/trade']);
  }

  navigateToHistory() {
    this.router.navigate(['/trade-history']);
  }

  navigateToChatbot() {
    this.router.navigate(['/chatbot']);
  }

  navigateToHome() {
    this.router.navigate(['/home']);
  }
}
