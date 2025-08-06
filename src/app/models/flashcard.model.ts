export interface Flashcard {
  id: string;
  german: string;
  english: string;
  category?: string;
  difficulty?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  pronunciation?: string;
  example?: string;
  created: Date;
  lastReviewed?: Date;
  reviewCount: number;
  correctCount: number;
}

export interface FlashcardDeck {
  id: string;
  name: string;
  description?: string;
  cards: Flashcard[];
  created: Date;
  lastModified: Date;
}

export interface StudySession {
  id: string;
  deckId: string;
  startTime: Date;
  endTime?: Date;
  cardsStudied: number;
  correctAnswers: number;
  incorrectAnswers: number;
}
