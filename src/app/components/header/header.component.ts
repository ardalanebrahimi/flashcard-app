import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AddWordComponent } from '../add-word/add-word.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, AddWordComponent],
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
