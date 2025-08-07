export interface Word {
  word: string;
  translation: string;
  bookmarked?: boolean;
  lastResults?: ("correct" | "wrong")[];
}
