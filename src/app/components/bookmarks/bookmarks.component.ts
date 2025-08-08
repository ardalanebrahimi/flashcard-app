import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { WordService } from '../../services/word.service';
import { Word } from '../../models/word.model';

@Component({
  selector: 'app-bookmarks',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './bookmarks.component.html',
  styleUrls: ['./bookmarks.component.css']
})
export class BookmarksComponent implements OnInit, OnDestroy {
  bookmarkedWords: Word[] = [];
  loading = true;
  
  private subscription = new Subscription();

  constructor(
    private wordService: WordService,
    private router: Router
  ) {}

  ngOnInit() {
    // Wait for bookmarks to be loaded before displaying
    this.subscription.add(
      this.wordService.bookmarksLoaded$.subscribe(loaded => {
        if (loaded) {
          this.loadBookmarkedWords();
        }
      })
    );
    
    // Subscribe to bookmark changes
    this.subscription.add(
      this.wordService.bookmarkedWords$.subscribe(() => {
        if (!this.loading) { // Only update if already loaded once
          this.loadBookmarkedWords();
        }
      })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  private loadBookmarkedWords(): void {
    this.loading = true;
    this.bookmarkedWords = this.wordService.getBookmarkedWords();
    this.loading = false;
  }

  async onRemoveBookmark(word: Word): Promise<void> {
    await this.wordService.toggleBookmark(word);
  }

  async onClearAllBookmarks(): Promise<void> {
    if (confirm('Are you sure you want to remove all bookmarks? This cannot be undone.')) {
      await this.wordService.clearAllBookmarks();
    }
  }

  onStartBookmarkedSession(): void {
    if (this.bookmarkedWords.length === 0) {
      alert('No bookmarked words available. Please bookmark some words first.');
      return;
    }
    
    // TODO: Implement bookmarked-only session
    // For now, navigate to regular flashcards
    this.router.navigate(['/flashcards']);
  }

  trackByWord(index: number, word: Word): string {
    return word.word;
  }
}
