# Word Scoring System

## Overview
The scoring system tracks the last 3 quiz results for each word and calculates a score based on correct answers.

## Features

### 1. Word Model Enhancement
- Added `lastResults?: ("correct" | "wrong")[]` to track recent performance
- Maximum of 3 entries per word

### 2. WordService Methods

#### `updateResults(word: Word, result: "correct" | "wrong")`
- Records quiz results for individual words
- Automatically maintains only last 3 results
- Persists data to device storage
- Called automatically when user answers flashcards

#### `calculateScore(word: Word): number`
- Returns count of correct answers in last 3 attempts (0-3)
- Safe handling of words with no history

#### `getAllWordsWithScores()`
- Returns all words with their current scores
- Useful for analytics and progress tracking

#### `clearAllWordResults()`
- Resets all word scoring data
- Integrated with existing progress clearing

### 3. Data Persistence
- Results stored in Capacitor Preferences under 'word-results' key
- Automatic loading on app start
- Synced with word objects throughout the app

### 4. UI Integration
- Score display in flashcard component: "🎯 Score: 2/3 correct (correct, wrong, correct)"
- Shows recent attempt history
- Integrated with existing progress indicators

## Usage

### Automatic Integration
The scoring system works automatically when users interact with flashcards:
- "I know it" → records "correct"
- "I don't know it" → records "wrong" 
- "Practice again" → records "wrong"

### Manual Usage
```typescript
// Update a word's results
await wordService.updateResults(word, "correct");

// Get current score
const score = wordService.calculateScore(word); // Returns 0-3

// Get all words with scores
const wordsWithScores = wordService.getAllWordsWithScores();
```

## Data Structure
```typescript
interface Word {
  word: string;
  translation: string;
  bookmarked?: boolean;
  lastResults?: ("correct" | "wrong")[]; // Max 3 entries
}
```

## Storage
- Key: 'word-results'
- Format: JSON object mapping word text to results array
- Example: `{"der Hund": ["correct", "wrong", "correct"]}`

## Benefits
- Identifies words that need more practice
- Tracks improvement over time
- Provides granular performance data
- Complements existing progress tracking
- No impact on existing functionality
