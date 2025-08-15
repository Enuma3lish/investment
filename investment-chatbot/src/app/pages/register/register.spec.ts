import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegisterComponent } from './register';
import { FormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AuthService } from '../../services/auth.service';
import { of } from 'rxjs';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    mockAuthService = jasmine.createSpyObj<AuthService>('AuthService', ['register']);

    mockAuthService.register.and.returnValue(of({}));

    await TestBed.configureTestingModule({
      imports: [RegisterComponent, FormsModule, HttpClientTestingModule],
      providers: [{ provide: AuthService, useValue: mockAuthService }]
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call authService.register with correct object', () => {
    component.name = 'Test User';
    component.email = 'test@example.com';
    component.password = 'testpass';

    component.onRegister();

    expect(mockAuthService.register).toHaveBeenCalledWith({
      name: 'Test User',
      email: 'test@example.com',
      password: 'testpass'
    });
  });
});
