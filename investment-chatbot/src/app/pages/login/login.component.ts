import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
  standalone: true,
  imports: [FormsModule, CommonModule]
})
export class LoginComponent {
  username: string = '';
  password: string = '';
  isLoading: boolean = false;
  error: string = '';
  success: string = '';

  constructor(
    private router: Router,
    private authService: AuthService
  ) {
    // If user is already logged in, redirect to portfolio
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/portfolio']);
    }
  }

  onLogin() {
    this.error = '';
    this.success = '';

    // Validation
    if (!this.username || !this.password) {
      this.error = 'Please enter both username and password';
      return;
    }

    if (this.username.length < 2) {
      this.error = 'Username must be at least 2 characters';
      return;
    }

    if (this.password.length < 6) {
      this.error = 'Password must be at least 6 characters';
      return;
    }

    this.isLoading = true;
    this.performLogin();
  }

  private performLogin() {
    this.authService.login(this.username, this.password).subscribe({
      next: (response) => {
        console.log('Login successful:', response);
        this.success = 'Login successful! Redirecting...';
        this.isLoading = false;

        // Navigate to portfolio after successful login
        setTimeout(() => {
          this.router.navigate(['/portfolio']);
        }, 1000);
      },
      error: (error) => {
        console.error('Login error:', error);
        this.error = error.message || 'Login failed. Please check your credentials.';
        this.isLoading = false;
      }
    });
  }

  navigateToRegister() {
    try {
      this.router.navigate(['/register']);
    } catch (error) {
      console.error('Navigation error:', error);
      window.location.href = '/register';
    }
  }

  fillDemoData() {
    // Fill with demo credentials
    this.username = 'demo_user_123';
    this.password = 'demo123456';
    this.error = '';
    this.success = '';
  }

  clearForm() {
    this.username = '';
    this.password = '';
    this.error = '';
    this.success = '';
  }

  // Helper method to check if form is valid
  get isFormValid(): boolean {
    return !!(
      this.username &&
      this.password &&
      this.username.length >= 2 &&
      this.password.length >= 6
    );
  }
}
