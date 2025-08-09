import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AddWordComponent } from '../add-word/add-word.component';
import { LevelService, LanguageLevel } from '../../services/level.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, AddWordComponent],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  @ViewChild(AddWordComponent) addWordComponent!: AddWordComponent;

  currentLevel: LanguageLevel = 'B1';
  availableLevels: LanguageLevel[] = [];

  constructor(private levelService: LevelService) {
    this.availableLevels = this.levelService.getAvailableLevels();
    
    // Initialize with current level
    this.currentLevel = this.levelService.getCurrentLevel();
    
    // Subscribe to current level changes
    this.levelService.currentLevel$.subscribe(level => {
      this.currentLevel = level;
      console.log(`Header: Level updated to ${level}`);
    });
  }

  /**
   * Open the add word dialog
   */
  openAddWordDialog(): void {
    this.addWordComponent.toggle();
  }

  /**
   * Handle level selection change
   */
  async onLevelChange(event: Event): Promise<void> {
    const target = event.target as HTMLSelectElement;
    const newLevel = target.value as LanguageLevel;
    
    if (newLevel !== this.currentLevel) {
      await this.levelService.setCurrentLevel(newLevel);
    }
  }
}
