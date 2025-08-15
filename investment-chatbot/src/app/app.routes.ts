import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth-guard';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register';
import { PortfolioComponent } from './pages/portfolio/portfolio.component';

export const routes: Routes = [
  // Public routes (no authentication required)
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  {
    path: 'logout',
    loadComponent: () =>
      import('./pages/logout/logout.component').then((m) => m.LogoutComponent),
  },

  // Protected routes (require authentication)
  {
    path: 'home',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./pages/home/home').then((m) => m.HomeComponent),
  },
  {
    path: 'dashboard', // Alternative route to home
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./pages/home/home').then((m) => m.HomeComponent),
  },
  {
    path: 'chatbot',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./pages/chatbot/chatbot').then((m) => m.ChatbotComponent),
  },
  {
    path: 'portfolio', // ✅ FIXED: Now protected by AuthGuard
    component: PortfolioComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'trade',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./pages/trade/trade').then((m) => m.TradeComponent),
  },
  {
    path: 'trade-history',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./pages/trade-history/trade-history').then((m) => m.TradeHistoryComponent),
  },

  // Redirect aliases for backward compatibility
  {
    path: 'history',
    redirectTo: 'trade-history',
    pathMatch: 'full',
  },

  // Wildcard route - must be last
  {
    path: '**',
    redirectTo: 'login',
  },
];
