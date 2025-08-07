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
  private currentWordIndex = 0;
  private shuffledWords: Word[] = [];
  private bookmarkedWords: Set<string> = new Set();

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
      this.loadBookmarkedWords()
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
   * Check if a word is bookmarked
   */
  isWordBookmarked(wordText: string): boolean {
    return this.bookmarkedWords.has(wordText);
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
    
    // Set bookmark status for all words
    allWords.forEach(word => {
      word.bookmarked = this.bookmarkedWords.has(word.word);
    });
    
    this.shuffledWords = [...allWords];
    this.shuffle();
    
    // Set the first word as current
    if (this.shuffledWords.length > 0) {
      this.currentWordSubject.next(this.shuffledWords[0]);
      this.currentWordIndex = 0;
    }
  }

  /**
   * Shuffle the words array using Fisher-Yates algorithm
   */
  shuffle(): void {
    const customWords = this.dictionaryService.getCustomWords();
    const allWords = [...this.words, ...customWords];
    
    // Set bookmark status for all words
    allWords.forEach(word => {
      word.bookmarked = this.bookmarkedWords.has(word.word);
    });
    
    for (let i = allWords.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allWords[i], allWords[j]] = [allWords[j], allWords[i]];
    }
    
    this.shuffledWords = allWords;
    this.currentWordIndex = 0;
    
    // Update current word after shuffle
    if (this.shuffledWords.length > 0) {
      this.currentWordSubject.next(this.shuffledWords[0]);
    }
    
    console.log('Words shuffled');
  }

  /**
   * Get the next word in the shuffled list
   */
  getNextWord(): Word | null {
    if (this.shuffledWords.length === 0) {
      console.warn('No words available');
      return null;
    }

    // Move to next word
    this.currentWordIndex = (this.currentWordIndex + 1) % this.shuffledWords.length;
    const nextWord = this.shuffledWords[this.currentWordIndex];
    
    // Update the BehaviorSubject
    this.currentWordSubject.next(nextWord);
    
    return nextWord;
  }

  /**
   * Get the current word without advancing
   */
  getCurrentWord(): Word | null {
    if (this.shuffledWords.length === 0) {
      return null;
    }
    return this.shuffledWords[this.currentWordIndex];
  }

  /**
   * Reset progress to the beginning of the shuffled list
   */
  resetProgress(): void {
    this.currentWordIndex = 0;
    
    if (this.shuffledWords.length > 0) {
      this.currentWordSubject.next(this.shuffledWords[0]);
    }
    
    console.log('Progress reset to beginning');
  }

  /**
   * Get all words (original order) with bookmark status
   */
  getAllWords(): Word[] {
    const wordsWithBookmarks = [...this.words];
    wordsWithBookmarks.forEach(word => {
      word.bookmarked = this.bookmarkedWords.has(word.word);
    });
    return wordsWithBookmarks;
  }

  /**
   * Get shuffled words in current order
   */
  getShuffledWords(): Word[] {
    return [...this.shuffledWords];
  }

  /**
   * Get current progress (current word index out of total)
   */
  getProgress(): { current: number; total: number } {
    return {
      current: this.currentWordIndex + 1,
      total: this.shuffledWords.length
    };
  }

  /**
   * Check if there are more words after current one
   */
  hasNext(): boolean {
    return this.shuffledWords.length > 0 && 
           this.currentWordIndex < this.shuffledWords.length - 1;
  }

  /**
   * Check if we're at the beginning
   */
  isAtBeginning(): boolean {
    return this.currentWordIndex === 0;
  }

  /**
   * Get total number of words (including custom words)
   */
  getTotalWordsCount(): number {
    const customWords = this.dictionaryService.getCustomWords();
    return this.words.length + customWords.length;
  }

  /**
   * Get total number of original words only
   */
  getOriginalWordsCount(): number {
    return this.words.length;
  }

  /**
   * Reload words from the JSON file
   */
  async reloadWords(): Promise<void> {
    this.wordsLoadedSubject.next(false);
    await this.loadWords();
  }
}
