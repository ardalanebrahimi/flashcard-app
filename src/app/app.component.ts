import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'German Flashcard App';

  async ngOnInit() {
    // Configure status bar for mobile platforms
    if (Capacitor.isNativePlatform()) {
      await this.setupStatusBar();
      this.setupSafeAreas();
    }
  }

  private async setupStatusBar() {
    try {
      // Ensure status bar is shown and not overlaying content
      await StatusBar.show();
      
      // Explicitly disable overlay mode
      await StatusBar.setOverlaysWebView({ overlay: false });
      
      // Set status bar style
      await StatusBar.setStyle({ style: Style.Default });
      
      // Set status bar background color
      await StatusBar.setBackgroundColor({ color: '#007bff' });
      
      console.log('Status bar configured successfully');
      
    } catch (error) {
      console.warn('Status bar configuration failed:', error);
    }
  }

  private setupSafeAreas() {
    // Add dynamic safe area detection for Android
    if (Capacitor.getPlatform() === 'android') {
      this.detectAndroidNavigationBar();
    }
  }

  private detectAndroidNavigationBar() {
    // Check if device has navigation bar by comparing window dimensions
    const windowHeight = window.innerHeight;
    const screenHeight = window.screen.height;
    
    // Estimate navigation bar height based on the difference
    const navBarHeight = screenHeight - windowHeight;
    
    if (navBarHeight > 20) { // Likely has navigation bar
      // Set CSS custom property for navigation bar height
      document.documentElement.style.setProperty('--detected-nav-bar-height', `${navBarHeight}px`);
      console.log('Detected Android navigation bar height:', navBarHeight);
    } else {
      // No navigation bar detected (gestures mode or hardware buttons)
      document.documentElement.style.setProperty('--detected-nav-bar-height', '0px');
      console.log('No Android navigation bar detected');
    }
  }
}
