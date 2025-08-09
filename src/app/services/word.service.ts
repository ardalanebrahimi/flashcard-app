import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, firstValueFrom, combineLatest } from 'rxjs';
import { Preferences } from '@capacitor/preferences';
import { Word } from '../models/word.model';
import { DictionaryService } from './dictionary.service';
import { PronunciationService } from './pronunciation.service';

@Injectable({
  providedIn: 'root'
})
export class WordService {
  private words: Word[] = [];
  public allWords: Word[] = [];
  private bookmarkedWords: Set<string> = new Set();
  private wordResults: Map<string, ("correct" | "wrong")[]> = new Map();

  // BehaviorSubject to notify components of the current word
  private currentWordSubject = new BehaviorSubject<Word | null>(null);
  public currentWord$ = this.currentWordSubject.asObservable();

  // BehaviorSubject to track if words are loaded
  private wordsLoadedSubject = new BehaviorSubject<boolean>(false);
  public wordsLoaded$ = this.wordsLoadedSubject.asObservable();

  // BehaviorSubject for bookmarked words changes
  private bookmarkedWordsSubject = new BehaviorSubject<Set<string>>(new Set());
  public bookmarkedWords$ = this.bookmarkedWordsSubject.asObservable();

  // BehaviorSubject to track if bookmarks are loaded
  private bookmarksLoadedSubject = new BehaviorSubject<boolean>(false);
  public bookmarksLoaded$ = this.bookmarksLoadedSubject.asObservable();

  constructor(
    private http: HttpClient,
    private dictionaryService: DictionaryService,
    private pronunciationService: PronunciationService
  ) {
    this.initializeService();
  }

  /**
   * Initialize service by loading all data
   */
  private async initializeService(): Promise<void> {
    // Wait for dictionary service to be ready
    await firstValueFrom(this.dictionaryService.customWords$);
    
    await Promise.all([
      this.loadWords(),
      this.loadBookmarkedWords(),
      this.loadWordResults()
    ]);
    this.setupCustomWordsListener();
  }

  /**
   * Load bookmarked words from storage
   */
  private async loadBookmarkedWords(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: 'bookmarked-words' });
      if (value) {
        const bookmarkedArray = JSON.parse(value) as string[];
        this.bookmarkedWords = new Set(bookmarkedArray);
      }
      this.bookmarkedWordsSubject.next(this.bookmarkedWords);
      this.bookmarksLoadedSubject.next(true);
    } catch (error) {
      console.error('Error loading bookmarked words:', error);
      this.bookmarksLoadedSubject.next(true); // Mark as loaded even if there's an error
    }
  }

  /**
   * Load word results from storage
   */
  private async loadWordResults(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: 'word-results' });
      if (value) {
        const resultsData = JSON.parse(value) as Record<string, ("correct" | "wrong")[]>;
        this.wordResults = new Map(Object.entries(resultsData));
      }
      console.log(`Loaded results for ${this.wordResults.size} words`);
    } catch (error) {
      console.error('Error loading word results:', error);
    }
  }

  /**
   * Save bookmarked words to storage
   */
  private async saveBookmarkedWords(): Promise<void> {
    try {
      const bookmarkedArray = Array.from(this.bookmarkedWords);
      await Preferences.set({
        key: 'bookmarked-words',
        value: JSON.stringify(bookmarkedArray)
      });
    } catch (error) {
      console.error('Error saving bookmarked words:', error);
    }
  }

  /**
   * Save word results to storage
   */
  private async saveWordResults(): Promise<void> {
    try {
      const resultsObject = Object.fromEntries(this.wordResults);
      await Preferences.set({
        key: 'word-results',
        value: JSON.stringify(resultsObject)
      });
    } catch (error) {
      console.error('Error saving word results:', error);
    }
  }

  /**
   * Toggle bookmark status for a word
   */
  async toggleBookmark(word: Word): Promise<void> {
    const wordKey = word.word;
    
    if (this.bookmarkedWords.has(wordKey)) {
      this.bookmarkedWords.delete(wordKey);
      word.bookmarked = false;
    } else {
      this.bookmarkedWords.add(wordKey);
      word.bookmarked = true;
    }
    
    this.bookmarkedWordsSubject.next(this.bookmarkedWords);
    await this.saveBookmarkedWords();
  }

  /**
   * Get all bookmarked words
   */
  getBookmarkedWords(): Word[] {
    return this.allWords.filter(word => this.bookmarkedWords.has(word.word));
  }

  /**
   * Get the count of bookmarked words
   */
  getBookmarkedWordsCount(): number {
    return this.bookmarkedWords.size;
  }

  /**
   * Clear all bookmarked words
   */
  async clearAllBookmarks(): Promise<void> {
    this.bookmarkedWords.clear();
    this.bookmarkedWordsSubject.next(this.bookmarkedWords);
    await this.saveBookmarkedWords();
  }

  /**
   * Load words from the assets/words.json file
   */
  private async loadWords(): Promise<void> {
    try {
      const words = await firstValueFrom(
        this.http.get<Word[]>('/assets/words.json')
      );
      
      this.words = words;
      this.refreshAllWords();
      this.wordsLoadedSubject.next(true);
      
      console.log(`Loaded ${this.words.length} words from assets/words.json`);
    } catch (error) {
      console.error('Error loading words:', error);
      this.wordsLoadedSubject.next(false);
    }
  }

  /**
   * Setup listener for custom words changes
   */
  private setupCustomWordsListener(): void {
    this.dictionaryService.customWords$.subscribe(() => {
      this.refreshAllWords();
    });
  }

  /**
   * Refresh all words with current bookmark status and last results
   */
  refreshAllWords() {
    // Create a map of custom words for quick lookup
    const customWordsMap = new Map<string, Word>();
    const customWords = this.dictionaryService.getCustomWords();
    
    customWords.forEach(word => {
      customWordsMap.set(word.word, word);
    });

    // Start with dictionary words, but override with custom words if they exist
    const mergedWords = new Map<string, Word>();
    
    // Add all dictionary words first
    this.words.forEach(word => {
      mergedWords.set(word.word, { ...word });
    });
    
    // Override with custom words (including improved translations)
    customWordsMap.forEach((customWord, wordKey) => {
      mergedWords.set(wordKey, { ...customWord });
    });
    
    // Convert back to array
    this.allWords = Array.from(mergedWords.values());
    
    // Apply bookmark status, results, and scores
    this.allWords.forEach(word => {
      word.bookmarked = this.bookmarkedWords.has(word.word);
      word.lastResults = this.wordResults.get(word.word) || [];
      
      // Initialize cached score if not present
      if (word.score === undefined) {
        word.score = this.calculateScoreFromResults(word.lastResults);
      }
    });
  }

  /**
   * Update results for a word and save progress
   */
  async updateResults(word: Word, result: "correct" | "wrong"): Promise<void> {
    // Get current results from storage or initialize
    let currentResults = this.wordResults.get(word.word) || [];
    
    // Push the new result
    currentResults.push(result);
    
    // Keep only the last 3 entries
    if (currentResults.length > 3) {
      currentResults = currentResults.slice(-3);
    }
    
    // Update in memory storage
    this.wordResults.set(word.word, currentResults);
    
    // Save to persistent storage
    await this.saveWordResults();
    
    this.refreshAllWords();
    console.log(`Updated results for "${word.word}": ${currentResults.join(', ')}, score: ${word.score}`);
  }

  /**
   * Calculate score from results array (internal method)
   */
  private calculateScoreFromResults(results: ("correct" | "wrong")[]): number {
    if (results.length === 0) {
      return 0;
    }
    
    // Count how many of the last 3 entries are "correct"
    const correctCount = results.filter(result => result === "correct").length;
    return correctCount;
  }

  /**
   * Calculate score for a word based on cached score or last 3 results
   */
  calculateScore(word: Word): number {
    // Use cached score if available
    if (word.score !== undefined) {
      return word.score;
    }
    
    // Fallback to calculation from results for backwards compatibility
    const results = this.wordResults.get(word.word) || word.lastResults || [];
    const calculatedScore = this.calculateScoreFromResults(results);
    
    // Cache the calculated score
    word.score = calculatedScore;
    
    return calculatedScore;
  }

  /**
   * Get next word using weighted selection based on score
   * - Filters out words with score of 3 (fully learned)
   * - Uses weighted pool: Score 0 → 5x weight, Score 1 → 3x, Score 2 → 1x
   * - Randomly selects from weighted pool
   */
  getNextWord(): Word | null {    
    // Filter out words with score of 3 (fully learned)
    const eligibleWords = this.allWords.filter(word => (word.score || 0) < 3);

    if (eligibleWords.length === 0) {
      console.log('No eligible words found (all words have score 3)');
      return null;
    }
    
    // Build weighted pool based on score
    const weightedPool: Word[] = [];
    
    eligibleWords.forEach(word => {
      const score = word.score || 0;
      let weight = 0;
      
      if (score === 0) weight = 5;      // New/struggling words get highest priority
      else if (score === 1) weight = 3; // Partially learned words get medium priority  
      else if (score === 2) weight = 1; // Nearly learned words get lowest priority
      
      // Add word to pool multiple times based on weight
      for (let i = 0; i < weight; i++) {
        weightedPool.push(word);
      }
    });
    
    if (weightedPool.length === 0) {
      console.log('No words in weighted pool');
      return eligibleWords[0]; // Fallback to first eligible word
    }
    
    // Randomly select from weighted pool
    const selectedWord = weightedPool[Math.floor(Math.random() * weightedPool.length)];
    
    console.log(`Selected word: "${selectedWord.word}" (score: ${selectedWord.score})`);
    return selectedWord;
  }

  /**
   * Get count of learned words (score = 3)
   */
  getLearnedWordsCount(): number {
    return this.allWords.filter(word => (word.score || 0) === 3).length;
  }

  /**
   * Get count of studied words (score > 0)
   */
  getStudiedWordsCount(): number {
    return this.wordResults.size;
  }

  /**
   * Get count of studied words (score > 0)
   */
  getOverallProgress(): number {
      const maxScore = this.allWords.length * 3;
      const currentScore = Array.from(this.allWords).reduce((sum, word) => sum + (word.score || 0), 0);
      return maxScore > 0 ? Math.round((currentScore / maxScore) * 100) : 0;
  }

  /**
   * Get percentage of learned words
   */
  getLearnedPercentage(): number {
    if (this.allWords.length === 0) return 0;
    return Math.round((this.getLearnedWordsCount() / this.allWords.length) * 100);
  }

  /**
   * Get percentage of studied words
   */
  getStudiedPercentage(): number {
    if (this.allWords.length === 0) return 0;
    return Math.round((this.getStudiedWordsCount() / this.allWords.length) * 100);
  }

  /**
   * Get learned words (score = 3)
   */
  getLearnedWords(): Word[] {
    return this.allWords.filter(word => (word.score || 0) === 3);
  }

  /**
   * Get studied words (score > 0)
   */
  getStudiedWords(): Word[] {
    return this.allWords.filter(word => (word.score || 0) > 0);
  }

  /**
   * Improve translation for a word
   */
  async improveTranslation(word: Word): Promise<{ success: boolean; improvedWord?: Word; error?: string }> {
    const result = await this.dictionaryService.improveTranslation(word);
    
    if (result.success) {
      // Refresh all words to include the improved translation
      this.refreshAllWords();
      
      // Emit change to notify subscribers
      this.wordsLoadedSubject.next(true);
    }
    
    return result;
  }

  /**
   * Calculate and cache scores for all words that have results but no cached score
   * This is a temporary method to migrate existing data
   */
  async calculateScoresForAllWords(): Promise<void> {
    console.log('Starting score calculation for all words...');
    
    let updatedCount = 0;
    
    // Process each word
    this.allWords.forEach(word => {
      word.score = this.calculateScoreFromResults(word.lastResults??[])
    });
  
    
    console.log(`Score calculation complete. Updated ${updatedCount} words.`);
    
    // Force save to ensure scores are persisted
    await this.saveWordResults();
  }

  /**
   * Preload pronunciations for commonly used words
   */
  async preloadCommonPronunciations(count: number = 20): Promise<{ loaded: number; failed: number }> {
    if (this.allWords.length === 0) {
      console.warn('No words loaded, cannot preload pronunciations');
      return { loaded: 0, failed: 0 };
    }

    // Get the first N words (assumed to be ordered by frequency/importance)
    const result = await this.pronunciationService.preloadCommonWords(this.allWords, count);
    console.log(`Pronunciation preloading result: ${result.loaded} loaded, ${result.failed} failed`);
    return result;
  }

  /**
   * Preload pronunciations for bookmarked words
   */
  async preloadBookmarkedPronunciations(): Promise<{ loaded: number; failed: number }> {
    const bookmarkedWords = this.getBookmarkedWords();
    if (bookmarkedWords.length === 0) {
      return { loaded: 0, failed: 0 };
    }

    const wordStrings = bookmarkedWords.map(w => w.word);
    const result = await this.pronunciationService.preloadPronunciations(wordStrings);
    console.log(`Bookmarked pronunciations preloading result: ${result.loaded} loaded, ${result.failed} failed`);
    return result;
  }

  /**
   * Preload pronunciations for low-scoring words (need more practice)
   */
  async preloadPracticePronunciations(count: number = 15): Promise<{ loaded: number; failed: number }> {
    // Get words with low scores (0-1) as they need more practice
    const practiceWords = this.allWords
      .filter(word => (word.score || 0) <= 1)
      .slice(0, count)
      .map(w => w.word);

    if (practiceWords.length === 0) {
      return { loaded: 0, failed: 0 };
    }

    const result = await this.pronunciationService.preloadPronunciations(practiceWords);
    console.log(`Practice pronunciations preloading result: ${result.loaded} loaded, ${result.failed} failed`);
    return result;
  }

  /**
   * Check if a word's pronunciation is cached
   */
  isPronunciationCached(word: string): boolean {
    return this.pronunciationService.isPronunciationCached(word);
  }

  /**
   * Get pronunciation cache statistics
   */
  getPronunciationCacheStats(): { 
    size: number; 
    totalSizeKB: number; 
    totalAccesses: number;
    mostUsedWord?: string;
    maxCacheSize: number;
  } {
    return this.pronunciationService.getCacheStats();
  }

}
