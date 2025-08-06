import { Routes } from '@angular/router';
import { HomeComponent } from './components/home.component';
import { FlashcardPageComponent } from './components/flashcard-page.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'flashcards', component: FlashcardPageComponent },
  { path: '**', redirectTo: '' }
];
