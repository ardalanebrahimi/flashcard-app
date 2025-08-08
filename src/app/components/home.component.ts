import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription, combineLatest } from 'rxjs';
import { ProgressService } from '../services/progress.service';
import { SessionService, SessionConfig } from '../services/session.service';
import { WordService } from '../services/word.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {
  sessionConfig: SessionConfig = { cardsPerSession: 20, sessionType: 'mixed' };
  showSessionSettings = false;
  bookmarkedWordsCount = 0;
  isCalculatingScores = false; // For temporary score calculation button
  
  // Pronunciation preloading status
  pronunciationPreloadStatus = {
    isPreloading: false,
    isComplete: false,
    loaded: 0,
    failed: 0,
    showDetails: false
  };
  
  private subscription = new Subscription();
  
  constructor(
    private progressService: ProgressService,
    private sessionService: SessionService,
    private wordService: WordService
  ) {}

  ngOnInit() {
    this.loadSessionConfig();
    
    // Initialize bookmark count to 0
    this.bookmarkedWordsCount = 0;
    
    // Wait for both words and bookmarks to be loaded
    this.subscription.add(
      combineLatest([
        this.wordService.wordsLoaded$,
        this.wordService.bookmarksLoaded$
      ]).subscribe(([wordsLoaded, bookmarksLoaded]: [boolean, boolean]) => {
        if (wordsLoaded && bookmarksLoaded) {
          this.updateBookmarkedWordsCount();
          // Trigger background preloading of common pronunciations
          this.startBackgroundPronunciationPreloading();
        }
      })
    );
    
    // Subscribe to bookmark changes (after initial load)
    this.subscription.add(
      this.wordService.bookmarkedWords$.subscribe(() => {
        // Only update if both words and bookmarks are already loaded
        if (this.bookmarkedWordsCount >= 0) {
          this.updateBookmarkedWordsCount();
        }
      })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  private async loadSessionConfig() {
    this.sessionConfig = this.sessionService.getSessionConfig();
  }

  private updateBookmarkedWordsCount() {
    this.bookmarkedWordsCount = this.wordService.getBookmarkedWordsCount();
  }

  // Progress getters for template
  get learnedWordsCount(): number {
    return this.wordService.getLearnedWordsCount();
  }

  get learnedPercentage(): number {
    return this.wordService.getLearnedPercentage();
  }

  get studiedWordsCount(): number {
    return this.wordService.getStudiedWordsCount();
  }

  get studiedPercentage(): number {
    return this.wordService.getStudiedPercentage();
  }

  get currentSessionStats() {
    // Get actual session stats from recent activity
    const stats = this.progressService.getCurrentSession();
    return {
      ...stats,
      learnedCount: this.getSessionLearnedCount(),
      studiedCount: this.getSessionStudiedCount()
    };
  }

  get hasAnyProgress(): boolean {
    return this.studiedWordsCount > 0;
  }

  /**
   * Get count of words learned in current session (simplified for now)
   */
  private getSessionLearnedCount(): number {
    // For now, use the known count from current session
    // This could be enhanced to track actual learned words in session
    return this.progressService.getCurrentSession().knownCount;
  }

  /**
   * Get count of words studied in current session
   */
  private getSessionStudiedCount(): number {
    return this.progressService.getCurrentSession().totalWordsStudied;
  }

  // Session configuration methods
  toggleSessionSettings() {
    this.showSessionSettings = !this.showSessionSettings;
  }

  async updateSessionConfig() {
    await this.sessionService.updateSessionConfig(this.sessionConfig);
    this.showSessionSettings = false;
  }

  get sessionSizeOptions() {
    return [
      { value: 10, label: '10 cards' },
      { value: 15, label: '15 cards' },
      { value: 20, label: '20 cards' },
      { value: 25, label: '25 cards' },
      { value: 30, label: '30 cards' },
      { value: 40, label: '40 cards' },
      { value: 50, label: '50 cards' }
    ];
  }

  get sessionTypeOptions() {
    return [
      { value: 'mixed', label: 'Mixed (All Words)' },
      { value: 'new', label: 'New Words Only' },
      { value: 'review', label: 'Review Previous' },
      { value: 'difficult', label: 'Difficult Words' }
    ];
  }

  /**
   * Temporary method to calculate scores for all existing words
   * This will be removed after migration is complete
   */
  async calculateAllScores() {
    if (confirm('This will calculate and cache scores for all words that have existing quiz results. This is a one-time migration. Continue?')) {
      this.isCalculatingScores = true;
      try {
        await this.wordService.calculateScoresForAllWords();
        alert('Score calculation complete! All existing word results now have cached scores for better performance.');
      } catch (error) {
        console.error('Error calculating scores:', error);
        alert('Error occurred while calculating scores. Please try again.');
      } finally {
        this.isCalculatingScores = false;
      }
    }
  }

  /**
   * Start background preloading of pronunciations
   */
  private async startBackgroundPronunciationPreloading(): Promise<void> {
    // Don't start if already preloading or complete
    if (this.pronunciationPreloadStatus.isPreloading || this.pronunciationPreloadStatus.isComplete) {
      return;
    }

    this.pronunciationPreloadStatus.isPreloading = true;
    
    try {
      // Get cache stats to check if we already have a good amount cached
      const cacheStats = this.wordService.getPronunciationCacheStats();
      
      // If we already have 15+ pronunciations cached, don't preload more
      if (cacheStats.size >= 15) {
        console.log('Pronunciation cache already well populated, skipping preload');
        this.pronunciationPreloadStatus.isComplete = true;
        this.pronunciationPreloadStatus.isPreloading = false;
        return;
      }

      console.log('Starting background pronunciation preloading...');
      
      // Preload common words (reduced to 10 to be conservative with API usage)
      const commonResult = await this.wordService.preloadCommonPronunciations(10);
      
      // Small delay before next batch
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Preload bookmarked words (these are important to the user)
      const bookmarkedResult = await this.wordService.preloadBookmarkedPronunciations();
      
      // Update status
      this.pronunciationPreloadStatus.loaded = commonResult.loaded + bookmarkedResult.loaded;
      this.pronunciationPreloadStatus.failed = commonResult.failed + bookmarkedResult.failed;
      this.pronunciationPreloadStatus.isComplete = true;
      
      console.log(`Background pronunciation preloading complete: ${this.pronunciationPreloadStatus.loaded} loaded, ${this.pronunciationPreloadStatus.failed} failed`);
      
    } catch (error) {
      console.error('Error during background pronunciation preloading:', error);
      this.pronunciationPreloadStatus.failed++;
    } finally {
      this.pronunciationPreloadStatus.isPreloading = false;
    }
  }

  /**
   * Manually trigger pronunciation preloading (for testing/debugging)
   */
  async triggerPronunciationPreload(): Promise<void> {
    this.pronunciationPreloadStatus = {
      isPreloading: false,
      isComplete: false,
      loaded: 0,
      failed: 0,
      showDetails: true
    };
    
    await this.startBackgroundPronunciationPreloading();
  }

  /**
   * Get pronunciation cache statistics for display
   */
  getPronunciationCacheInfo(): string {
    const stats = this.wordService.getPronunciationCacheStats();
    return `${stats.size} pronunciations cached (${stats.totalSizeKB} KB, ${stats.totalAccesses} total plays)`;
  }
}
