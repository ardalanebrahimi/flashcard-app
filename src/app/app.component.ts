import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FlashcardComponent } from './components/flashcard.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, FlashcardComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'German Flashcard App';
}
