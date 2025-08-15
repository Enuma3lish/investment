import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service'; // Adjust path as needed

@Component({
  selector: 'app-register',
  templateUrl: './register.html',
  styleUrls: ['./register.scss'],
  standalone: true,
  imports: [FormsModule, CommonModule]
})
export class RegisterComponent {
  name: string = '';
  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  isLoading: boolean = false;
  error: string = '';
  success: string = '';

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  onRegister() {
    this.error = '';
    this.success = '';

    // Comprehensive validation
    if (!this.name || !this.email || !this.password || !this.confirmPassword) {
      this.error = '請填寫所有欄位';
      return;
    }

    if (!/^[a-zA-Z0-9_]{2,}$/.test(this.name)) {
      this.error = '帳號只能輸入英文、數字、底線，且至少2個字元';
      return;
    }

    // Enhanced email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      this.error = 'Email 格式錯誤';
      return;
    }

    if (this.password.length < 6) {
      this.error = '密碼長度需至少 6 字元';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.error = '密碼與確認密碼不一致';
      return;
    }

    this.isLoading = true;
    this.performRegistration();
  }

  private performRegistration() {
    // Use the auth service for registration
    // Note: Backend expects 'username' field, not 'name'
    this.authService.register(this.name, this.password).subscribe({
      next: (response) => {
        console.log('Registration successful:', response);
        this.success = '註冊成功！將跳轉至登入頁面...';
        this.isLoading = false;

        // Navigate to login after success message
        setTimeout(() => {
          this.navigateToLogin();
        }, 2000);
      },
      error: (error) => {
        console.error('Registration error:', error);
        this.error = error.message || '註冊過程發生錯誤，請稍後再試';
        this.isLoading = false;
      }
    });
  }

  navigateToLogin() {
    try {
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback navigation
      window.location.href = '/login';
    }
  }

  fillDemoData() {
    const randomNum = Math.floor(Math.random() * 1000);
    this.name = `demo_user_${randomNum}`;
    this.email = `demo${randomNum}@example.com`;
    this.password = 'demo123456';
    this.confirmPassword = 'demo123456';
    this.error = '';
    this.success = '';
  }

  clearForm() {
    this.name = '';
    this.email = '';
    this.password = '';
    this.confirmPassword = '';
    this.error = '';
    this.success = '';
  }

  // Helper method to check if form is valid
  get isFormValid(): boolean {
    return !!(
      this.name &&
      this.email &&
      this.password &&
      this.confirmPassword &&
      this.password === this.confirmPassword &&
      this.password.length >= 6 &&
      /^[a-zA-Z0-9_]{2,}$/.test(this.name) &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)
    );
  }
}
