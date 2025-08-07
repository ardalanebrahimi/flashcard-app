import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { WordTrackingService } from '../services/word-tracking.service';
import { WordService } from '../services/word.service';
import { DictionaryService } from '../services/dictionary.service';
import { 
  WordProgress, 
  WordStatistics, 
  WordFilters, 
  WordFilterStatus, 
  WordFilterSource, 
  WordSortBy 
} from '../models/word-progress.model';

@Component({
  selector: 'app-words-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './words-list.component.html',
  styleUrls: ['./words-list.component.css']
})
export class WordsListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  words: WordProgress[] = [];
  filteredWords: WordProgress[] = [];
  statistics: WordStatistics = {
    totalWords: 0,
    newWords: 0,
    learningWords: 0,
    masteredWords: 0,
    totalPractices: 0,
    overallAccuracy: 0,
    dictionaryWords: 0,
    customWords: 0
  };

  filters: WordFilters = {
    status: 'all',
    source: 'all',
    searchTerm: '',
    sortBy: 'alphabetical',
    sortDirection: 'asc'
  };

  // Pagination
  currentPage = 1;
  itemsPerPage = 20;
  totalPages = 1;

  // Loading states
  isLoading = true;
  isInitializing = true;

  // UI states
  isFiltersCollapsed = true;

  constructor(
    private wordTrackingService: WordTrackingService,
    private wordService: WordService,
    private dictionaryService: DictionaryService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeComponent();
    this.setupSearchDebounce();
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeComponent(): void {
    // Subscribe to word progress changes
    this.wordTrackingService.wordProgress$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadWordProgress();
      });
  }

  private setupSearchDebounce(): void {
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(searchTerm => {
        this.filters.searchTerm = searchTerm;
        this.applyFilters();
      });
  }

  private async loadData(): Promise<void> {
    this.isLoading = true;
    try {
      // Ensure word tracking service is loaded
      await this.wordTrackingService.loadWordProgress();
      
      // Initialize word progress for all available words
      await this.initializeWordProgress();
      
      this.loadWordProgress();
      this.isInitializing = false;
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      this.isLoading = false;
    }
  }

  private async initializeWordProgress(): Promise<void> {
    // Get all words from word service and dictionary service
    const originalWords = this.wordService.getAllWords();
    const customWords = this.dictionaryService.getCustomWords();

    // Initialize progress for words that don't have it yet
    for (const word of originalWords) {
      if (!this.wordTrackingService.getWordProgress(word.word)) {
        // This will create a new progress entry if it doesn't exist
        await this.wordTrackingService.recordPractice(word, true, 'dictionary');
        // Reset the counts since this is just initialization
        const progress = this.wordTrackingService.getWordProgress(word.word);
        if (progress) {
          progress.practiceCount = 0;
          progress.correctCount = 0;
          progress.wrongCount = 0;
          progress.status = 'new';
          progress.lastStudied = undefined;
        }
      }
    }

    for (const word of customWords) {
      if (!this.wordTrackingService.getWordProgress(word.word)) {
        await this.wordTrackingService.recordPractice(word, true, 'custom');
        const progress = this.wordTrackingService.getWordProgress(word.word);
        if (progress) {
          progress.practiceCount = 0;
          progress.correctCount = 0;
          progress.wrongCount = 0;
          progress.status = 'new';
          progress.lastStudied = undefined;
        }
      }
    }
  }

  private loadWordProgress(): void {
    this.words = this.wordTrackingService.getAllWordProgress();
    this.statistics = this.wordTrackingService.getWordStatistics();
    this.applyFilters();
  }

  applyFilters(): void {
    this.filteredWords = this.wordTrackingService.getFilteredWordProgress(this.filters);
    this.updatePagination();
  }

  private updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredWords.length / this.itemsPerPage);
    this.currentPage = Math.min(this.currentPage, this.totalPages || 1);
  }

  get paginatedWords(): WordProgress[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredWords.slice(start, end);
  }

  onSearchChange(searchTerm: string): void {
    this.searchSubject.next(searchTerm);
  }

  onStatusFilterChange(status: string): void {
    this.filters.status = status as WordFilterStatus;
    this.currentPage = 1;
    this.applyFilters();
  }

  onSourceFilterChange(source: string): void {
    this.filters.source = source as WordFilterSource;
    this.currentPage = 1;
    this.applyFilters();
  }

  onSortChange(sortBy: string): void {
    this.filters.sortBy = sortBy as WordSortBy;
    this.applyFilters();
  }

  toggleSortDirection(): void {
    this.filters.sortDirection = this.filters.sortDirection === 'asc' ? 'desc' : 'asc';
    this.applyFilters();
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  getAccuracy(word: WordProgress): number {
    return word.practiceCount > 0 ? Math.round((word.correctCount / word.practiceCount) * 100) : 0;
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'new': return 'badge-new';
      case 'learning': return 'badge-learning';
      case 'mastered': return 'badge-mastered';
      default: return 'badge-default';
    }
  }

  getSourceBadgeClass(source: string): string {
    return source === 'dictionary' ? 'badge-dictionary' : 'badge-custom';
  }

  formatDate(date: Date | undefined): string {
    if (!date) return 'Never';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  }

  async resetWordProgress(word: WordProgress): Promise<void> {
    if (confirm(`Are you sure you want to reset progress for "${word.word}"?`)) {
      await this.wordTrackingService.resetWordProgress(word.word);
    }
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  clearFilters(): void {
    this.filters = {
      status: 'all',
      source: 'all',
      searchTerm: '',
      sortBy: 'alphabetical',
      sortDirection: 'asc'
    };
    this.currentPage = 1;
    this.applyFilters();
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  toggleFilters(): void {
    this.isFiltersCollapsed = !this.isFiltersCollapsed;
  }

  trackByWord(index: number, word: WordProgress): string {
    return word.word;
  }
}
