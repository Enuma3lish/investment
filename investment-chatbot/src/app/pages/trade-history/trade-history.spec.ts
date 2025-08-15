import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TradeHistoryComponent } from './trade-history';
import { PortfolioService } from '../../services/portfolio.service';
import { of, throwError } from 'rxjs';

describe('TradeHistoryComponent', () => {
  let component: TradeHistoryComponent;
  let fixture: ComponentFixture<TradeHistoryComponent>;
  let mockPortfolioService: jasmine.SpyObj<PortfolioService>;

  beforeEach(async () => {
    mockPortfolioService = jasmine.createSpyObj('PortfolioService', ['getTradeHistory']);
    mockPortfolioService.getTradeHistory.and.returnValue(of([
      { symbol: '2330', action: 'BUY', quantity: 10, price: 500 },
      { symbol: '2330', action: 'SELL', quantity: 5, price: 600 }
    ]));

    await TestBed.configureTestingModule({
      imports: [TradeHistoryComponent],
      providers: [{ provide: PortfolioService, useValue: mockPortfolioService }]
    }).compileComponents();

    fixture = TestBed.createComponent(TradeHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load trade history on init', () => {
    expect(component.trades.length).toBe(2);
  });

  it('should calculate revenue correctly', () => {
    const trade = { price: 100, quantity: 5, action: 'SELL' };
    expect(component.getRevenue(trade)).toBe(500);
  });
});
