import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Preferences } from '@capacitor/preferences';
import { Word } from '../models/word.model';
import { WordService } from './word.service';

export interface SessionConfig {
  cardsPerSession: number;
  sessionType: 'mixed' | 'new' | 'review' | 'difficult';
}

export interface SessionProgress {
  currentCard: number;
  totalCards: number;
  correctCount: number;
  incorrectCount: number;
  practiceAgainCount: number;
  sessionCards: Word[];
  sessionStartTime: Date;
  isComplete: boolean;
}

export interface CompletedSession {
  id: string;
  startTime: Date;
  endTime: Date;
  totalCards: number;
  correctCount: number;
  incorrectCount: number;
  practiceAgainCount: number;
  sessionType: string;
  cardsPerSession: number;
  successRate: number;
}

@Injectable({
  providedIn: 'root'
})
export class SessionService {
  private readonly SESSION_CONFIG_KEY = 'session_config';
  private readonly CURRENT_SESSION_KEY = 'current_session_progress';
  private readonly SESSION_HISTORY_KEY = 'session_history';

  // Default session configuration
  private defaultConfig: SessionConfig = {
    cardsPerSession: 20,
    sessionType: 'mixed'
  };

  private sessionConfigSubject = new BehaviorSubject<SessionConfig>(this.defaultConfig);
  public sessionConfig$ = this.sessionConfigSubject.asObservable();

  private sessionProgressSubject = new BehaviorSubject<SessionProgress | null>(null);
  public sessionProgress$ = this.sessionProgressSubject.asObservable();

  private sessionActiveSubject = new BehaviorSubject<boolean>(false);
  public sessionActive$ = this.sessionActiveSubject.asObservable();

  constructor(private wordService: WordService) {
    this.loadSessionConfig();
  }

  /**
   * Load session configuration from storage
   */
  private async loadSessionConfig(): Promise<void> {
    try {
      const result = await Preferences.get({ key: this.SESSION_CONFIG_KEY });
      if (result.value) {
        const config = JSON.parse(result.value);
        this.sessionConfigSubject.next(config);
      }
    } catch (error) {
      console.error('Error loading session config:', error);
    }
  }

  /**
   * Save session configuration to storage
   */
  private async saveSessionConfig(): Promise<void> {
    try {
      await Preferences.set({
        key: this.SESSION_CONFIG_KEY,
        value: JSON.stringify(this.sessionConfigSubject.value)
      });
    } catch (error) {
      console.error('Error saving session config:', error);
    }
  }

  /**
   * Update session configuration
   */
  async updateSessionConfig(config: Partial<SessionConfig>): Promise<void> {
    const currentConfig = this.sessionConfigSubject.value;
    const newConfig = { ...currentConfig, ...config };
    this.sessionConfigSubject.next(newConfig);
    await this.saveSessionConfig();
  }

  /**
   * Get current session configuration
   */
  getSessionConfig(): SessionConfig {
    return this.sessionConfigSubject.value;
  }

  /**
   * Start a new session with given words
   */
  async startSession(availableWords: Word[]): Promise<SessionProgress> {
    const config = this.sessionConfigSubject.value;
    
    // Select words for this session based on configuration
    const sessionCards = this.selectWordsForSession(availableWords, config);
    
    const sessionProgress: SessionProgress = {
      currentCard: 0,
      totalCards: sessionCards.length,
      correctCount: 0,
      incorrectCount: 0,
      practiceAgainCount: 0,
      sessionCards,
      sessionStartTime: new Date(),
      isComplete: false
    };

    this.sessionProgressSubject.next(sessionProgress);
    this.sessionActiveSubject.next(true);
    
    await this.saveCurrentSession(sessionProgress);
    
    console.log(`Started new session with ${sessionCards.length} cards`);
    return sessionProgress;
  }

  /**
   * Select words for session based on configuration using intelligent weighted selection
   */
  private selectWordsForSession(words: Word[], config: SessionConfig): Word[] {
    const sessionCards: Word[] = [];
    const targetCount = Math.min(config.cardsPerSession, words.length);
    
    // Use weighted selection for better learning experience
    const usedWords = new Set<string>();
    
    for (let i = 0; i < targetCount; i++) {
      const nextWord = this.wordService.getNextWord();
      
      if (nextWord && !usedWords.has(nextWord.word)) {
        sessionCards.push(nextWord);
        usedWords.add(nextWord.word);
      } else {
        // Fallback: find unused word with lowest score
        const availableWords = words.filter(word => !usedWords.has(word.word));
        if (availableWords.length > 0) {
          // Sort by score (prioritize lower scores) then randomly
          const sortedWords = availableWords.sort((a, b) => {
            const scoreA = this.wordService.calculateScore(a);
            const scoreB = this.wordService.calculateScore(b);
            if (scoreA !== scoreB) return scoreA - scoreB;
            return Math.random() - 0.5;
          });
          
          const fallbackWord = sortedWords[0];
          sessionCards.push(fallbackWord);
          usedWords.add(fallbackWord.word);
        }
      }
    }
    
    console.log(`Selected ${sessionCards.length} words for session using weighted selection`);
    console.log(`Score distribution:`, sessionCards.map(w => ({
      word: w.word,
      score: this.wordService.calculateScore(w)
    })));
    
    return sessionCards;
  }

  /**
   * Update session progress after answering a card
   */
  async updateSessionProgress(isCorrect: boolean, isPracticeAgain: boolean = false): Promise<void> {
    const currentProgress = this.sessionProgressSubject.value;
    if (!currentProgress) return;

    const updatedProgress = { ...currentProgress };
    
    if (isPracticeAgain) {
      updatedProgress.practiceAgainCount++;
    } else if (isCorrect) {
      updatedProgress.correctCount++;
    } else {
      updatedProgress.incorrectCount++;
    }

    updatedProgress.currentCard++;
    
    // Check if session is complete
    if (updatedProgress.currentCard >= updatedProgress.totalCards) {
      updatedProgress.isComplete = true;
      await this.completeSession(updatedProgress);
    } else {
      this.sessionProgressSubject.next(updatedProgress);
      await this.saveCurrentSession(updatedProgress);
    }
  }

  /**
   * Complete the current session
   */
  private async completeSession(sessionProgress: SessionProgress): Promise<void> {
    const completedSession: CompletedSession = {
      id: `session_${Date.now()}`,
      startTime: sessionProgress.sessionStartTime,
      endTime: new Date(),
      totalCards: sessionProgress.totalCards,
      correctCount: sessionProgress.correctCount,
      incorrectCount: sessionProgress.incorrectCount,
      practiceAgainCount: sessionProgress.practiceAgainCount,
      sessionType: this.sessionConfigSubject.value.sessionType,
      cardsPerSession: this.sessionConfigSubject.value.cardsPerSession,
      successRate: this.calculateSuccessRate(sessionProgress)
    };

    // Save to session history
    await this.saveSessionToHistory(completedSession);

    // Update subjects
    this.sessionProgressSubject.next({ ...sessionProgress, isComplete: true });
    this.sessionActiveSubject.next(false);

    // Clear current session storage
    await this.clearCurrentSession();

    console.log('Session completed:', completedSession);
  }

  /**
   * Calculate success rate for session
   */
  private calculateSuccessRate(sessionProgress: SessionProgress): number {
    const totalAnswered = sessionProgress.correctCount + sessionProgress.incorrectCount;
    if (totalAnswered === 0) return 0;
    return Math.round((sessionProgress.correctCount / totalAnswered) * 100);
  }

  /**
   * Save current session progress to storage
   */
  private async saveCurrentSession(sessionProgress: SessionProgress): Promise<void> {
    try {
      await Preferences.set({
        key: this.CURRENT_SESSION_KEY,
        value: JSON.stringify(sessionProgress)
      });
    } catch (error) {
      console.error('Error saving current session:', error);
    }
  }

  /**
   * Load current session progress from storage
   */
  async loadCurrentSession(): Promise<SessionProgress | null> {
    try {
      const result = await Preferences.get({ key: this.CURRENT_SESSION_KEY });
      if (result.value) {
        const sessionProgress = JSON.parse(result.value);
        sessionProgress.sessionStartTime = new Date(sessionProgress.sessionStartTime);
        
        this.sessionProgressSubject.next(sessionProgress);
        this.sessionActiveSubject.next(!sessionProgress.isComplete);
        
        return sessionProgress;
      }
    } catch (error) {
      console.error('Error loading current session:', error);
    }
    return null;
  }

  /**
   * Clear current session from storage
   */
  private async clearCurrentSession(): Promise<void> {
    try {
      await Preferences.remove({ key: this.CURRENT_SESSION_KEY });
    } catch (error) {
      console.error('Error clearing current session:', error);
    }
  }

  /**
   * Save completed session to history
   */
  private async saveSessionToHistory(completedSession: CompletedSession): Promise<void> {
    try {
      const result = await Preferences.get({ key: this.SESSION_HISTORY_KEY });
      let sessions: CompletedSession[] = [];
      
      if (result.value) {
        sessions = JSON.parse(result.value).map((session: any) => ({
          ...session,
          startTime: new Date(session.startTime),
          endTime: new Date(session.endTime)
        }));
      }

      sessions.push(completedSession);
      
      // Keep only last 50 sessions
      if (sessions.length > 50) {
        sessions = sessions.slice(-50);
      }

      await Preferences.set({
        key: this.SESSION_HISTORY_KEY,
        value: JSON.stringify(sessions)
      });
    } catch (error) {
      console.error('Error saving session to history:', error);
    }
  }

  /**
   * Get session history
   */
  async getSessionHistory(): Promise<CompletedSession[]> {
    try {
      const result = await Preferences.get({ key: this.SESSION_HISTORY_KEY });
      if (result.value) {
        return JSON.parse(result.value).map((session: any) => ({
          ...session,
          startTime: new Date(session.startTime),
          endTime: new Date(session.endTime)
        }));
      }
    } catch (error) {
      console.error('Error loading session history:', error);
    }
    return [];
  }

  /**
   * End current session prematurely
   */
  async endCurrentSession(): Promise<void> {
    const currentProgress = this.sessionProgressSubject.value;
    if (currentProgress && !currentProgress.isComplete) {
      await this.completeSession(currentProgress);
    }
  }

  /**
   * Check if a session is currently active
   */
  isSessionActive(): boolean {
    return this.sessionActiveSubject.value;
  }

  /**
   * Get current session progress
   */
  getCurrentSessionProgress(): SessionProgress | null {
    return this.sessionProgressSubject.value;
  }

  /**
   * Get current word in session
   */
  getCurrentSessionWord(): Word | null {
    const progress = this.sessionProgressSubject.value;
    if (!progress || progress.currentCard >= progress.sessionCards.length) {
      return null;
    }
    return progress.sessionCards[progress.currentCard];
  }

  /**
   * Reset all session data
   */
  async resetAllSessions(): Promise<void> {
    await Promise.all([
      this.clearCurrentSession(),
      Preferences.remove({ key: this.SESSION_HISTORY_KEY }),
      Preferences.remove({ key: this.SESSION_CONFIG_KEY })
    ]);

    this.sessionProgressSubject.next(null);
    this.sessionActiveSubject.next(false);
    this.sessionConfigSubject.next(this.defaultConfig);
  }
}
