import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProgressService } from '../services/progress.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  
  constructor(private progressService: ProgressService) {}

  // Progress getters for template
  get overallKnownCount(): number {
    return this.progressService.getKnownWordsCount();
  }

  get overallUnknownCount(): number {
    return this.progressService.getUnknownWordsCount();
  }

  get overallSuccessRate(): number {
    return this.progressService.getOverallSuccessRate();
  }

  get currentSessionStats() {
    return this.progressService.getCurrentSession();
  }

  get hasAnyProgress(): boolean {
    return this.overallKnownCount > 0 || this.overallUnknownCount > 0;
  }

  async onClearAllProgress() {
    if (confirm('Are you sure you want to clear all progress? This cannot be undone.')) {
      await this.progressService.clearAllProgress();
    }
  }

  async onExportProgress() {
    try {
      const progressData = await this.progressService.exportProgress();
      const blob = new Blob([progressData], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `flashcard-progress-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting progress:', error);
      alert('Failed to export progress. Please try again.');
    }
  }

  onImportProgress() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (event: any) => {
      const file = event.target.files[0];
      if (file) {
        try {
          const text = await file.text();
          await this.progressService.importProgress(text);
          alert('Progress imported successfully!');
        } catch (error) {
          console.error('Error importing progress:', error);
          alert('Failed to import progress. Please check the file format.');
        }
      }
    };
    input.click();
  }
}
