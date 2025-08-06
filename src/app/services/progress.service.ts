import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

export interface WordProgress {
  word: string;
  translation: string;
  isKnown: boolean;
  lastStudied: Date;
  studyCount: number;
}

export interface StudySession {
  knownCount: number;
  unknownCount: number;
  totalWordsStudied: number;
  sessionDate: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ProgressService {
  private readonly KNOWN_WORDS_KEY = 'known_words';
  private readonly UNKNOWN_WORDS_KEY = 'unknown_words';
  private readonly STUDY_SESSIONS_KEY = 'study_sessions';
  private readonly CURRENT_SESSION_KEY = 'current_session';

  private knownWords: Set<string> = new Set();
  private unknownWords: Set<string> = new Set();
  private currentSession: StudySession = {
    knownCount: 0,
    unknownCount: 0,
    totalWordsStudied: 0,
    sessionDate: new Date()
  };

  constructor() {
    this.loadProgress();
  }

  /**
   * Load all progress data from Capacitor Preferences
   */
  async loadProgress(): Promise<void> {
    try {
      // Load known words
      const knownResult = await Preferences.get({ key: this.KNOWN_WORDS_KEY });
      if (knownResult.value) {
        const knownWordsArray = JSON.parse(knownResult.value);
        this.knownWords = new Set(knownWordsArray);
      }

      // Load unknown words
      const unknownResult = await Preferences.get({ key: this.UNKNOWN_WORDS_KEY });
      if (unknownResult.value) {
        const unknownWordsArray = JSON.parse(unknownResult.value);
        this.unknownWords = new Set(unknownWordsArray);
      }

      // Load current session
      const sessionResult = await Preferences.get({ key: this.CURRENT_SESSION_KEY });
      if (sessionResult.value) {
        const sessionData = JSON.parse(sessionResult.value);
        this.currentSession = {
          ...sessionData,
          sessionDate: new Date(sessionData.sessionDate)
        };
        
        // Check if this is a new day - reset session if so
        if (!this.isSameDay(this.currentSession.sessionDate, new Date())) {
          await this.startNewSession();
        }
      }

      console.log(`Progress loaded: ${this.knownWords.size} known, ${this.unknownWords.size} unknown words`);
    } catch (error) {
      console.error('Error loading progress:', error);
    }
  }

  /**
   * Mark a word as known
   */
  async markWordAsKnown(word: string): Promise<void> {
    // Remove from unknown set if it exists there
    this.unknownWords.delete(word);
    
    // Add to known set
    this.knownWords.add(word);
    
    // Update current session
    this.currentSession.knownCount++;
    this.currentSession.totalWordsStudied++;
    
    // Save progress
    await this.saveProgress();
    
    console.log(`Word "${word}" marked as known`);
  }

  /**
   * Mark a word as unknown
   */
  async markWordAsUnknown(word: string): Promise<void> {
    // Remove from known set if it exists there
    this.knownWords.delete(word);
    
    // Add to unknown set
    this.unknownWords.add(word);
    
    // Update current session
    this.currentSession.unknownCount++;
    this.currentSession.totalWordsStudied++;
    
    // Save progress
    await this.saveProgress();
    
    console.log(`Word "${word}" marked as unknown`);
  }

  /**
   * Check if a word is known
   */
  isWordKnown(word: string): boolean {
    return this.knownWords.has(word);
  }

  /**
   * Check if a word is marked as unknown
   */
  isWordUnknown(word: string): boolean {
    return this.unknownWords.has(word);
  }

  /**
   * Get the current session stats
   */
  getCurrentSession(): StudySession {
    return { ...this.currentSession };
  }

  /**
   * Get known words count
   */
  getKnownWordsCount(): number {
    return this.knownWords.size;
  }

  /**
   * Get unknown words count
   */
  getUnknownWordsCount(): number {
    return this.unknownWords.size;
  }

  /**
   * Get all known words
   */
  getKnownWords(): string[] {
    return Array.from(this.knownWords);
  }

  /**
   * Get all unknown words
   */
  getUnknownWords(): string[] {
    return Array.from(this.unknownWords);
  }

  /**
   * Calculate success rate for current session
   */
  getCurrentSessionSuccessRate(): number {
    if (this.currentSession.totalWordsStudied === 0) return 0;
    return Math.round((this.currentSession.knownCount / this.currentSession.totalWordsStudied) * 100);
  }

  /**
   * Calculate overall success rate
   */
  getOverallSuccessRate(): number {
    const totalWords = this.knownWords.size + this.unknownWords.size;
    if (totalWords === 0) return 0;
    return Math.round((this.knownWords.size / totalWords) * 100);
  }

  /**
   * Reset current session stats
   */
  async resetCurrentSession(): Promise<void> {
    this.currentSession = {
      knownCount: 0,
      unknownCount: 0,
      totalWordsStudied: 0,
      sessionDate: new Date()
    };
    
    await this.saveCurrentSession();
    console.log('Current session reset');
  }

  /**
   * Clear all progress data
   */
  async clearAllProgress(): Promise<void> {
    this.knownWords.clear();
    this.unknownWords.clear();
    
    await this.resetCurrentSession();
    await this.saveProgress();
    
    console.log('All progress cleared');
  }

  /**
   * Start a new study session (usually called on new day)
   */
  async startNewSession(): Promise<void> {
    // Save previous session to history if it had activity
    if (this.currentSession.totalWordsStudied > 0) {
      await this.saveSessionToHistory();
    }
    
    // Reset current session
    await this.resetCurrentSession();
  }

  /**
   * Save progress to Capacitor Preferences
   */
  private async saveProgress(): Promise<void> {
    try {
      // Save known words
      await Preferences.set({
        key: this.KNOWN_WORDS_KEY,
        value: JSON.stringify(Array.from(this.knownWords))
      });

      // Save unknown words
      await Preferences.set({
        key: this.UNKNOWN_WORDS_KEY,
        value: JSON.stringify(Array.from(this.unknownWords))
      });

      // Save current session
      await this.saveCurrentSession();
      
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  }

  /**
   * Save current session data
   */
  private async saveCurrentSession(): Promise<void> {
    try {
      await Preferences.set({
        key: this.CURRENT_SESSION_KEY,
        value: JSON.stringify(this.currentSession)
      });
    } catch (error) {
      console.error('Error saving current session:', error);
    }
  }

  /**
   * Save session to history
   */
  private async saveSessionToHistory(): Promise<void> {
    try {
      const historyResult = await Preferences.get({ key: this.STUDY_SESSIONS_KEY });
      let sessions: StudySession[] = [];
      
      if (historyResult.value) {
        sessions = JSON.parse(historyResult.value).map((session: any) => ({
          ...session,
          sessionDate: new Date(session.sessionDate)
        }));
      }
      
      sessions.push({ ...this.currentSession });
      
      // Keep only last 30 sessions
      if (sessions.length > 30) {
        sessions = sessions.slice(-30);
      }
      
      await Preferences.set({
        key: this.STUDY_SESSIONS_KEY,
        value: JSON.stringify(sessions)
      });
      
      console.log('Session saved to history');
    } catch (error) {
      console.error('Error saving session to history:', error);
    }
  }

  /**
   * Get study sessions history
   */
  async getSessionHistory(): Promise<StudySession[]> {
    try {
      const result = await Preferences.get({ key: this.STUDY_SESSIONS_KEY });
      if (result.value) {
        return JSON.parse(result.value).map((session: any) => ({
          ...session,
          sessionDate: new Date(session.sessionDate)
        }));
      }
      return [];
    } catch (error) {
      console.error('Error loading session history:', error);
      return [];
    }
  }

  /**
   * Check if two dates are on the same day
   */
  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  /**
   * Export progress data for backup
   */
  async exportProgress(): Promise<string> {
    const data = {
      knownWords: Array.from(this.knownWords),
      unknownWords: Array.from(this.unknownWords),
      currentSession: this.currentSession,
      sessionHistory: await this.getSessionHistory(),
      exportDate: new Date().toISOString()
    };
    
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import progress data from backup
   */
  async importProgress(jsonData: string): Promise<void> {
    try {
      const data = JSON.parse(jsonData);
      
      this.knownWords = new Set(data.knownWords || []);
      this.unknownWords = new Set(data.unknownWords || []);
      
      if (data.currentSession) {
        this.currentSession = {
          ...data.currentSession,
          sessionDate: new Date(data.currentSession.sessionDate)
        };
      }
      
      // Save imported data
      await this.saveProgress();
      
      // Save session history if provided
      if (data.sessionHistory) {
        await Preferences.set({
          key: this.STUDY_SESSIONS_KEY,
          value: JSON.stringify(data.sessionHistory)
        });
      }
      
      console.log('Progress imported successfully');
    } catch (error) {
      console.error('Error importing progress:', error);
      throw new Error('Invalid progress data format');
    }
  }
}
