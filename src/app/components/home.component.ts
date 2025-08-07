import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProgressService } from '../services/progress.service';
import { SessionService, SessionConfig } from '../services/session.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  sessionConfig: SessionConfig = { cardsPerSession: 20, sessionType: 'mixed' };
  showSessionSettings = false;
  
  constructor(
    private progressService: ProgressService,
    private sessionService: SessionService
  ) {}

  ngOnInit() {
    this.loadSessionConfig();
  }

  private async loadSessionConfig() {
    this.sessionConfig = this.sessionService.getSessionConfig();
  }

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

  // Session configuration methods
  toggleSessionSettings() {
    this.showSessionSettings = !this.showSessionSettings;
  }

  async updateSessionConfig() {
    await this.sessionService.updateSessionConfig(this.sessionConfig);
    this.showSessionSettings = false;
  }

  get sessionSizeOptions() {
    return [
      { value: 10, label: '10 cards' },
      { value: 15, label: '15 cards' },
      { value: 20, label: '20 cards' },
      { value: 25, label: '25 cards' },
      { value: 30, label: '30 cards' },
      { value: 40, label: '40 cards' },
      { value: 50, label: '50 cards' }
    ];
  }

  get sessionTypeOptions() {
    return [
      { value: 'mixed', label: 'Mixed (All Words)' },
      { value: 'new', label: 'New Words Only' },
      { value: 'review', label: 'Review Previous' },
      { value: 'difficult', label: 'Difficult Words' }
    ];
  }
}
