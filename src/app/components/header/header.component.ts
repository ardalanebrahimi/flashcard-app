import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AddWordComponent } from '../add-word/add-word.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, AddWordComponent],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  @ViewChild(AddWordComponent) addWordComponent!: AddWordComponent;

  /**
   * Open the add word dialog
   */
  openAddWordDialog(): void {
    this.addWordComponent.toggle();
  }
}
