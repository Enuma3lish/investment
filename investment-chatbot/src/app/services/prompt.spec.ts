import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { PromptService } from './prompt.service';

describe('PromptService', () => {
  let service: PromptService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PromptService]
    });

    service = TestBed.inject(PromptService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // Ensure no outstanding HTTP calls
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should send prompt to backend', () => {
    const mockResponse = { task_id: '123' };
    service.sendPrompt('2330', 'Test prompt').subscribe(res => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpMock.expectOne('/api/analyze/2330/?prompt=Test prompt');
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should get result from backend', () => {
    const mockResult = { status: 'done', result: 'Mocked result' };
    service.getResult('123').subscribe(res => {
      expect(res).toEqual(mockResult);
    });

    const req = httpMock.expectOne('/api/analyze_result/123/');
    expect(req.request.method).toBe('GET');
    req.flush(mockResult);
  });

  it('should get remaining prompts', () => {
    const mockRemaining = 5;
    service.getRemaining().subscribe(res => {
      expect(res).toBe(mockRemaining);
    });

    const req = httpMock.expectOne('/api/prompt_remaining/');
    expect(req.request.method).toBe('GET');
    req.flush(mockRemaining);
  });
});
