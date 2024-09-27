import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'SRI Tools';

  constructor(public router: Router) {}

  // Check if user is logged in (e.g., by checking localStorage)
  isLoggedIn(): boolean {
    return localStorage.getItem('loggedIn') === 'true';
  }
}
