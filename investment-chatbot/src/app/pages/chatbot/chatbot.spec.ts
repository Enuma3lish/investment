import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChatbotComponent } from './chatbot';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { PromptService } from '../../services/prompt.service';
import { of } from 'rxjs';

describe('ChatbotComponent', () => {
  let component: ChatbotComponent;
  let fixture: ComponentFixture<ChatbotComponent>;
  let mockPromptService: jasmine.SpyObj<PromptService>;

  beforeEach(async () => {
    // ✅ Use correct method names from PromptService
    mockPromptService = jasmine.createSpyObj<PromptService>('PromptService', [
      'getRemaining',
      'sendPrompt',
      'getResult'
    ]);

    mockPromptService.getRemaining.and.returnValue(of(10));
    mockPromptService.sendPrompt.and.returnValue(of({ task_id: 'mock-task-id' }));
    mockPromptService.getResult.and.returnValue(of({ status: 'done', result: 'Mock result' }));

    await TestBed.configureTestingModule({
      imports: [ChatbotComponent, FormsModule, HttpClientTestingModule],
      providers: [{ provide: PromptService, useValue: mockPromptService }],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatbotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load remaining prompts on init', () => {
    expect(component.remainingPrompts).toBe(10);
  });

  it('should call sendPrompt on submitPrompt()', () => {
    component.symbol = '2330';
    component.prompt = 'Is this stock a good buy?';
    component.submitPrompt();

    expect(mockPromptService.sendPrompt).toHaveBeenCalledWith('2330', 'Is this stock a good buy?');
  });

  it('should poll and receive result', (done) => {
    component.symbol = '2330';
    component.prompt = 'Will it go up?';

    component.submitPrompt();

    setTimeout(() => {
      expect(component.result).toBe('Mock result');
      done();
    }, 1600); // wait for polling once (from pollResult)
  });
});
