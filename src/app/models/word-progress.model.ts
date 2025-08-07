export interface WordProgress {
  word: string;
  translation: string;
  source: 'dictionary' | 'custom';
  status: 'new' | 'learning' | 'mastered';
  practiceCount: number;
  correctCount: number;
  wrongCount: number;
  lastStudied?: Date;
  firstStudied?: Date;
  masteredDate?: Date;
  difficulty?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  category?: string;
}

export interface WordStatistics {
  totalWords: number;
  newWords: number;
  learningWords: number;
  masteredWords: number;
  totalPractices: number;
  overallAccuracy: number;
  dictionaryWords: number;
  customWords: number;
}

export type WordFilterStatus = 'all' | 'new' | 'learning' | 'mastered';
export type WordFilterSource = 'all' | 'dictionary' | 'custom';
export type WordSortBy = 'alphabetical' | 'lastStudied' | 'practiceCount' | 'accuracy' | 'dateAdded' | 'score';
export type SortDirection = 'asc' | 'desc';

export interface WordFilters {
  status: WordFilterStatus;
  source: WordFilterSource;
  searchTerm: string;
  sortBy: WordSortBy;
  sortDirection: SortDirection;
}
