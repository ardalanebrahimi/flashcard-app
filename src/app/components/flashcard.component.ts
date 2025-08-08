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
  styleUrls: ['./flashcard.component.css']
})
export class FlashcardComponent implements OnInit, OnDestroy {
  currentWord: Word | null = null;
  showMeaning = false;
  sessionProgress: SessionProgress | null = null;
  sessionComplete = false;
  isImprovingTranslation = false;
  isPronouncing = false;
  
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

    // Subscribe to word service updates to refresh current word when translations change
    this.subscription.add(
      this.wordService.wordsLoaded$.subscribe(loaded => {
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
      // Update scoring system
      await this.wordService.updateResults(this.currentWord, "correct");
      
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
      // Update scoring system
      await this.wordService.updateResults(this.currentWord, "wrong");
      
      // Update progress services
      await this.progressService.markWordAsUnknown(this.currentWord.word);
      
      // Track in word tracking service
      const source = this.isCustomWord(this.currentWord) ? 'custom' : 'dictionary';
      await this.wordTrackingService.recordPractice(this.currentWord, false, source);
      
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
      const result = await this.wordService.improveTranslation(this.currentWord);
      
      if (result.success && result.improvedWord) {
        // Update the current word with the improved translation
        this.currentWord = result.improvedWord;
        console.log('Translation improved successfully');
      } else {
        console.error('Failed to improve translation:', result.error);
        alert(result.error || 'Failed to improve translation. Please try again.');
      }
    } catch (error) {
      console.error('Error improving translation:', error);
      alert('An error occurred while improving the translation. Please try again.');
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
      alert('Unable to pronounce the word. Please check if your browser supports speech synthesis.');
    } finally {
      this.isPronouncing = false;
    }
  }

  get isSpeechSupported(): boolean {
    return this.pronunciationService.isSpeechSynthesisSupported();
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
  getRemainingSlots(results: ("correct" | "wrong")[]): number[] {
    const remaining = 3 - results.length;
    return remaining > 0 ? Array(remaining).fill(0).map((_, i) => i) : [];
  }
}
