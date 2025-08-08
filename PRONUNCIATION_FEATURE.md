# German Pronunciation Feature

## Overview
The German flashcard app now includes a text-to-speech pronunciation feature that helps learners hear the correct German pronunciation of words. This feature includes intelligent caching to improve performance and reduce network usage.

## Features

### 🔊 German Text-to-Speech
- High-quality German pronunciation using browser's speech synthesis
- Automatically selects the best available German voice
- Fallback to system default voice if no German voice is available
- Optimized speech rate (0.8x) for better learning comprehension

### 📱 Mobile-Friendly Design
- Touch-optimized pronunciation button
- Responsive design that works on all screen sizes
- Proper accessibility with tooltips and disabled states

### 💾 Smart Caching System
- Caches pronunciation data locally for offline use
- Automatic cache expiry (30 days) to prevent stale data
- Cache statistics and management
- Graceful fallback when cache fails

### 🎯 User Experience
- Visual feedback during pronunciation (button icon changes)
- Non-blocking operation - doesn't interfere with flashcard flow
- Error handling with user-friendly messages
- Only shows when speech synthesis is supported

## Technical Implementation

### New Components
1. **PronunciationService** (`src/app/services/pronunciation.service.ts`)
   - Handles all text-to-speech functionality
   - Manages local caching of pronunciations
   - Provides German voice selection and configuration

2. **Enhanced FlashcardComponent**
   - Integrated pronunciation button in word display
   - Loading states and error handling
   - Responsive design updates

### Browser Compatibility
- Works in all modern browsers that support Web Speech API
- Gracefully degrades when speech synthesis is not available
- Progressive enhancement approach

### Performance Optimizations
- Local caching reduces repeated network requests
- Efficient memory management with cache size limits
- Non-blocking async operations

## Usage

### For Users
1. When viewing a flashcard, look for the 🔉 icon next to the German word
2. Click the pronunciation button to hear the German pronunciation
3. The button will show 🔊 while playing and return to 🔉 when finished
4. Works both online and offline (after first pronunciation is cached)

### For Developers
```typescript
// Inject the service
constructor(private pronunciationService: PronunciationService) {}

// Use pronunciation
async playPronunciation(word: string) {
  try {
    await this.pronunciationService.pronounceWord(word);
  } catch (error) {
    console.error('Pronunciation failed:', error);
  }
}

// Check browser support
if (this.pronunciationService.isSpeechSynthesisSupported()) {
  // Show pronunciation features
}

// Get cache statistics
const stats = this.pronunciationService.getCacheStats();
console.log(`Cache: ${stats.size} words, ${stats.totalSizeKB}KB`);
```

## Configuration

### Voice Selection
The service automatically selects the best German voice:
1. Prefers native/local German voices (de-DE)
2. Falls back to any German variant (de-*)
3. Uses system default voice as last resort

### Cache Management
- **Storage**: localStorage
- **Expiry**: 30 days
- **Key**: 'german_pronunciation_cache'
- **Auto-cleanup**: Removes expired entries on load

## Accessibility
- Proper ARIA labels and tooltips
- Keyboard accessible
- Screen reader friendly
- Visual feedback for all states

## Future Enhancements
- Support for additional pronunciation providers
- Phonetic transcription display
- Speed control for pronunciation
- Download for offline pronunciation packs
- Voice selection preferences

## Browser Support
- ✅ Chrome/Chromium (excellent German voices)
- ✅ Firefox (good German voices)
- ✅ Safari (system German voices)
- ✅ Edge (Windows German voices)
- ⚠️ Mobile browsers (limited voice selection)

## Troubleshooting

### No Pronunciation Button
- Check if your browser supports Web Speech API
- Ensure JavaScript is enabled
- Try refreshing the page

### Poor Voice Quality
- Install additional language packs on your system
- Check browser voice settings
- Consider using Chrome for best German voice quality

### Cache Issues
- Clear browser localStorage to reset cache
- Check browser storage quotas
- Use developer tools to inspect cache size

## Testing
Comprehensive unit tests are included in `pronunciation.service.spec.ts` covering:
- Service initialization
- Browser compatibility detection
- Cache management
- Error handling
- Voice selection logic
