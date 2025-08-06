import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Flashcard, FlashcardDeck } from '../models/flashcard.model';

@Injectable({
  providedIn: 'root'
})
export class FlashcardService {
  private decksSubject = new BehaviorSubject<FlashcardDeck[]>([]);
  public decks$ = this.decksSubject.asObservable();

  private currentDeckSubject = new BehaviorSubject<FlashcardDeck | null>(null);
  public currentDeck$ = this.currentDeckSubject.asObservable();

  constructor() {
    this.loadDecks();
  }

  private loadDecks(): void {
    // Load decks from localStorage or initialize with sample data
    const savedDecks = localStorage.getItem('flashcard-decks');
    if (savedDecks) {
      const decks = JSON.parse(savedDecks);
      this.decksSubject.next(decks);
    } else {
      // Initialize with sample B1 German vocabulary
      this.initializeSampleData();
    }
  }

  private initializeSampleData(): void {
    const sampleDeck: FlashcardDeck = {
      id: 'sample-b1-deck',
      name: 'B1 German Vocabulary',
      description: 'Essential vocabulary for B1 level German',
      cards: [
        {
          id: '1',
          german: 'die Bewerbung',
          english: 'application',
          category: 'work',
          difficulty: 'B1',
          example: 'Ich schicke meine Bewerbung an die Firma.',
          created: new Date(),
          reviewCount: 0,
          correctCount: 0
        },
        {
          id: '2',
          german: 'der Umzug',
          english: 'move (relocation)',
          category: 'housing',
          difficulty: 'B1',
          example: 'Der Umzug in die neue Wohnung war anstrengend.',
          created: new Date(),
          reviewCount: 0,
          correctCount: 0
        }
      ],
      created: new Date(),
      lastModified: new Date()
    };

    this.decksSubject.next([sampleDeck]);
    this.saveDecks();
  }

  private saveDecks(): void {
    localStorage.setItem('flashcard-decks', JSON.stringify(this.decksSubject.value));
  }

  getDeckById(id: string): FlashcardDeck | undefined {
    return this.decksSubject.value.find(deck => deck.id === id);
  }

  setCurrentDeck(deck: FlashcardDeck | null): void {
    this.currentDeckSubject.next(deck);
  }

  addDeck(deck: FlashcardDeck): void {
    const currentDecks = this.decksSubject.value;
    this.decksSubject.next([...currentDecks, deck]);
    this.saveDecks();
  }

  updateDeck(updatedDeck: FlashcardDeck): void {
    const currentDecks = this.decksSubject.value;
    const index = currentDecks.findIndex(deck => deck.id === updatedDeck.id);
    if (index !== -1) {
      currentDecks[index] = updatedDeck;
      this.decksSubject.next([...currentDecks]);
      this.saveDecks();
    }
  }

  deleteDeck(id: string): void {
    const currentDecks = this.decksSubject.value;
    const filteredDecks = currentDecks.filter(deck => deck.id !== id);
    this.decksSubject.next(filteredDecks);
    this.saveDecks();
  }
}
