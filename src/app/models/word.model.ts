export interface Word {
  word: string;
  translation: string;
  bookmarked?: boolean;
  lastResults?: ("correct" | "wrong")[];
  score?: number; // Cached score to avoid recalculation
}
