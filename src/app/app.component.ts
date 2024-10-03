import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'SRI Tools';
  isUserLoggedIn: boolean = false;

  constructor(public router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    // Initialize the logged-in status when the component is loaded
    this.isUserLoggedIn = this.authService.isLoggedIn();

    // Subscribe to changes in login state if your AuthService provides that capability
    this.authService.getLoginStatus().subscribe(status => {
      this.isUserLoggedIn = status;
    });
  }
}
