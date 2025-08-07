import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { WordService } from '../services/word.service';
import { ProgressService } from '../services/progress.service';
import { WordTrackingService } from '../services/word-tracking.service';
import { DictionaryService } from '../services/dictionary.service';
import { SessionService, SessionProgress } from '../services/session.service';
import { Word } from '../models/word.model';

@Component({
  selector: 'app-flashcard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './flashcard.component.html',
  styleUrls: ['./flashcard.component.css']
})
export class FlashcardComponent implements OnInit, OnDestroy {
  currentWord: Word | null = null;
  showMeaning = false;
  sessionProgress: SessionProgress | null = null;
  sessionComplete = false;
  
  private subscription = new Subscription();

  constructor(
    private wordService: WordService,
    private progressService: ProgressService,
    private wordTrackingService: WordTrackingService,
    private dictionaryService: DictionaryService,
    private sessionService: SessionService,
    private router: Router
  ) {}

  ngOnInit() {
    // Subscribe to session progress updates
    this.subscription.add(
      this.sessionService.sessionProgress$.subscribe(progress => {
        this.sessionProgress = progress;
        this.sessionComplete = progress?.isComplete || false;
        
        if (this.sessionComplete) {
          // Session is complete, show completion message
          this.currentWord = null;
        } else if (progress) {
          // Get current word from session
          this.currentWord = this.sessionService.getCurrentSessionWord();
        }
        
        this.showMeaning = false; // Reset meaning visibility
      })
    );

    // Load progress and check for existing session
    this.initializeSession();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  /**
   * Initialize session - check for existing session or start new one
   */
  private async initializeSession(): Promise<void> {
    await this.progressService.loadProgress();
    
    // Check if there's an existing session
    const existingSession = await this.sessionService.loadCurrentSession();
    
    if (!existingSession || existingSession.isComplete) {
      // Start a new session
      await this.startNewSession();
    }
  }

  /**
   * Start a new session with available words
   */
  private async startNewSession(): Promise<void> {
    // Get all available words (original + custom)
    const originalWords = this.wordService.getAllWords();
    const customWords = this.dictionaryService.getCustomWords();
    const allWords = [...originalWords, ...customWords];
    
    if (allWords.length === 0) {
      console.warn('No words available for session');
      return;
    }

    // Start new session
    await this.sessionService.startSession(allWords);
  }

  onShowMeaning() {
    this.showMeaning = true;
  }

  async onKnowIt() {
    if (this.currentWord && this.sessionProgress && !this.sessionComplete) {
      // Update progress services
      await this.progressService.markWordAsKnown(this.currentWord.word);
      
      // Track in word tracking service
      const source = this.isCustomWord(this.currentWord) ? 'custom' : 'dictionary';
      await this.wordTrackingService.recordPractice(this.currentWord, true, source);
      
      // Update session progress
      await this.sessionService.updateSessionProgress(true, false);
    }
  }

  async onDontKnowIt() {
    if (this.currentWord && this.sessionProgress && !this.sessionComplete) {
      // Update progress services
      await this.progressService.markWordAsUnknown(this.currentWord.word);
      
      // Track in word tracking service
      const source = this.isCustomWord(this.currentWord) ? 'custom' : 'dictionary';
      await this.wordTrackingService.recordPractice(this.currentWord, false, source);
      
      // Update session progress
      await this.sessionService.updateSessionProgress(false, false);
    }
  }

  async onPracticeAgain() {
    if (this.currentWord && this.sessionProgress && !this.sessionComplete) {
      // Update progress services
      await this.progressService.markWordForPracticeAgain(this.currentWord.word);
      
      // Track in word tracking service
      const source = this.isCustomWord(this.currentWord) ? 'custom' : 'dictionary';
      await this.wordTrackingService.recordPractice(this.currentWord, false, source);
      
      // Update session progress
      await this.sessionService.updateSessionProgress(false, true);
    }
  }

  async onToggleBookmark() {
    if (this.currentWord) {
      await this.wordService.toggleBookmark(this.currentWord);
    }
  }

  private isCustomWord(word: Word): boolean {
    const customWords = this.dictionaryService.getCustomWords();
    return customWords.some(cw => cw.word === word.word);
  }

  /**
   * Return to home page after session completion
   */
  onReturnHome() {
    this.router.navigate(['/']);
  }

  /**
   * Start a new session
   */
  async onStartNewSession() {
    await this.startNewSession();
  }

  /**
   * End current session prematurely and return home
   */
  async onEndSession() {
    if (confirm('Are you sure you want to end this session? Your progress will be saved.')) {
      await this.sessionService.endCurrentSession();
      this.router.navigate(['/']);
    }
  }

  // Session progress getters
  get currentCardNumber(): number {
    return this.sessionProgress ? this.sessionProgress.currentCard + 1 : 0;
  }

  get totalCards(): number {
    return this.sessionProgress ? this.sessionProgress.totalCards : 0;
  }

  get sessionCorrectCount(): number {
    return this.sessionProgress ? this.sessionProgress.correctCount : 0;
  }

  get sessionIncorrectCount(): number {
    return this.sessionProgress ? this.sessionProgress.incorrectCount : 0;
  }

  get sessionPracticeAgainCount(): number {
    return this.sessionProgress ? this.sessionProgress.practiceAgainCount : 0;
  }

  get sessionSuccessRate(): number {
    if (!this.sessionProgress) return 0;
    const totalAnswered = this.sessionProgress.correctCount + this.sessionProgress.incorrectCount;
    if (totalAnswered === 0) return 0;
    return Math.round((this.sessionProgress.correctCount / totalAnswered) * 100);
  }

  get progressPercentage(): number {
    if (!this.sessionProgress || this.sessionProgress.totalCards === 0) return 0;
    return Math.round((this.sessionProgress.currentCard / this.sessionProgress.totalCards) * 100);
  }

  // Overall progress getters (across all sessions)
  get overallKnownCount(): number {
    return this.progressService.getKnownWordsCount();
  }

  get overallUnknownCount(): number {
    return this.progressService.getUnknownWordsCount();
  }

  get overallPracticeAgainCount(): number {
    return this.progressService.getPracticeAgainWordsCount();
  }

  get overallSuccessRate(): number {
    return this.progressService.getOverallSuccessRate();
  }

  // Current word status getters
  get isCurrentWordKnown(): boolean {
    return this.currentWord ? this.progressService.isWordKnown(this.currentWord.word) : false;
  }

  get isCurrentWordUnknown(): boolean {
    return this.currentWord ? this.progressService.isWordUnknown(this.currentWord.word) : false;
  }

  get isCurrentWordForPracticeAgain(): boolean {
    return this.currentWord ? this.progressService.isWordForPracticeAgain(this.currentWord.word) : false;
  }

  async onClearAllProgress() {
    if (confirm('Are you sure you want to clear all progress? This cannot be undone.')) {
      await this.progressService.clearAllProgress();
      await this.sessionService.resetAllSessions();
      await this.startNewSession();
    }
  }
}
