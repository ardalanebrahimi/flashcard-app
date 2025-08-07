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
  get overallKnownCount(): number {
    return this.progressService.getKnownWordsCount();
  }

  get overallUnknownCount(): number {
    return this.progressService.getUnknownWordsCount();
  }

  get overallSuccessRate(): number {
    return this.progressService.getOverallSuccessRate();
  }

  get currentSessionStats() {
    return this.progressService.getCurrentSession();
  }

  get hasAnyProgress(): boolean {
    return this.overallKnownCount > 0 || this.overallUnknownCount > 0;
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
}
