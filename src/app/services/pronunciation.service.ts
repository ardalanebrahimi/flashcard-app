import { Injectable } from '@angular/core';

interface CachedPronunciation {
  word: string;
  audioData: string; // Base64 encoded audio data
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class PronunciationService {
  private cache = new Map<string, CachedPronunciation>();
  private readonly CACHE_KEY = 'german_pronunciation_cache';
  private readonly CACHE_EXPIRY_DAYS = 30;
  private synth: SpeechSynthesis;
  private germanVoice: SpeechSynthesisVoice | null = null;

  constructor() {
    this.synth = window.speechSynthesis;
    this.loadCacheFromStorage();
    this.initializeGermanVoice();
  }

  /**
   * Initialize and find the best German voice available
   */
  private initializeGermanVoice(): void {
    const loadVoices = () => {
      const voices = this.synth.getVoices();
      
      // Prefer German voices in order of quality
      const germanVoices = voices.filter(voice => 
        voice.lang.startsWith('de') || 
        voice.lang.startsWith('de-DE') ||
        voice.name.toLowerCase().includes('german')
      );

      if (germanVoices.length > 0) {
        // Prefer native voices over network voices for offline capability
        this.germanVoice = germanVoices.find(voice => voice.localService) || germanVoices[0];
        console.log('German voice selected:', this.germanVoice.name, this.germanVoice.lang);
      } else {
        // Fallback to any available voice
        this.germanVoice = voices[0] || null;
        console.warn('No German voice found, using fallback:', this.germanVoice?.name);
      }
    };

    // Load voices immediately if available
    loadVoices();

    // Also listen for voiceschanged event (some browsers load voices asynchronously)
    this.synth.addEventListener('voiceschanged', loadVoices);
  }

  /**
   * Pronounce a German word with proper pronunciation
   */
  async pronounceWord(word: string): Promise<void> {
    if (!word.trim()) {
      throw new Error('Word cannot be empty');
    }

    // Check if we have cached audio first
    const cached = this.getCachedPronunciation(word);
    if (cached) {
      try {
        await this.playAudioFromCache(cached.audioData);
        return;
      } catch (error) {
        console.warn('Failed to play cached audio, falling back to speech synthesis:', error);
        // Remove invalid cache entry
        this.removeCachedPronunciation(word);
      }
    }

    // Use speech synthesis for pronunciation
    await this.speakWithSynthesis(word);
  }

  /**
   * Speak word using browser's speech synthesis
   */
  private async speakWithSynthesis(word: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synth) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      // Cancel any ongoing speech
      this.synth.cancel();

      const utterance = new SpeechSynthesisUtterance(word);
      
      // Configure for German pronunciation
      utterance.lang = 'de-DE';
      utterance.rate = 0.7; // Slightly slower for learning
      utterance.pitch = 1;
      utterance.volume = 1;

      // Use the selected German voice if available
      if (this.germanVoice) {
        utterance.voice = this.germanVoice;
      }

      utterance.onend = () => {
        resolve();
      };

      utterance.onerror = (event) => {
        reject(new Error(`Speech synthesis error: ${event.error}`));
      };

      // Optional: Try to record and cache the audio (browser support varies)
      this.tryCacheAudio(word, utterance);

      this.synth.speak(utterance);
    });
  }

  /**
   * Attempt to cache audio data (experimental - browser support limited)
   */
  private tryCacheAudio(word: string, utterance: SpeechSynthesisUtterance): void {
    // Note: Direct audio recording from speech synthesis is not widely supported
    // This is a placeholder for future enhancement
    // For now, we rely on the browser's built-in caching
  }

  /**
   * Get available German voices
   */
  getAvailableGermanVoices(): SpeechSynthesisVoice[] {
    const voices = this.synth.getVoices();
    return voices.filter(voice => 
      voice.lang.startsWith('de') || 
      voice.name.toLowerCase().includes('german')
    );
  }

  /**
   * Check if speech synthesis is supported
   */
  isSpeechSynthesisSupported(): boolean {
    return 'speechSynthesis' in window;
  }

  /**
   * Get the currently selected German voice
   */
  getCurrentGermanVoice(): SpeechSynthesisVoice | null {
    return this.germanVoice;
  }

  /**
   * Load pronunciation cache from localStorage
   */
  private loadCacheFromStorage(): void {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (cached) {
        const data: CachedPronunciation[] = JSON.parse(cached);
        const now = Date.now();
        
        // Filter out expired entries
        const validEntries = data.filter(entry => {
          const age = now - entry.timestamp;
          const maxAge = this.CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
          return age < maxAge;
        });

        // Populate cache map
        validEntries.forEach(entry => {
          this.cache.set(entry.word.toLowerCase(), entry);
        });

        // Save cleaned cache back to storage
        this.saveCacheToStorage();
      }
    } catch (error) {
      console.warn('Failed to load pronunciation cache:', error);
      this.cache.clear();
    }
  }

  /**
   * Save pronunciation cache to localStorage
   */
  private saveCacheToStorage(): void {
    try {
      const data = Array.from(this.cache.values());
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save pronunciation cache:', error);
    }
  }

  /**
   * Get cached pronunciation for a word
   */
  private getCachedPronunciation(word: string): CachedPronunciation | null {
    return this.cache.get(word.toLowerCase()) || null;
  }

  /**
   * Cache pronunciation data for a word
   */
  private cachePronunciation(word: string, audioData: string): void {
    const cached: CachedPronunciation = {
      word: word.toLowerCase(),
      audioData,
      timestamp: Date.now()
    };

    this.cache.set(word.toLowerCase(), cached);
    this.saveCacheToStorage();
  }

  /**
   * Remove cached pronunciation for a word
   */
  private removeCachedPronunciation(word: string): void {
    this.cache.delete(word.toLowerCase());
    this.saveCacheToStorage();
  }

  /**
   * Play audio from cached base64 data
   */
  private async playAudioFromCache(audioData: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const audio = new Audio(audioData);
        
        audio.onended = () => resolve();
        audio.onerror = () => reject(new Error('Failed to play cached audio'));
        
        audio.play().catch(reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Clear all cached pronunciations
   */
  clearCache(): void {
    this.cache.clear();
    localStorage.removeItem(this.CACHE_KEY);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; totalSizeKB: number } {
    const data = Array.from(this.cache.values());
    const totalSize = data.reduce((sum, entry) => sum + entry.audioData.length, 0);
    
    return {
      size: data.length,
      totalSizeKB: Math.round(totalSize / 1024)
    };
  }
}
