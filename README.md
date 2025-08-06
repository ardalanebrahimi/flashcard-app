# German Flashcard App (B1 Level)

A modern flashcard app for learning German vocabulary at B1 level, built with Angular 19 and Capacitor for cross-platform mobile deployment.

## ✨ Features

- **🎯 B1 German Vocabulary**: Curated intermediate German words and phrases
- **📱 Cross-Platform**: Native Android app with web fallback
- **💾 Persistent Progress**: Uses Capacitor Preferences for data storage
- **📊 Progress Tracking**: Session-based and overall learning statistics
- **🔄 Smart Study Mode**: Shuffled words with progress indicators
- **🎨 Mobile-First Design**: Responsive UI optimized for touch devices
- **🏠 Dual Navigation**: Home dashboard + dedicated study interface
- **📤 Export/Import**: Backup and restore your learning progress

## 🛠️ Tech Stack

- **Frontend**: Angular 19 with standalone components
- **Mobile**: Capacitor 7 with Android platform
- **Storage**: Capacitor Preferences API
- **Language**: TypeScript with strict mode
- **Styling**: CSS3 with responsive design
- **HTTP**: Angular HttpClient for data loading

## 📱 Development

### Prerequisites

- Node.js 18+ 
- Angular CLI 19+
- Android Studio (for Android development)
- Java 11+ (for Android builds)

### Getting Started

1. **Clone and install**:
   ```bash
   git clone <repository-url>
   cd german-flashcard
   npm install
   ```

2. **Start development server**:
   ```bash
   npm start
   # Opens at http://localhost:4200
   ```

3. **Build for production**:
   ```bash
   npm run build:prod
   ```

### 📱 Android Development

#### Available Scripts

```bash
# Build and sync for Android
npm run cap:build:android

# Open in Android Studio
npm run cap:open:android

# Run on connected Android device
npm run cap:run:android

# Development workflow (build + sync + open)
npm run android:dev

# Sync only (after making changes)
npm run cap:sync:android
```

#### Development Workflow

1. **First-time Android setup**:
   ```bash
   npm run cap:build:android
   npm run cap:open:android
   ```

2. **Daily development**:
   ```bash
   # Make your Angular changes...
   npm run android:dev  # Builds, syncs, and opens Android Studio
   ```

3. **Quick updates**:
   ```bash
   npm run cap:build:android  # Only when you need to sync changes
   ```

#### Android Requirements

- **Android Studio**: Latest stable version
- **Android SDK**: API 24+ (Android 7.0)
- **Java**: JDK 11 or newer
- **Gradle**: Handled by Android Studio

## 📂 Project Structure

```
src/
├── app/
│   ├── components/           # UI Components
│   │   ├── home.component.*             # Home dashboard
│   │   ├── flashcard.component.*        # Main flashcard interface  
│   │   └── flashcard-page.component.*   # Flashcard page wrapper
│   ├── services/             # Business Logic
│   │   ├── word.service.ts              # Word management & RxJS
│   │   └── progress.service.ts          # Capacitor Preferences storage
│   ├── models/               # TypeScript Interfaces
│   │   ├── word.model.ts                # Word data structure
│   │   └── flashcard.model.ts           # Flashcard interfaces
│   ├── app.routes.ts         # Standalone routing config
│   └── app.config.ts         # App providers
├── assets/
│   └── words.json            # B1 German vocabulary data
└── android/                  # Capacitor Android project
```

## 🎯 App Features

### 🏠 Home Page (`/`)
- Progress overview (session + overall stats)
- Quick access to flashcard study mode
- Data management (export/import/clear)
- Success rate calculations

### 📚 Flashcard Page (`/flashcards`)
- Interactive word study interface
- "Show Meaning" reveal functionality
- "I know it" / "I don't know it" tracking
- Previous study indicators
- Session controls (shuffle, reset)

### 💾 Progress Persistence
- **Capacitor Preferences**: Native storage on Android
- **Automatic Syncing**: Progress saved on every interaction
- **Session Management**: Daily session tracking
- **Export/Import**: JSON backup functionality

## 🔧 Configuration

### Capacitor Configuration (`capacitor.config.ts`)
```typescript
{
  appId: 'com.example.germanflashcard',
  appName: 'German Flashcard',
  webDir: 'dist/german-flashcard-temp/browser',
  android: {
    allowMixedContent: true
  },
  plugins: {
    Preferences: {
      group: 'com.example.germanflashcard.preferences'
    }
  }
}
```

### Build Configuration
- **Angular 17+**: Uses `browser` subfolder in dist
- **Assets**: Automatically includes `src/assets/words.json`
- **CSS Budget**: Increased for mobile-optimized components
- **Production Build**: Optimized for mobile performance

## 🚀 Deployment

### Android APK
1. **Build for production**:
   ```bash
   npm run cap:build:android
   ```

2. **Open Android Studio**:
   ```bash
   npm run cap:open:android
   ```

3. **Generate APK**: In Android Studio → Build → Build Bundle(s)/APK(s) → Build APK(s)

### Progressive Web App
- Built-in PWA support via Angular
- Offline-capable with service worker
- Installable on mobile browsers

## 📊 Data Structure

### Word Format (`assets/words.json`)
```json
[
  {
    "word": "die Bewerbung",
    "lesson": "1"
  },
  {
    "word": "der Umzug", 
    "lesson": "2"
  }
]
```

### Progress Storage (Capacitor Preferences)
- **Known Words**: Set of mastered vocabulary
- **Unknown Words**: Set of words needing review
- **Session Data**: Daily study statistics
- **Session History**: Last 30 study sessions

## 🤝 Contributing

This is a learning project showcasing modern Angular + Capacitor development. Feel free to fork and adapt!

## 📄 License

MIT License - see LICENSE file for details.
