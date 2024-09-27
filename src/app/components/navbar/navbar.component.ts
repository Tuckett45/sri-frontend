import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {
  constructor(private router: Router) {}

  logout(): void {
    // Clear user session or token (optional: use localStorage)
    localStorage.removeItem('loggedIn');
    this.router.navigate(['/login']); // Redirect to login page
  }
}