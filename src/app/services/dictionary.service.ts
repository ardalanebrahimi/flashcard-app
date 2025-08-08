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
      } else {
        this.customWords = [];
      }
      this.customWordsSubject.next([...this.customWords]);
    } catch (error) {
      console.error('Error loading custom words from localStorage:', error);
      this.customWords = [];
      this.customWordsSubject.next([]);
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
   * Improve translation for an existing word
   */
  async improveTranslation(word: Word): Promise<{ success: boolean; improvedWord?: Word; error?: string }> {
    try {
      // Get improved translation using OpenAI
      const translationResponse = await firstValueFrom(
        this.openaiService.translateGermanWord(word.word)
      );
      
      if (!translationResponse || !translationResponse.translation) {
        return { success: false, error: 'Failed to get improved translation' };
      }

      // Create improved translation text
      let improvedTranslation = translationResponse.translation;
      
      // Add example if available
      if (translationResponse.example) {
        improvedTranslation += ` (e.g., ${translationResponse.example})`;
      }

      // Check if word already exists in custom words
      const existingCustomIndex = this.customWords.findIndex(w => w.word === word.word);
      
      const improvedWord: Word = {
        word: word.word,
        translation: improvedTranslation,
        isCustomTranslation: true,
        originalTranslation: word.originalTranslation || word.translation,
        bookmarked: word.bookmarked,
        lastResults: word.lastResults,
        score: word.score
      };

      if (existingCustomIndex !== -1) {
        // Replace existing custom word
        this.customWords[existingCustomIndex] = improvedWord;
      } else {
        // Add new custom word
        this.customWords.push(improvedWord);
      }

      this.saveCustomWords();
      return { success: true, improvedWord };

    } catch (error) {
      console.error('Error improving translation:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to improve translation' 
      };
    }
  }

  /**
   * Add a new word to the custom dictionary
   */
  async addNewWord(germanWord: string, existingWords?: Word[]): Promise<{ success: boolean; word?: Word; error?: string }> {
    try {
      const cleanWord = germanWord.trim();
      
      if (!cleanWord) {
        return { success: false, error: 'Word cannot be empty' };
      }

      // Check if word already exists in original dictionary (if provided)
      if (existingWords) {
        const existingInOriginal = this.searchExistingWord(cleanWord, existingWords);
        if (existingInOriginal) {
          return { success: false, error: 'Word already exists in the original dictionary' };
        }
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
