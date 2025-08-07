import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { WordService } from '../services/word.service';
import { ProgressService } from '../services/progress.service';
import { WordTrackingService } from '../services/word-tracking.service';
import { DictionaryService } from '../services/dictionary.service';
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
  
  private subscription = new Subscription();

  constructor(
    private wordService: WordService,
    private progressService: ProgressService,
    private wordTrackingService: WordTrackingService,
    private dictionaryService: DictionaryService
  ) {}

  ngOnInit() {
    // Subscribe to current word updates
    this.subscription.add(
      this.wordService.currentWord$.subscribe(word => {
        this.currentWord = word;
        this.showMeaning = false; // Reset meaning visibility for new word
      })
    );

    // Load progress on startup
    this.progressService.loadProgress();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  onShowMeaning() {
    this.showMeaning = true;
  }

  async onKnowIt() {
    if (this.currentWord) {
      await this.progressService.markWordAsKnown(this.currentWord.word);
      
      // Also track in word tracking service
      const source = this.isCustomWord(this.currentWord) ? 'custom' : 'dictionary';
      await this.wordTrackingService.recordPractice(this.currentWord, true, source);
      
      this.nextWord();
    }
  }

  async onDontKnowIt() {
    if (this.currentWord) {
      await this.progressService.markWordAsUnknown(this.currentWord.word);
      
      // Also track in word tracking service
      const source = this.isCustomWord(this.currentWord) ? 'custom' : 'dictionary';
      await this.wordTrackingService.recordPractice(this.currentWord, false, source);
      
      this.nextWord();
    }
  }

  async onPracticeAgain() {
    if (this.currentWord) {
      await this.progressService.markWordForPracticeAgain(this.currentWord.word);
      
      // Also track in word tracking service
      const source = this.isCustomWord(this.currentWord) ? 'custom' : 'dictionary';
      await this.wordTrackingService.recordPractice(this.currentWord, false, source);
      
      this.nextWord();
    }
  }

  private isCustomWord(word: Word): boolean {
    const customWords = this.dictionaryService.getCustomWords();
    return customWords.some(cw => cw.word === word.word);
  }

  private nextWord() {
    this.wordService.getNextWord();
  }

  async onReset() {
    this.showMeaning = false;
    await this.progressService.resetCurrentSession();
    this.wordService.resetProgress();
  }

  onShuffle() {
    this.wordService.shuffle();
  }

  // Getters for template to access ProgressService data
  get knownCount(): number {
    return this.progressService.getCurrentSession().knownCount;
  }

  get unknownCount(): number {
    return this.progressService.getCurrentSession().unknownCount;
  }

  get practiceAgainCount(): number {
    return this.progressService.getCurrentSession().practiceAgainCount;
  }

  get totalWordsStudied(): number {
    return this.progressService.getCurrentSession().totalWordsStudied;
  }

  get successRate(): number {
    return this.progressService.getCurrentSessionSuccessRate();
  }

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

  // Check if current word has been studied before
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
    }
  }
}
