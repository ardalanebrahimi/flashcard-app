import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { BehaviorSubject } from 'rxjs';
import { WordProgress, WordStatistics, WordFilters } from '../models/word-progress.model';
import { Word } from '../models/word.model';

@Injectable({
  providedIn: 'root'
})
export class WordTrackingService {
  private readonly WORD_PROGRESS_KEY = 'word_progress_v2';
  private wordProgressMap: Map<string, WordProgress> = new Map();
  
  // Observable for components to subscribe to progress changes
  private wordProgressSubject = new BehaviorSubject<WordProgress[]>([]);
  public wordProgress$ = this.wordProgressSubject.asObservable();

  constructor() {
    this.loadWordProgress();
  }

  /**
   * Load word progress from storage
   */
  async loadWordProgress(): Promise<void> {
    try {
      const result = await Preferences.get({ key: this.WORD_PROGRESS_KEY });
      if (result.value) {
        const progressArray = JSON.parse(result.value);
        this.wordProgressMap.clear();
        
        progressArray.forEach((progress: any) => {
          const wordProgress: WordProgress = {
            ...progress,
            lastStudied: progress.lastStudied ? new Date(progress.lastStudied) : undefined,
            firstStudied: progress.firstStudied ? new Date(progress.firstStudied) : undefined,
            masteredDate: progress.masteredDate ? new Date(progress.masteredDate) : undefined
          };
          this.wordProgressMap.set(progress.word, wordProgress);
        });
        
        this.emitProgressUpdate();
        console.log(`Loaded progress for ${this.wordProgressMap.size} words`);
      }
    } catch (error) {
      console.error('Error loading word progress:', error);
    }
  }

  /**
   * Save word progress to storage
   */
  private async saveWordProgress(): Promise<void> {
    try {
      const progressArray = Array.from(this.wordProgressMap.values());
      await Preferences.set({
        key: this.WORD_PROGRESS_KEY,
        value: JSON.stringify(progressArray)
      });
      this.emitProgressUpdate();
    } catch (error) {
      console.error('Error saving word progress:', error);
    }
  }

  /**
   * Initialize or get word progress
   */
  private getOrCreateWordProgress(word: Word, source: 'dictionary' | 'custom'): WordProgress {
    let progress = this.wordProgressMap.get(word.word);
    
    if (!progress) {
      progress = {
        word: word.word,
        translation: word.translation,
        source,
        status: 'new',
        practiceCount: 0,
        correctCount: 0,
        wrongCount: 0,
        firstStudied: new Date()
      };
      this.wordProgressMap.set(word.word, progress);
    }
    
    return progress;
  }

  /**
   * Record a practice session for a word
   */
  async recordPractice(word: Word, isCorrect: boolean, source: 'dictionary' | 'custom'): Promise<void> {
    const progress = this.getOrCreateWordProgress(word, source);
    
    progress.practiceCount++;
    progress.lastStudied = new Date();
    
    if (isCorrect) {
      progress.correctCount++;
    } else {
      progress.wrongCount++;
    }
    
    // Update status based on performance
    this.updateWordStatus(progress);
    
    await this.saveWordProgress();
  }

  /**
   * Update word status based on performance
   */
  private updateWordStatus(progress: WordProgress): void {
    const accuracy = progress.practiceCount > 0 ? progress.correctCount / progress.practiceCount : 0;
    
    if (progress.status === 'new' && progress.practiceCount > 0) {
      progress.status = 'learning';
    }
    
    // Consider word mastered if practiced at least 5 times with 80% accuracy
    if (progress.practiceCount >= 5 && accuracy >= 0.8 && progress.status !== 'mastered') {
      progress.status = 'mastered';
      progress.masteredDate = new Date();
    }
    
    // If accuracy drops below 60% for mastered words, move back to learning
    if (progress.status === 'mastered' && accuracy < 0.6) {
      progress.status = 'learning';
      progress.masteredDate = undefined;
    }
  }

  /**
   * Get progress for a specific word
   */
  getWordProgress(word: string): WordProgress | undefined {
    return this.wordProgressMap.get(word);
  }

  /**
   * Get all word progress
   */
  getAllWordProgress(): WordProgress[] {
    return Array.from(this.wordProgressMap.values());
  }

  /**
   * Get filtered and sorted word progress
   */
  getFilteredWordProgress(filters: WordFilters): WordProgress[] {
    let words = this.getAllWordProgress();
    
    // Apply status filter
    if (filters.status !== 'all') {
      words = words.filter(word => word.status === filters.status);
    }
    
    // Apply source filter
    if (filters.source !== 'all') {
      words = words.filter(word => word.source === filters.source);
    }
    
    // Apply search filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      words = words.filter(word => 
        word.word.toLowerCase().includes(searchLower) ||
        word.translation.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply sorting
    words = this.sortWords(words, filters.sortBy, filters.sortDirection);
    
    return words;
  }

  /**
   * Sort words based on criteria
   */
  private sortWords(words: WordProgress[], sortBy: string, direction: 'asc' | 'desc'): WordProgress[] {
    return words.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'alphabetical':
          comparison = a.word.localeCompare(b.word);
          break;
        case 'lastStudied':
          const aDate = a.lastStudied?.getTime() || 0;
          const bDate = b.lastStudied?.getTime() || 0;
          comparison = aDate - bDate;
          break;
        case 'practiceCount':
          comparison = a.practiceCount - b.practiceCount;
          break;
        case 'accuracy':
          const aAccuracy = a.practiceCount > 0 ? a.correctCount / a.practiceCount : 0;
          const bAccuracy = b.practiceCount > 0 ? b.correctCount / b.practiceCount : 0;
          comparison = aAccuracy - bAccuracy;
          break;
        case 'dateAdded':
          const aFirstStudied = a.firstStudied?.getTime() || 0;
          const bFirstStudied = b.firstStudied?.getTime() || 0;
          comparison = aFirstStudied - bFirstStudied;
          break;
        default:
          comparison = a.word.localeCompare(b.word);
      }
      
      return direction === 'desc' ? -comparison : comparison;
    });
  }

  /**
   * Get word statistics
   */
  getWordStatistics(): WordStatistics {
    const allWords = this.getAllWordProgress();
    
    const stats: WordStatistics = {
      totalWords: allWords.length,
      newWords: allWords.filter(w => w.status === 'new').length,
      learningWords: allWords.filter(w => w.status === 'learning').length,
      masteredWords: allWords.filter(w => w.status === 'mastered').length,
      totalPractices: allWords.reduce((sum, w) => sum + w.practiceCount, 0),
      overallAccuracy: 0,
      dictionaryWords: allWords.filter(w => w.source === 'dictionary').length,
      customWords: allWords.filter(w => w.source === 'custom').length
    };
    
    const totalCorrect = allWords.reduce((sum, w) => sum + w.correctCount, 0);
    const totalAnswers = allWords.reduce((sum, w) => sum + w.practiceCount, 0);
    stats.overallAccuracy = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0;
    
    return stats;
  }

  /**
   * Reset progress for a specific word
   */
  async resetWordProgress(word: string): Promise<void> {
    if (this.wordProgressMap.has(word)) {
      this.wordProgressMap.delete(word);
      await this.saveWordProgress();
    }
  }

  /**
   * Reset all progress
   */
  async resetAllProgress(): Promise<void> {
    this.wordProgressMap.clear();
    await this.saveWordProgress();
  }

  /**
   * Emit progress update to subscribers
   */
  private emitProgressUpdate(): void {
    this.wordProgressSubject.next(this.getAllWordProgress());
  }

  /**
   * Import word progress from external source
   */
  async importProgress(progressData: WordProgress[]): Promise<void> {
    try {
      this.wordProgressMap.clear();
      
      progressData.forEach(progress => {
        this.wordProgressMap.set(progress.word, progress);
      });
      
      await this.saveWordProgress();
      console.log(`Imported progress for ${progressData.length} words`);
    } catch (error) {
      console.error('Error importing word progress:', error);
      throw error;
    }
  }

  /**
   * Export word progress for backup
   */
  exportProgress(): WordProgress[] {
    return this.getAllWordProgress();
  }
}
