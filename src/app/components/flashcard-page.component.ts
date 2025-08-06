import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FlashcardComponent } from './flashcard.component';

@Component({
  selector: 'app-flashcard-page',
  standalone: true,
  imports: [CommonModule, RouterModule, FlashcardComponent],
  templateUrl: './flashcard-page.component.html',
  styleUrls: ['./flashcard-page.component.css']
})
export class FlashcardPageComponent {
  
}
