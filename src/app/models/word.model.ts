export interface Word {
  word: string;
  translation: string;
  article?: string; // German article (der, die, das) for nouns
  bookmarked?: boolean;
  lastResults?: ("correct" | "wrong")[];
  score?: number; // Cached score to avoid recalculation
  isCustomTranslation?: boolean; // Indicates if this is an improved translation
  originalTranslation?: string; // Store original translation for reference
}
