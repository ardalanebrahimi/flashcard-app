import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Preferences } from '@capacitor/preferences';

export type LanguageLevel = 'B1' | 'A2';

export interface LevelData {
  bookmarks: string[];
  results: Record<string, ("correct" | "wrong")[]>;
  customWords: any[]; // Will be handled by DictionaryService
}

@Injectable({
  providedIn: 'root'
})
export class LevelService {
  private currentLevelSubject = new BehaviorSubject<LanguageLevel>('B1');
  public currentLevel$ = this.currentLevelSubject.asObservable();

  private readonly CURRENT_LEVEL_KEY = 'current-level';
  private readonly MIGRATION_KEY = 'data-migrated-v1';

  constructor() {
    this.initializeLevel();
  }

  private async initializeLevel(): Promise<void> {
    try {
      // Check if migration is needed
      const { value: migrated } = await Preferences.get({ key: this.MIGRATION_KEY });
      
      if (!migrated) {
        await this.migrateExistingData();
        await Preferences.set({ key: this.MIGRATION_KEY, value: 'true' });
      }

      // Load current level
      const { value } = await Preferences.get({ key: this.CURRENT_LEVEL_KEY });
      if (value && (value === 'A2' || value === 'B1')) {
        this.currentLevelSubject.next(value as LanguageLevel);
      } else {
        // If no level is set, default to B1 and save it
        await this.setCurrentLevel('B1');
      }
      
      console.log(`Level service initialized with level: ${this.currentLevelSubject.value}`);
    } catch (error) {
      console.error('Error initializing level service:', error);
    }
  }

  private async migrateExistingData(): Promise<void> {
    console.log('Migrating existing data to B1 level...');
    
    try {
      // Migrate bookmarks
      const { value: bookmarks } = await Preferences.get({ key: 'bookmarked-words' });
      if (bookmarks) {
        await Preferences.set({ 
          key: 'bookmarked-words-B1', 
          value: bookmarks 
        });
        console.log('Migrated bookmarks to B1 level');
      }

      // Migrate results
      const { value: results } = await Preferences.get({ key: 'word-results' });
      if (results) {
        await Preferences.set({ 
          key: 'word-results-B1', 
          value: results 
        });
        console.log('Migrated word results to B1 level');
      }

      // Migrate custom words (will be handled by DictionaryService later)
      const { value: customWords } = await Preferences.get({ key: 'custom-words' });
      if (customWords) {
        await Preferences.set({ 
          key: 'custom-words-B1', 
          value: customWords 
        });
        console.log('Migrated custom words to B1 level');
      }

      console.log('Data migration completed successfully');
    } catch (error) {
      console.error('Error during data migration:', error);
    }
  }

  getCurrentLevel(): LanguageLevel {
    return this.currentLevelSubject.value;
  }

  async setCurrentLevel(level: LanguageLevel): Promise<void> {
    this.currentLevelSubject.next(level);
    await Preferences.set({ 
      key: this.CURRENT_LEVEL_KEY, 
      value: level 
    });
    console.log(`Switched to level: ${level}`);
  }

  getAvailableLevels(): LanguageLevel[] {
    return ['B1', 'A2'];
  }

  getLevelStorageKeys(level: LanguageLevel) {
    return {
      bookmarks: `bookmarked-words-${level}`,
      results: `word-results-${level}`,
      customWords: `custom-words-${level}`
    };
  }

  getAssetPath(level: LanguageLevel): string {
    return `/assets/words_${level}.json`;
  }

  getLevelDisplayName(level: LanguageLevel): string {
    return level; // For now, just return the level code
  }
}
