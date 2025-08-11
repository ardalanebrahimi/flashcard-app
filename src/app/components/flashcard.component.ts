import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { WordService } from '../services/word.service';
import { ProgressService } from '../services/progress.service';
import { WordTrackingService } from '../services/word-tracking.service';
import { DictionaryService } from '../services/dictionary.service';
import { SessionService, SessionProgress } from '../services/session.service';
import { PronunciationService } from '../services/pronunciation.service';
import { Word } from '../models/word.model';

@Component({
  selector: 'app-flashcard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './flashcard.component.html',
  styleUrls: ['./flashcard.component.css'],
})
export class FlashcardComponent implements OnInit, OnDestroy {
  currentWord: Word | null = null;
  showMeaning = false;
  sessionProgress: SessionProgress | null = null;
  sessionComplete = false;
  isImprovingTranslation = false;
  isPronouncing = false;

  // Swipe functionality properties
  touchStartX = 0;
  touchStartY = 0;
  isDragging = false;
  swipeDirection: 'left' | 'right' | null = null;
  swipeOffset = 0;
  showSwipeHint = false;
  private swipeThreshold = 80; // pixels

  // Card animation properties
  isCardExiting = false;
  nextCardDirection: 'left' | 'right' | null = null;
  showNextCard = false;

  private subscription = new Subscription();

  constructor(
    private wordService: WordService,
    private progressService: ProgressService,
    private wordTrackingService: WordTrackingService,
    private dictionaryService: DictionaryService,
    private sessionService: SessionService,
    private pronunciationService: PronunciationService,
    private router: Router
  ) {}

  ngOnInit() {
    // Subscribe to session progress updates
    this.subscription.add(
      this.sessionService.sessionProgress$.subscribe((progress) => {
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

    // Subscribe to word service updates to refresh current word when translations change
    this.subscription.add(
      this.wordService.wordsLoaded$.subscribe((loaded) => {
        if (loaded && this.sessionProgress && !this.sessionComplete) {
          // Refresh current word to get updated translations
          this.currentWord = this.sessionService.getCurrentSessionWord();
        }
      })
    );

    // Subscribe to custom words changes
    this.subscription.add(
      this.dictionaryService.customWords$.subscribe(() => {
        if (this.sessionProgress && !this.sessionComplete) {
          // Refresh current word to get updated translations
          this.currentWord = this.sessionService.getCurrentSessionWord();
        }
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
    if (this.wordService.allWords.length === 0) {
      console.warn('No words available for session');
      return;
    }

    // Start new session
    await this.sessionService.startSession();
  }

  onShowMeaning() {
    this.showMeaning = true;
  }

  async onKnowIt() {
    if (this.currentWord && this.sessionProgress && !this.sessionComplete) {
      // Check if this card was already visited in the current session
      const isCardAlreadyVisited = this.sessionService.isCurrentCardVisited();

      // Update scoring system
      await this.wordService.updateResults(
        this.currentWord,
        'correct',
        isCardAlreadyVisited
      );

      // Update progress services
      await this.progressService.markWordAsKnown(this.currentWord.word);

      // Track in word tracking service
      const source = this.isCustomWord(this.currentWord)
        ? 'custom'
        : 'dictionary';
      await this.wordTrackingService.recordPractice(
        this.currentWord,
        true,
        source
      );

      // Update session progress
      await this.sessionService.updateSessionProgress(true, false);
    }
  }

  async onDontKnowIt() {
    if (this.currentWord && this.sessionProgress && !this.sessionComplete) {
      // Check if this card was already visited in the current session
      const isCardAlreadyVisited = this.sessionService.isCurrentCardVisited();

      // Update scoring system
      await this.wordService.updateResults(
        this.currentWord,
        'wrong',
        isCardAlreadyVisited
      );

      // Update progress services
      await this.progressService.markWordAsUnknown(this.currentWord.word);

      // Track in word tracking service
      const source = this.isCustomWord(this.currentWord)
        ? 'custom'
        : 'dictionary';
      await this.wordTrackingService.recordPractice(
        this.currentWord,
        false,
        source
      );

      // Update session progress
      await this.sessionService.updateSessionProgress(false, false);
    }
  }

  async onToggleBookmark() {
    if (this.currentWord) {
      await this.wordService.toggleBookmark(this.currentWord);
    }
  }

  async onImproveTranslation() {
    if (!this.currentWord || this.isImprovingTranslation) {
      return;
    }

    this.isImprovingTranslation = true;

    try {
      const result = await this.wordService.improveTranslation(
        this.currentWord
      );

      if (result.success && result.improvedWord) {
        // Update the current word with the improved translation
        this.currentWord = result.improvedWord;
        console.log('Translation improved successfully');
      } else {
        console.error('Failed to improve translation:', result.error);
        alert(
          result.error || 'Failed to improve translation. Please try again.'
        );
      }
    } catch (error) {
      console.error('Error improving translation:', error);
      alert(
        'An error occurred while improving the translation. Please try again.'
      );
    } finally {
      this.isImprovingTranslation = false;
    }
  }

  async onPronounceWord() {
    if (!this.currentWord || this.isPronouncing) {
      return;
    }

    this.isPronouncing = true;

    try {
      await this.pronunciationService.pronounceWord(this.currentWord.word);
    } catch (error) {
      console.error('Error pronouncing word:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // Provide user-friendly error messages
      if (errorMessage.includes('OpenAI')) {
        alert(
          'Unable to generate pronunciation using AI. Please check your internet connection and try again.'
        );
      } else if (errorMessage.includes('not supported')) {
        alert(
          'Speech synthesis is not available on this device. This may be due to browser limitations or device settings.'
        );
      } else if (errorMessage.includes('timeout')) {
        alert(
          'Pronunciation request timed out. Please check your internet connection and try again.'
        );
      } else {
        alert(`Unable to pronounce the word: ${errorMessage}`);
      }
    } finally {
      this.isPronouncing = false;
    }
  }

  get isSpeechSupported(): boolean {
    // With OpenAI TTS as primary and browser speech as fallback,
    // we can always show the pronunciation button
    return true;
  }

  private isCustomWord(word: Word): boolean {
    const customWords = this.dictionaryService.getCustomWords();
    return customWords.some((cw) => cw.word === word.word);
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
    if (
      confirm(
        'Are you sure you want to end this session? Your progress will be saved.'
      )
    ) {
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
    const totalAnswered =
      this.sessionProgress.correctCount + this.sessionProgress.incorrectCount;
    if (totalAnswered === 0) return 0;
    return Math.round(
      (this.sessionProgress.correctCount / totalAnswered) * 100
    );
  }

  get progressPercentage(): number {
    if (!this.sessionProgress || this.sessionProgress.totalCards === 0)
      return 0;
    return Math.round(
      (this.sessionProgress.currentCard / this.sessionProgress.totalCards) * 100
    );
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
    return this.currentWord
      ? this.progressService.isWordKnown(this.currentWord.word)
      : false;
  }

  get isCurrentWordUnknown(): boolean {
    return this.currentWord
      ? this.progressService.isWordUnknown(this.currentWord.word)
      : false;
  }

  get isCurrentWordForPracticeAgain(): boolean {
    return this.currentWord
      ? this.progressService.isWordForPracticeAgain(this.currentWord.word)
      : false;
  }

  get currentWordScore(): number {
    return this.currentWord?.score ?? 0;
  }

  get currentWordScoreText(): string {
    if (!this.currentWord) return '';
    const score = this.currentWordScore;
    const results = this.currentWord.lastResults || [];
    if (results.length === 0) return 'No attempts yet';
    return `${score}/3 correct (${results.join(', ')})`;
  }

  /**
   * Get remaining slots for score indicator (to fill with gray)
   */
  getRemainingSlots(results: ('correct' | 'wrong')[]): number[] {
    const remaining = 3 - results.length;
    return remaining > 0
      ? Array(remaining)
          .fill(0)
          .map((_, i) => i)
      : [];
  }

  // Helper method for template
  getAbsoluteValue(value: number): number {
    return Math.abs(value);
  }

  // Navigation and card status getters
  get canSwipeForward(): boolean {
    return this.sessionService.canNavigateForward();
  }

  get canSwipeBackward(): boolean {
    return this.sessionService.canNavigateBackward();
  }

  get currentCardStatus():
    | 'correct'
    | 'incorrect'
    | 'practice-again'
    | 'unvisited' {
    return this.sessionService.getCardStatus(this.currentCardNumber - 1);
  }

  get isCurrentCardVisited(): boolean {
    return this.sessionService.isCurrentCardVisited();
  }

  // Swipe functionality methods
  onTouchStart(event: TouchEvent) {
    if (!this.currentWord || this.showMeaning) return;

    this.touchStartX = event.touches[0].clientX;
    this.touchStartY = event.touches[0].clientY;
    this.isDragging = false;
    this.swipeDirection = null;
    this.swipeOffset = 0;
  }

  onTouchMove(event: TouchEvent) {
    if (!this.currentWord || this.showMeaning || !event.touches[0]) return;

    const touchX = event.touches[0].clientX;
    const touchY = event.touches[0].clientY;
    const deltaX = touchX - this.touchStartX;
    const deltaY = touchY - this.touchStartY;

    // Check if this is a horizontal swipe (not vertical scroll)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      this.isDragging = true;
      this.swipeOffset = deltaX;

      // Determine swipe direction
      if (deltaX > 30) {
        this.swipeDirection = 'right';
      } else if (deltaX < -30) {
        this.swipeDirection = 'left';
      } else {
        this.swipeDirection = null;
      }

      // Prevent default scrolling when swiping horizontally
      event.preventDefault();
    }
  }

  onTouchEnd(event: TouchEvent) {
    if (!this.currentWord || this.showMeaning || !this.isDragging) {
      this.resetSwipe();
      return;
    }

    const deltaX = this.swipeOffset;

    // Check if swipe threshold is met
    if (Math.abs(deltaX) >= this.swipeThreshold) {
      if (deltaX > 0) {
        // Right swipe - Navigate backward (previous)
        this.onSwipeBackward();
      } else {
        // Left swipe - Navigate forward (skip/next)
        this.onSwipeForward();
      }
    } else {
      // Not enough distance, bounce back
      this.resetSwipe();
    }
  }

  private resetSwipe() {
    this.isDragging = false;
    this.swipeDirection = null;
    this.swipeOffset = 0;
    this.showSwipeHint = false;
  }

  async onSwipeForward() {
    // Check if we can navigate forward
    if (!this.sessionService.canNavigateForward()) {
      this.resetSwipe();
      return;
    }

    // If current card is unvisited, mark as known (skip logic)
    if (!this.sessionService.isCurrentCardVisited() && this.currentWord) {
      // Use the skip card logic which handles scoring and navigation
      await this.onSkipCard();
    } else {
      // Just navigate forward without any scoring for visited cards
      await this.navigateToCard('left'); // Left slide (forward navigation)
    }
  }

  async onSwipeBackward() {
    // Check if we can navigate backward
    if (!this.sessionService.canNavigateBackward()) {
      this.resetSwipe();
      return;
    }

    // Navigate backward without any scoring (never score on backward navigation)
    await this.navigateToCard('right'); // Right slide (backward navigation)
  }

  private async navigateToCard(direction: 'left' | 'right') {
    this.isCardExiting = true;
    this.nextCardDirection = direction;

    // Wait for exit animation
    setTimeout(async () => {
      if (direction === 'left') {
        // Left exit = forward navigation
        await this.sessionService.navigateToNextCard();
      } else {
        // Right exit = backward navigation
        await this.sessionService.navigateToPreviousCard();
      }

      // Reset card state for entrance animation
      this.showNextCard = true;
      this.resetSwipe();

      // Reset animation states after a short delay
      setTimeout(() => {
        this.isCardExiting = false;
        this.showNextCard = false;
        this.nextCardDirection = null;
      }, 100); // Increased delay to prevent sticking
    }, 250); // Reduced animation duration to prevent sticking
  }

  async onSkipCard() {
    if (this.currentWord && this.sessionProgress && !this.sessionComplete) {
      // Start exit animation immediately
      this.isCardExiting = true;
      this.nextCardDirection = 'left'; // Forward direction

      // Check if this card was already visited in the current session
      const isCardAlreadyVisited = this.sessionService.isCurrentCardVisited();

      // Mark as known (skip means they already know it)
      await this.wordService.updateResults(
        this.currentWord,
        'correct',
        isCardAlreadyVisited
      );

      // Update progress services
      await this.progressService.markWordAsKnown(this.currentWord.word);

      // Track in word tracking service
      const source = this.isCustomWord(this.currentWord)
        ? 'custom'
        : 'dictionary';
      await this.wordTrackingService.recordPractice(
        this.currentWord,
        true,
        source
      );

      // Update session progress (this will trigger the navigation)
      await this.sessionService.updateSessionProgress(true, false);

      // Reset animation states
      setTimeout(() => {
        this.isCardExiting = false;
        this.nextCardDirection = null;
        this.resetSwipe();
      }, 250);
    }
  }

  // Show swipe hint on long press
  onTouchHold() {
    if (!this.currentWord || this.showMeaning) return;
    this.showSwipeHint = true;

    // Hide hint after 3 seconds
    setTimeout(() => {
      this.showSwipeHint = false;
    }, 3000);
  }
}
