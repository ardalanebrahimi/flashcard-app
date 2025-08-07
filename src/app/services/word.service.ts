import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, firstValueFrom, combineLatest } from 'rxjs';
import { Preferences } from '@capacitor/preferences';
import { Word } from '../models/word.model';
import { DictionaryService } from './dictionary.service';

@Injectable({
  providedIn: 'root'
})
export class WordService {
  private words: Word[] = [];
  private shuffledWords: Word[] = [];
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
    private dictionaryService: DictionaryService
  ) {
    this.initializeService();
  }

  /**
   * Initialize service by loading all data
   */
  private async initializeService(): Promise<void> {
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
    const allWords = [...this.words, ...this.dictionaryService.getCustomWords()];
    return allWords.filter(word => this.bookmarkedWords.has(word.word));
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
      this.updateShuffledWords();
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
      this.updateShuffledWords();
    });
  }

  /**
   * Update shuffled words with both original and custom words
   */
  private updateShuffledWords(): void {
    const customWords = this.dictionaryService.getCustomWords();
    const allWords = [...this.words, ...customWords];
    
    // Set bookmark status and load results for all words
    allWords.forEach(word => {
      word.bookmarked = this.bookmarkedWords.has(word.word);
      word.lastResults = this.wordResults.get(word.word) || [];
    });
    
    this.shuffledWords = [...allWords];
    this.shuffle();
    
    // Set the first word as current
    if (this.shuffledWords.length > 0) {
      this.currentWordSubject.next(this.shuffledWords[0]);
    }
  }

  /**
   * Shuffle the words array using Fisher-Yates algorithm
   */
  shuffle(): void {
    const customWords = this.dictionaryService.getCustomWords();
    const allWords = [...this.words, ...customWords];
    
    // Set bookmark status and load results for all words
    allWords.forEach(word => {
      word.bookmarked = this.bookmarkedWords.has(word.word);
      word.lastResults = this.wordResults.get(word.word) || [];
    });
    
    for (let i = allWords.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allWords[i], allWords[j]] = [allWords[j], allWords[i]];
    }
    
    this.shuffledWords = allWords;
    
    // Update current word after shuffle
    if (this.shuffledWords.length > 0) {
      this.currentWordSubject.next(this.shuffledWords[0]);
    }
    
    console.log('Words shuffled');
  }

  /**
   * Get all words (original order) with bookmark status
   */
  getAllWords(): Word[] {
    const wordsWithBookmarks = [...this.words];
    wordsWithBookmarks.forEach(word => {
      word.bookmarked = this.bookmarkedWords.has(word.word);
      word.lastResults = this.wordResults.get(word.word) || [];
    });
    return wordsWithBookmarks;
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
    
    // Update the word object
    word.lastResults = currentResults;
    
    // Save to persistent storage
    await this.saveWordResults();
    
    console.log(`Updated results for "${word.word}": ${currentResults.join(', ')}`);
  }

  /**
   * Calculate score for a word based on last 3 results
   */
  calculateScore(word: Word): number {
    // Get the most up-to-date results
    const results = this.wordResults.get(word.word) || word.lastResults || [];
    
    if (results.length === 0) {
      return 0;
    }
    
    // Count how many of the last 3 entries are "correct"
    const correctCount = results.filter(result => result === "correct").length;
    return correctCount;
  }

  /**
   * Get next word using weighted selection based on score
   * - Filters out words with score of 3 (fully learned)
   * - Uses weighted pool: Score 0 → 5x weight, Score 1 → 3x, Score 2 → 1x
   * - Randomly selects from weighted pool
   */
  getNextWord(): Word | null {
    // Get all available words (original + custom)
    const customWords = this.dictionaryService.getCustomWords();
    const allWords = [...this.words, ...customWords];
    
    // Ensure all words have their results loaded
    allWords.forEach(word => {
      word.bookmarked = this.bookmarkedWords.has(word.word);
      word.lastResults = this.wordResults.get(word.word) || [];
    });
    
    // Filter out words with score of 3 (fully learned)
    const eligibleWords = allWords.filter(word => this.calculateScore(word) < 3);
    
    if (eligibleWords.length === 0) {
      console.log('No eligible words found (all words have score 3)');
      return null;
    }
    
    // Build weighted pool based on score
    const weightedPool: Word[] = [];
    
    eligibleWords.forEach(word => {
      const score = this.calculateScore(word);
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
    
    console.log(`Selected word: "${selectedWord.word}" (score: ${this.calculateScore(selectedWord)})`);
    return selectedWord;
  }

  /**
   * Get all words with their scores (for analytics/sorting)
   */
  getAllWordsWithScores(): Array<Word & { score: number }> {
    const allWords = this.getAllWords();
    const customWords = this.dictionaryService.getCustomWords();
    const combined = [...allWords, ...customWords];
    
    return combined.map(word => ({
      ...word,
      score: this.calculateScore(word)
    }));
  }

  /**
   * Clear all word results
   */
  async clearAllWordResults(): Promise<void> {
    this.wordResults.clear();
    await this.saveWordResults();
    
    // Update all current words
    this.shuffledWords.forEach(word => {
      word.lastResults = [];
    });
    
    console.log('All word results cleared');
  }

}
