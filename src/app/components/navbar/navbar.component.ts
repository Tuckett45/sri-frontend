import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  standalone: false
})
export class NavbarComponent {
  isMenuOpen = false;  // Track if the menu is open or not

  constructor(public authService: AuthService) {}

  // Function to toggle the menu on and off
  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  logout(): void {
    this.authService.logout();
  }
}
