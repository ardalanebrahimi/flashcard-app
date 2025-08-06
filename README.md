# German Flashcard App (B1 Level)

A simple, modern flashcard app for learning German vocabulary at B1 level, built with Angular 19 and Capacitor for cross-platform deployment.

## 🚀 Features

- **Standalone Angular Components**: Modern Angular architecture without AppModule
- **B1 German Vocabulary**: Focused on intermediate German learning
- **Cross-Platform**: Deploy to Android via Capacitor
- **Progressive Web App**: Works offline and can be installed
- **Responsive Design**: Mobile-first approach

## 🛠️ Tech Stack

- **Frontend**: Angular 19 with standalone components
- **Mobile**: Capacitor 6
- **Language**: TypeScript
- **Styling**: CSS3 with modern features
- **Build Tool**: Angular CLI

## 📱 Development

### Prerequisites

- Node.js 18+ 
- Angular CLI 19+
- Android Studio (for Android development)

### Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   ng serve
   ```

3. **Build for production**:
   ```bash
   ng build
   ```

### Mobile Development

1. **Sync with Capacitor**:
   ```bash
   npx cap sync
   ```

2. **Open in Android Studio**:
   ```bash
   npx cap open android
   ```

3. **Run on Android device**:
   ```bash
   npx cap run android
   ```

## 📂 Project Structure

```
src/
├── app/
│   ├── app.component.ts     # Main app component (standalone)
│   ├── app.component.html   # App template
│   ├── app.component.css    # App styles
│   ├── app.config.ts        # App configuration
│   └── app.routes.ts        # Routing configuration
├── assets/                  # Static assets
└── main.ts                  # App bootstrap
```

## 🎯 Planned Features

- [ ] Flashcard deck management
- [ ] Spaced repetition algorithm
- [ ] Audio pronunciation
- [ ] Progress tracking
- [ ] Offline support
- [ ] Import/export functionality
- [ ] Dark mode support

## 🤝 Contributing

This is a personal learning project. Feel free to fork and adapt for your own use!

## 📄 License

MIT License - see LICENSE file for details.
