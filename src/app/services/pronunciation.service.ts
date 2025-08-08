import { Injectable } from '@angular/core';
import { OpenaiService } from './openai.service';
import { firstValueFrom } from 'rxjs';

interface CachedPronunciation {
  word: string;
  audioData: string; // Base64 encoded audio data
  timestamp: number;
  accessCount: number; // Track how often this is accessed
  lastAccessed: number; // Track when it was last accessed
}

@Injectable({
  providedIn: 'root'
})
export class PronunciationService {
  private cache = new Map<string, CachedPronunciation>();
  private readonly CACHE_KEY = 'german_pronunciation_cache';
  private readonly CACHE_EXPIRY_DAYS = 30;
  private readonly MAX_CACHE_SIZE = 100; // Limit cache size for performance
  private synth: SpeechSynthesis | null = null;
  private germanVoice: SpeechSynthesisVoice | null = null;
  private isSupported = false;
  private saveTimeout: any = null;

  constructor(private openaiService: OpenaiService) {
    console.log('PronunciationService constructor - checking support...');
    this.isSupported = this.checkSpeechSynthesisSupport();
    console.log('PronunciationService constructor - support result:', this.isSupported);
    
    if (this.isSupported) {
      this.synth = window.speechSynthesis;
      this.initializeGermanVoice();
    }
    this.loadCacheFromStorage();
  }

  /**
   * Check if speech synthesis is properly supported
   */
  private checkSpeechSynthesisSupport(): boolean {
    console.log('checkSpeechSynthesisSupport - starting check...');
    
    // Use a more lenient check for Android compatibility
    if (!('speechSynthesis' in window)) {
      console.log('checkSpeechSynthesisSupport - speechSynthesis not in window');
      return false;
    }
    
    if (window.speechSynthesis === null || window.speechSynthesis === undefined) {
      console.log('checkSpeechSynthesisSupport - window.speechSynthesis is null/undefined');
      return false;
    }
    
    // On some Android devices, getVoices might not be available immediately
    // but speechSynthesis itself works, so we'll be more lenient
    try {
      // Test if we can create a basic utterance
      console.log('checkSpeechSynthesisSupport - testing SpeechSynthesisUtterance creation...');
      const testUtterance = new SpeechSynthesisUtterance('test');
      console.log('checkSpeechSynthesisSupport - SpeechSynthesisUtterance created successfully');
      return true;
    } catch (error) {
      console.warn('checkSpeechSynthesisSupport - Speech synthesis test failed:', error);
      return false;
    }
  }

  /**
   * Initialize and find the best German voice available
   */
  private initializeGermanVoice(): void {
    if (!this.synth || !this.isSupported) {
      return;
    }

    const loadVoices = () => {
      if (!this.synth) return;
      
      try {
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
          if (this.germanVoice) {
            console.warn('No German voice found, using fallback:', this.germanVoice.name);
          } else {
            console.warn('No voices available initially - will try again later');
          }
        }
      } catch (error) {
        console.warn('Failed to get voices:', error);
      }
    };

    // Load voices immediately if available
    loadVoices();

    // Also listen for voiceschanged event (some browsers load voices asynchronously)
    try {
      this.synth.addEventListener('voiceschanged', loadVoices);
    } catch (error) {
      console.warn('Failed to add voiceschanged listener:', error);
    }
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
        console.log(`Playing cached pronunciation for "${word}"`);
        await this.playAudioFromCache(cached.audioData);
        return;
      } catch (error) {
        console.warn('Failed to play cached audio, trying fresh pronunciation:', error);
        // Remove invalid cache entry
        this.removeCachedPronunciation(word);
      }
    }

    // Try OpenAI TTS first (more reliable, especially on mobile)
    try {
      console.log('Attempting OpenAI TTS for word:', word);
      await this.pronounceWithOpenAI(word);
      return;
    } catch (error) {
      console.warn('OpenAI TTS failed, falling back to browser speech synthesis:', error);
    }

    // Fallback to browser speech synthesis
    const isAndroid = /Android/i.test(navigator.userAgent);
    
    if (!this.isSupported && isAndroid) {
      console.log('Android device detected - attempting speech synthesis despite support check');
      try {
        // Try to initialize speech synthesis for Android
        if ('speechSynthesis' in window) {
          this.synth = window.speechSynthesis;
          await this.speakWithSynthesis(word);
          return;
        }
      } catch (error) {
        console.warn('Android fallback speech synthesis failed:', error);
        throw new Error('Both OpenAI TTS and device speech synthesis are unavailable. Please check your internet connection or device settings.');
      }
    }

    // Standard support check for non-Android devices
    if (!this.isSupported) {
      throw new Error('Speech synthesis is not supported on this device and OpenAI TTS is unavailable');
    }

    // Use speech synthesis for pronunciation
    await this.speakWithSynthesis(word);
  }

  /**
   * Use OpenAI Text-to-Speech API for pronunciation
   */
  private async pronounceWithOpenAI(word: string): Promise<void> {
    try {
      const ttsResponse = await firstValueFrom(this.openaiService.generateGermanPronunciation(word));
      
      // Convert blob to base64 for caching
      const audioBase64 = await this.blobToBase64(ttsResponse.audioBlob);
      
      // Cache the audio data for future use
      this.cachePronunciation(word, audioBase64);
      
      // Play the audio
      const audio = new Audio(ttsResponse.audioUrl);
      
      return new Promise((resolve, reject) => {
        audio.onended = () => {
          // Clean up the blob URL
          URL.revokeObjectURL(ttsResponse.audioUrl);
          resolve();
        };
        
        audio.onerror = () => {
          URL.revokeObjectURL(ttsResponse.audioUrl);
          reject(new Error('Failed to play OpenAI generated audio'));
        };
        
        // Set a timeout in case audio doesn't play
        const timeout = setTimeout(() => {
          URL.revokeObjectURL(ttsResponse.audioUrl);
          reject(new Error('OpenAI audio playback timeout'));
        }, 15000); // 15 second timeout
        
        audio.onloadstart = () => {
          clearTimeout(timeout);
        };
        
        audio.play().catch(error => {
          clearTimeout(timeout);
          URL.revokeObjectURL(ttsResponse.audioUrl);
          reject(new Error(`Failed to play OpenAI audio: ${error.message}`));
        });
      });
      
    } catch (error) {
      console.error('OpenAI TTS error:', error);
      throw new Error(`OpenAI pronunciation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Speak word using browser's speech synthesis
   */
  private async speakWithSynthesis(word: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Try to get speech synthesis if not already available
      if (!this.synth && 'speechSynthesis' in window) {
        this.synth = window.speechSynthesis;
      }
      
      if (!this.synth) {
        reject(new Error('Speech synthesis not available on this device'));
        return;
      }

      // Cancel any ongoing speech
      try {
        this.synth.cancel();
      } catch (error) {
        console.warn('Failed to cancel previous speech:', error);
      }

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

      // Set a timeout in case the speech doesn't start
      const timeout = setTimeout(() => {
        reject(new Error('Speech synthesis timeout'));
      }, 10000); // 10 second timeout

      utterance.onstart = () => {
        clearTimeout(timeout);
      };

      // Optional: Try to record and cache the audio (browser support varies)
      this.tryCacheAudio(word, utterance);

      try {
        this.synth.speak(utterance);
      } catch (error) {
        clearTimeout(timeout);
        reject(new Error(`Failed to start speech synthesis: ${error}`));
      }
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
    if (!this.synth || !this.isSupported) {
      return [];
    }
    
    try {
      const voices = this.synth.getVoices();
      return voices.filter(voice => 
        voice.lang.startsWith('de') || 
        voice.name.toLowerCase().includes('german')
      );
    } catch (error) {
      console.warn('Failed to get German voices:', error);
      return [];
    }
  }

  /**
   * Check if speech synthesis is supported
   */
  isSpeechSynthesisSupported(): boolean {
    console.log('PronunciationService - isSpeechSynthesisSupported called, returning:', this.isSupported);
    console.log('PronunciationService - speechSynthesis in window:', 'speechSynthesis' in window);
    console.log('PronunciationService - window.speechSynthesis exists:', !!window.speechSynthesis);
    return this.isSupported;
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
        const data: any[] = JSON.parse(cached);
        const now = Date.now();
        
        // Filter out expired entries and normalize data
        const validEntries = data
          .filter(entry => {
            const age = now - entry.timestamp;
            const maxAge = this.CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
            return age < maxAge;
          })
          .map(entry => ({
            word: entry.word,
            audioData: entry.audioData,
            timestamp: entry.timestamp,
            accessCount: entry.accessCount || 1,
            lastAccessed: entry.lastAccessed || entry.timestamp
          } as CachedPronunciation));

        // Sort by access count and last accessed time (most used first)
        validEntries.sort((a, b) => {
          const aScore = a.accessCount * 0.7 + (a.lastAccessed / 1000000) * 0.3;
          const bScore = b.accessCount * 0.7 + (b.lastAccessed / 1000000) * 0.3;
          return bScore - aScore;
        });

        // Limit cache size to prevent memory issues
        const limitedEntries = validEntries.slice(0, this.MAX_CACHE_SIZE);

        // Populate cache map
        limitedEntries.forEach(entry => {
          this.cache.set(entry.word.toLowerCase(), entry);
        });

        // Save cleaned cache back to storage if we removed entries
        if (limitedEntries.length !== data.length) {
          this.saveCacheToStorage();
        }
      }
    } catch (error) {
      console.warn('Failed to load pronunciation cache:', error);
      this.cache.clear();
    }
  }

  /**
   * Save pronunciation cache to localStorage (debounced)
   */
  private debouncedSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveCacheToStorage();
    }, 1000); // Save after 1 second of inactivity
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
    const cached = this.cache.get(word.toLowerCase());
    if (cached) {
      // Update access statistics
      cached.accessCount++;
      cached.lastAccessed = Date.now();
      this.cache.set(word.toLowerCase(), cached);
      // Save updated stats to storage (debounced to avoid too frequent writes)
      this.debouncedSave();
    }
    return cached || null;
  }

  /**
   * Cache pronunciation data for a word
   */
  private cachePronunciation(word: string, audioData: string): void {
    const cached: CachedPronunciation = {
      word: word.toLowerCase(),
      audioData,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now()
    };

    // If cache is full, remove least recently used entry
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictLeastUsedEntry();
    }

    this.cache.set(word.toLowerCase(), cached);
    this.saveCacheToStorage();
  }

  /**
   * Remove the least recently used entry from cache
   */
  private evictLeastUsedEntry(): void {
    let leastUsed: { key: string; entry: CachedPronunciation } | null = null;
    
    for (const [key, entry] of this.cache.entries()) {
      if (!leastUsed || 
          entry.accessCount < leastUsed.entry.accessCount ||
          (entry.accessCount === leastUsed.entry.accessCount && entry.lastAccessed < leastUsed.entry.lastAccessed)) {
        leastUsed = { key, entry };
      }
    }
    
    if (leastUsed) {
      this.cache.delete(leastUsed.key);
      console.log('Evicted cached pronunciation for:', leastUsed.entry.word);
    }
  }

  /**
   * Remove cached pronunciation for a word
   */
  private removeCachedPronunciation(word: string): void {
    this.cache.delete(word.toLowerCase());
    this.saveCacheToStorage();
  }

  /**
   * Convert blob to base64 string for caching
   */
  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert blob to base64'));
        }
      };
      reader.onerror = () => reject(new Error('FileReader error'));
      reader.readAsDataURL(blob);
    });
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
   * Preload pronunciation for a word (cache without playing)
   */
  async preloadPronunciation(word: string): Promise<boolean> {
    if (!word.trim()) {
      return false;
    }

    // Check if already cached
    const cached = this.getCachedPronunciation(word);
    if (cached) {
      return true;
    }

    try {
      // Get OpenAI TTS audio
      const ttsResponse = await firstValueFrom(this.openaiService.generateGermanPronunciation(word));
      
      // Convert blob to base64 for caching
      const audioBase64 = await this.blobToBase64(ttsResponse.audioBlob);
      
      // Cache the audio data
      this.cachePronunciation(word, audioBase64);
      
      // Clean up the blob URL
      URL.revokeObjectURL(ttsResponse.audioUrl);
      
      return true;
    } catch (error) {
      console.warn('Failed to preload pronunciation for', word, ':', error);
      return false;
    }
  }

  /**
   * Preload pronunciations for multiple words
   */
  async preloadPronunciations(words: string[]): Promise<{ loaded: number; failed: number }> {
    let loaded = 0;
    let failed = 0;

    // Filter out already cached words
    const wordsToLoad = words.filter(word => !this.isPronunciationCached(word));
    
    if (wordsToLoad.length === 0) {
      console.log('All requested words are already cached');
      return { loaded: words.length, failed: 0 };
    }

    console.log(`Preloading ${wordsToLoad.length} pronunciations...`);

    // Process words in small batches to avoid overwhelming the API
    const batchSize = 2; // Reduced batch size to be more conservative with API calls
    for (let i = 0; i < wordsToLoad.length; i += batchSize) {
      const batch = wordsToLoad.slice(i, i + batchSize);
      const promises = batch.map(word => this.preloadPronunciation(word));
      
      const results = await Promise.allSettled(promises);
      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          loaded++;
        } else {
          failed++;
        }
      });

      // Delay between batches to respect API rate limits
      if (i + batchSize < wordsToLoad.length) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      }
    }

    console.log(`Preloading complete: ${loaded} loaded, ${failed} failed`);
    return { loaded, failed };
  }

  /**
   * Preload pronunciations for the most commonly used words from a word list
   */
  async preloadCommonWords(allWords: any[], count: number = 20): Promise<{ loaded: number; failed: number }> {
    // Extract the first N words (assumes they're ordered by frequency/importance)
    const commonWords = allWords.slice(0, count).map(w => w.word);
    return this.preloadPronunciations(commonWords);
  }

  /**
   * Check if a word's pronunciation is cached
   */
  isPronunciationCached(word: string): boolean {
    return this.cache.has(word.toLowerCase());
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
  getCacheStats(): { 
    size: number; 
    totalSizeKB: number; 
    totalAccesses: number;
    mostUsedWord?: string;
    maxCacheSize: number;
  } {
    const data = Array.from(this.cache.values());
    const totalSize = data.reduce((sum, entry) => sum + entry.audioData.length, 0);
    const totalAccesses = data.reduce((sum, entry) => sum + entry.accessCount, 0);
    
    let mostUsedWord: string | undefined;
    let maxAccesses = 0;
    data.forEach(entry => {
      if (entry.accessCount > maxAccesses) {
        maxAccesses = entry.accessCount;
        mostUsedWord = entry.word;
      }
    });
    
    return {
      size: data.length,
      totalSizeKB: Math.round(totalSize / 1024),
      totalAccesses,
      mostUsedWord,
      maxCacheSize: this.MAX_CACHE_SIZE
    };
  }
}
