import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { Word } from '../models/word.model';

@Injectable({
  providedIn: 'root'
})
export class WordService {
  private words: Word[] = [];
  private currentWordIndex = 0;
  private shuffledWords: Word[] = [];

  // BehaviorSubject to notify components of the current word
  private currentWordSubject = new BehaviorSubject<Word | null>(null);
  public currentWord$ = this.currentWordSubject.asObservable();

  // BehaviorSubject to track if words are loaded
  private wordsLoadedSubject = new BehaviorSubject<boolean>(false);
  public wordsLoaded$ = this.wordsLoadedSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadWords();
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
      this.shuffledWords = [...words];
      this.shuffle();
      this.wordsLoadedSubject.next(true);
      
      // Set the first word as current
      if (this.shuffledWords.length > 0) {
        this.currentWordSubject.next(this.shuffledWords[0]);
        this.currentWordIndex = 0;
      }
      
      console.log(`Loaded ${this.words.length} words from assets/words.json`);
    } catch (error) {
      console.error('Error loading words:', error);
      this.wordsLoadedSubject.next(false);
    }
  }

  /**
   * Shuffle the words array using Fisher-Yates algorithm
   */
  shuffle(): void {
    const array = [...this.words];
    
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    
    this.shuffledWords = array;
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
   * Get all words (original order)
   */
  getAllWords(): Word[] {
    return [...this.words];
  }

  /**
   * Get shuffled words in current order
   */
  getShuffledWords(): Word[] {
    return [...this.shuffledWords];
  }

  /**
   * Get words filtered by lesson
   */
  getWordsByLesson(lesson: string): Word[] {
    return this.words.filter(word => word.lesson === lesson);
  }

  /**
   * Get all unique lessons
   */
  getAllLessons(): string[] {
    const lessons = this.words.map(word => word.lesson);
    return [...new Set(lessons)].sort();
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
   * Get total number of words
   */
  getTotalWordsCount(): number {
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
