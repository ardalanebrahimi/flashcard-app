# Copilot Instructions for German Flashcard App

## Project Overview
This is a B1 German flashcard app built with Angular 19 using standalone components and Capacitor for mobile deployment.

## Architecture Guidelines

### Component Structure
- Use standalone components only (no AppModule)
- Follow Angular's component-based architecture
- Keep components focused and single-purpose
- Use dependency injection for services

### TypeScript & Angular Patterns
- Use strict TypeScript configuration
- Implement reactive patterns with RxJS
- Use Angular's built-in form handling
- Leverage Angular's change detection strategy

### Mobile-First Design
- Design for mobile screens first
- Use responsive CSS Grid and Flexbox
- Implement touch-friendly interactions
- Consider offline functionality

## Code Style

### TypeScript
- Use interfaces for type definitions
- Prefer const assertions for literal types
- Use optional chaining and nullish coalescing
- Implement proper error handling

### Angular
- Use OnPush change detection when possible
- Implement proper component lifecycle hooks
- Use trackBy functions for *ngFor loops
- Follow Angular's style guide

### CSS
- Use CSS custom properties for theming
- Implement mobile-first responsive design
- Use semantic class names
- Avoid deep selector nesting

## Key Features to Implement

### Core Functionality
1. **Flashcard Management**
   - Create, edit, delete flashcards
   - Organize cards into decks
   - Import/export functionality

2. **Study System**
   - Spaced repetition algorithm
   - Progress tracking
   - Study statistics

3. **User Experience**
   - Smooth animations
   - Offline support
   - Dark mode toggle
   - Audio pronunciation

### Mobile Features
- Swipe gestures for card navigation
- Pull-to-refresh functionality
- Native mobile navigation
- Device storage integration

## Dependencies

### Core
- Angular 19+ with standalone components
- RxJS for reactive programming
- TypeScript for type safety

### Mobile
- Capacitor 6 for native functionality
- Platform-specific plugins as needed

### Utilities
- date-fns for date manipulation
- uuid for ID generation

## Development Guidelines

### File Organization
```
src/app/
├── components/         # Reusable UI components
├── pages/             # Route components
├── services/          # Business logic services
├── models/            # TypeScript interfaces
├── utils/             # Helper functions
└── assets/            # Static resources
```

### Testing
- Write unit tests for all services
- Test components with TestBed
- Use Jasmine and Karma for testing
- Implement E2E tests for critical paths

### Performance
- Use OnPush change detection
- Implement lazy loading for routes
- Optimize bundle size
- Cache frequently used data

## Capacitor Integration

### Build Process
1. `ng build` - Build Angular app
2. `npx cap sync` - Sync with native platforms
3. `npx cap open android` - Open in Android Studio

### Native Features
- Local storage for offline data
- Device file system access
- Audio playback capabilities
- Push notifications (future)

## Security Considerations
- Sanitize user input
- Implement proper data validation
- Use secure storage for sensitive data
- Follow OWASP guidelines

Remember to maintain clean, readable code and follow Angular best practices throughout development.
# Workspace AI Coding Instructions

## File Size & Structure

-   Do not generate large files. Avoid files larger than 300 lines of code.
-   Split logic, UI, and types/interfaces into separate files.
-   Favor modularity: break features into reusable components or services.

## Coding Practices

-   Use TypeScript strictly, separating concerns cleanly.
-   Prefer composition and reusability over duplication.
-   Avoid mixing unrelated responsibilities in the same file.

## Agent Behavior

-   Never run, test, or debug the code automatically. I will handle execution myself.
-   If you finish a task and think a related file or update is needed, always ask before doing it.
-   When I give a prompt, analyze and ask clarification questions if anything is ambiguous.
-   Do not make assumptions or invent missing requirements — always confirm with me first.

## Defaults

-   Assume I want to stay in control of the development process.
-   Favor clean code and maintainability over shortcut solutions.
