import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="home-container">
      <div class="welcome-section">
        <h1>Investment Dashboard</h1>
        <p>Welcome back! Ready to analyze some stocks?</p>
      </div>

      <div class="dashboard-grid">
        <div class="dashboard-card" (click)="navigate('/chatbot')">
          <div class="card-icon">🤖</div>
          <h3>AI Stock Analysis</h3>
          <p>Get detailed AI-powered analysis for any stock with technical indicators and expert opinions</p>
          <div class="card-action">Analyze Now →</div>
        </div>

        <div class="dashboard-card" (click)="navigate('/portfolio')">
          <div class="card-icon">📊</div>
          <h3>My Portfolio</h3>
          <p>View your current holdings, track performance, and monitor your investments</p>
          <div class="card-action">View Portfolio →</div>
        </div>

        <div class="dashboard-card" (click)="navigate('/trade')">
          <div class="card-icon">💰</div>
          <h3>Trade Stocks</h3>
          <p>Buy and sell stocks with real-time pricing and instant execution</p>
          <div class="card-action">Start Trading →</div>
        </div>

        <div class="dashboard-card" (click)="navigate('/history')">
          <div class="card-icon">📈</div>
          <h3>Trading History</h3>
          <p>Review your past trades, analysis results, and performance metrics</p>
          <div class="card-action">View History →</div>
        </div>
      </div>

      <div class="quick-actions">
        <h3>Quick Start</h3>
        <p>New to stock analysis? Try analyzing a popular stock like TSMC (2330)</p>
        <button class="btn-primary" (click)="quickAnalyze()">
          🚀 Analyze TSMC (2330)
        </button>
      </div>
    </div>
  `,
  styles: [`
    .home-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }

    .welcome-section {
      text-align: center;
      margin-bottom: 3rem;
      padding: 2rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 12px;
    }

    .welcome-section h1 {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
      font-weight: 700;
    }

    .welcome-section p {
      font-size: 1.2rem;
      opacity: 0.9;
    }

    .dashboard-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
      margin-bottom: 3rem;
    }

    .dashboard-card {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      cursor: pointer;
      transition: all 0.3s ease;
      border: 1px solid #e0e0e0;
      position: relative;
      overflow: hidden;
    }

    .dashboard-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #3498db, #2ecc71);
      transform: scaleX(0);
      transition: transform 0.3s ease;
    }

    .dashboard-card:hover::before {
      transform: scaleX(1);
    }

    .dashboard-card:hover {
      transform: translateY(-8px);
      box-shadow: 0 8px 25px rgba(0,0,0,0.15);
    }

    .card-icon {
      font-size: 3.5rem;
      margin-bottom: 1rem;
      display: block;
    }

    .dashboard-card h3 {
      color: #2c3e50;
      margin-bottom: 1rem;
      font-size: 1.3rem;
      font-weight: 600;
    }

    .dashboard-card p {
      color: #666;
      line-height: 1.6;
      margin-bottom: 1.5rem;
    }

    .card-action {
      color: #3498db;
      font-weight: 600;
      font-size: 0.9rem;
    }

    .quick-actions {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      text-align: center;
      border: 1px solid #e0e0e0;
    }

    .quick-actions h3 {
      color: #2c3e50;
      margin-bottom: 1rem;
      font-size: 1.5rem;
    }

    .quick-actions p {
      color: #666;
      margin-bottom: 1.5rem;
      line-height: 1.6;
    }

    .btn-primary {
      background: linear-gradient(135deg, #3498db, #2ecc71);
      color: white;
      border: none;
      padding: 1rem 2rem;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      font-size: 1rem;
      transition: all 0.3s ease;
      box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(52, 152, 219, 0.4);
    }

    @media (max-width: 768px) {
      .home-container {
        padding: 1rem;
      }

      .welcome-section {
        padding: 1.5rem;
      }

      .welcome-section h1 {
        font-size: 2rem;
      }

      .dashboard-grid {
        grid-template-columns: 1fr;
      }

      .dashboard-card {
        padding: 1.5rem;
      }
    }
  `]
})
export class HomeComponent implements OnInit {
  constructor(private router: Router) {}

  ngOnInit(): void {
    // Component initialization
  }

  navigate(route: string) {
    this.router.navigate([route]);
  }

  quickAnalyze() {
    // Navigate to chatbot with pre-filled TSMC data
    this.router.navigate(['/chatbot'], {
      queryParams: { symbol: '2330', prompt: 'Should I buy this stock now?' }
    });
  }
}
