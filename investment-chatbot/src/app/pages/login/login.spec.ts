  import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login';
import { FormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AuthService } from '../../services/auth.service';
import { of } from 'rxjs';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    mockAuthService = jasmine.createSpyObj(
      'AuthService',
      ['login', 'saveTokens'] as (keyof AuthService)[]
    );

    mockAuthService.login.and.returnValue(of({
      access: 'mock-token',
      refresh: 'mock-refresh'
    }));

    await TestBed.configureTestingModule({
      imports: [LoginComponent, FormsModule, HttpClientTestingModule],
      providers: [{ provide: AuthService, useValue: mockAuthService }]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call authService.login with correct object', () => {
    component.email = 'test@example.com';
    component.password = 'testpass';

    component.onLogin();

    expect(mockAuthService.login).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'testpass'
    });
  });

  it('should call saveTokens after successful login', () => {
    component.email = 'test@example.com';
    component.password = 'testpass';

    component.onLogin();

    expect(mockAuthService.saveTokens).toHaveBeenCalledWith({
      access: 'mock-token',
      refresh: 'mock-refresh'
    });
  });
});
