import { Routes } from '@angular/router';
import { HomeComponent } from './components/home.component';
import { FlashcardPageComponent } from './components/flashcard-page.component';
import { WordsListComponent } from './components/words-list.component';
import { BookmarksComponent } from './components/bookmarks/bookmarks.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'flashcards', component: FlashcardPageComponent },
  { path: 'words', component: WordsListComponent },
  { path: 'bookmarks', component: BookmarksComponent },
  { path: '**', redirectTo: '' }
];
