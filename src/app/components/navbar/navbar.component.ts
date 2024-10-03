import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service'; // Import AuthService

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {
  constructor(private authService: AuthService) {}

  logout(): void {
    // Use AuthService to log out
    this.authService.logout();
  }
}