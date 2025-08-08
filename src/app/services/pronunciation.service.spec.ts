import { TestBed } from '@angular/core/testing';
import { PronunciationService } from './pronunciation.service';

describe('PronunciationService', () => {
  let service: PronunciationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PronunciationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should detect if speech synthesis is supported', () => {
    const isSupported = service.isSpeechSynthesisSupported();
    expect(typeof isSupported).toBe('boolean');
  });

  it('should get available German voices', () => {
    const germanVoices = service.getAvailableGermanVoices();
    expect(Array.isArray(germanVoices)).toBe(true);
  });

  it('should get current German voice', () => {
    const currentVoice = service.getCurrentGermanVoice();
    // Voice can be null if not available
    expect(currentVoice === null || typeof currentVoice === 'object').toBe(true);
  });

  it('should have cache statistics', () => {
    const stats = service.getCacheStats();
    expect(stats.size).toBeDefined();
    expect(stats.totalSizeKB).toBeDefined();
    expect(typeof stats.size).toBe('number');
    expect(typeof stats.totalSizeKB).toBe('number');
  });

  it('should handle empty word pronunciation gracefully', async () => {
    try {
      await service.pronounceWord('');
      fail('Should have thrown an error for empty word');
    } catch (error) {
      expect(error).toBeTruthy();
    }
  });

  it('should clear cache successfully', () => {
    service.clearCache();
    const stats = service.getCacheStats();
    expect(stats.size).toBe(0);
    expect(stats.totalSizeKB).toBe(0);
  });
});
