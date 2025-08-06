import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, firstValueFrom } from 'rxjs';
import { Word } from '../models/word.model';
import { OpenaiService, TranslationResponse } from './openai.service';

@Injectable({
  providedIn: 'root'
})
export class DictionaryService {
  private readonly STORAGE_KEY = 'german-flashcard-custom-words';
  private customWords: Word[] = [];
  private customWordsSubject = new BehaviorSubject<Word[]>([]);

  public customWords$ = this.customWordsSubject.asObservable();

  constructor(private openaiService: OpenaiService) {
    this.loadCustomWords();
  }

  /**
   * Load custom words from localStorage
   */
  private loadCustomWords(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.customWords = JSON.parse(stored);
        this.customWordsSubject.next([...this.customWords]);
      }
    } catch (error) {
      console.error('Error loading custom words from localStorage:', error);
      this.customWords = [];
    }
  }

  /**
   * Save custom words to localStorage
   */
  private saveCustomWords(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.customWords));
      this.customWordsSubject.next([...this.customWords]);
    } catch (error) {
      console.error('Error saving custom words to localStorage:', error);
    }
  }

  /**
   * Search for a word in the existing dictionary (from assets)
   */
  searchExistingWord(searchTerm: string, existingWords: Word[]): Word | null {
    const normalizedSearch = searchTerm.toLowerCase().trim();
    
    return existingWords.find(word => 
      word.word.toLowerCase() === normalizedSearch ||
      word.word.toLowerCase().includes(normalizedSearch)
    ) || null;
  }

  /**
   * Search for a word in custom dictionary
   */
  searchCustomWord(searchTerm: string): Word | null {
    const normalizedSearch = searchTerm.toLowerCase().trim();
    
    return this.customWords.find(word => 
      word.word.toLowerCase() === normalizedSearch ||
      word.word.toLowerCase().includes(normalizedSearch)
    ) || null;
  }

  /**
   * Add a new word to the custom dictionary
   */
  async addNewWord(germanWord: string): Promise<{ success: boolean; word?: Word; error?: string }> {
    try {
      const cleanWord = germanWord.trim();
      
      if (!cleanWord) {
        return { success: false, error: 'Word cannot be empty' };
      }

      // Check if word already exists in custom dictionary
      const existingCustom = this.searchCustomWord(cleanWord);
      if (existingCustom) {
        return { success: false, error: 'Word already exists in your custom dictionary' };
      }

      // Translate using OpenAI
      const translationResponse = await firstValueFrom(
        this.openaiService.translateGermanWord(cleanWord)
      );
      
      if (!translationResponse || !translationResponse.translation) {
        return { success: false, error: 'Failed to get translation' };
      }

      // Create the word object
      let translationText = translationResponse.translation;
      
      // Add example if available
      if (translationResponse.example) {
        translationText += ` (e.g., ${translationResponse.example})`;
      }

      const newWord: Word = {
        word: cleanWord,
        translation: translationText
      };

      // Add to custom words
      this.customWords.push(newWord);
      this.saveCustomWords();

      return { success: true, word: newWord };

    } catch (error) {
      console.error('Error adding new word:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to add word' 
      };
    }
  }

  /**
   * Get all custom words
   */
  getCustomWords(): Word[] {
    return [...this.customWords];
  }

  /**
   * Remove a custom word
   */
  removeCustomWord(word: string): boolean {
    const index = this.customWords.findIndex(w => w.word === word);
    if (index !== -1) {
      this.customWords.splice(index, 1);
      this.saveCustomWords();
      return true;
    }
    return false;
  }

  /**
   * Clear all custom words
   */
  clearCustomWords(): void {
    this.customWords = [];
    localStorage.removeItem(this.STORAGE_KEY);
    this.customWordsSubject.next([]);
  }

  /**
   * Get total count of custom words
   */
  getCustomWordsCount(): number {
    return this.customWords.length;
  }
}
