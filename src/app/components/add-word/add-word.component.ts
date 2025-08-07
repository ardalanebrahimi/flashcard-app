import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { DictionaryService } from '../../services/dictionary.service';
import { WordService } from '../../services/word.service';
import { Word } from '../../models/word.model';

@Component({
  selector: 'app-add-word',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-word.component.html',
  styleUrls: ['./add-word.component.css']
})
export class AddWordComponent implements OnInit, OnDestroy {
  isVisible = false;
  wordInput = '';
  isLoading = false;
  message = '';
  messageType: 'success' | 'error' | 'info' = 'info';
  
  private destroy$ = new Subject<void>();
  private existingWords: Word[] = [];

  constructor(
    private dictionaryService: DictionaryService,
    private wordService: WordService
  ) {}

  ngOnInit(): void {
    // Load existing words
    this.wordService.wordsLoaded$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loaded => {
        if (loaded) {
          this.existingWords = this.wordService.allWords;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Toggle the visibility of the add word dialog
   */
  toggle(): void {
    this.isVisible = !this.isVisible;
    
    if (this.isVisible) {
      this.tryFillFromClipboard();
      this.clearMessage();
      // Focus on input after a short delay to ensure dialog is rendered
      setTimeout(() => {
        const input = document.querySelector('#word-input') as HTMLInputElement;
        if (input) {
          input.focus();
        }
      }, 100);
    } else {
      this.wordInput = '';
      this.clearMessage();
    }
  }

  /**
   * Try to fill input from clipboard if it contains a single word
   */
  private async tryFillFromClipboard(): Promise<void> {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const clipboardText = await navigator.clipboard.readText();
        const trimmed = clipboardText.trim();
        
        // Check if clipboard contains exactly one word (no spaces, reasonable length)
        if (trimmed && 
            !trimmed.includes(' ') && 
            !trimmed.includes('\n') && 
            trimmed.length <= 50 &&
            trimmed.length >= 2) {
          this.wordInput = trimmed;
        }
      }
    } catch (error) {
      // Clipboard access might be denied, that's okay
      console.log('Could not access clipboard:', error);
    }
  }

  /**
   * Handle adding a new word
   */
  async onAddWord(): Promise<void> {
    const word = this.wordInput.trim();
    
    if (!word) {
      this.showMessage('Please enter a word', 'error');
      return;
    }

    this.isLoading = true;
    this.clearMessage();

    try {
      // First check if word exists in original dictionary
      const existingWord = this.dictionaryService.searchExistingWord(word, this.existingWords);
      if (existingWord) {
        this.showMessage(`✓ Word found in dictionary:\n\n"${existingWord.word}" = ${existingWord.translation}`, 'info');
        this.isLoading = false;
        this.wordInput = ''; // Clear input but keep dialog open
        return;
      }

      // Check if word exists in custom dictionary
      const customWord = this.dictionaryService.searchCustomWord(word);
      if (customWord) {
        this.showMessage(`✓ Word found in your custom dictionary:\n\n"${customWord.word}" = ${customWord.translation}`, 'info');
        this.isLoading = false;
        this.wordInput = ''; // Clear input but keep dialog open
        return;
      }

      // Add new word using OpenAI
      const result = await this.dictionaryService.addNewWord(word, this.existingWords);
      
      if (result.success && result.word) {
        this.showMessage(`✅ New word added:\n\n"${result.word.word}" = ${result.word.translation}`, 'success');
        this.wordInput = ''; // Clear input but keep dialog open for user to read translation
      } else {
        this.showMessage(result.error || 'Failed to add word', 'error');
      }
    } catch (error) {
      console.error('Error adding word:', error);
      this.showMessage('An error occurred while adding the word', 'error');
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Handle input keydown events
   */
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !this.isLoading) {
      this.onAddWord();
    } else if (event.key === 'Escape') {
      this.isVisible = false;
    }
  }

  /**
   * Close the dialog
   */
  close(): void {
    this.isVisible = false;
    this.wordInput = '';
    this.clearMessage();
  }

  /**
   * Show a message to the user
   */
  private showMessage(text: string, type: 'success' | 'error' | 'info'): void {
    this.message = text;
    this.messageType = type;
  }

  /**
   * Clear the message
   */
  private clearMessage(): void {
    this.message = '';
  }
}
