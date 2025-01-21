import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: false
})
export class AppComponent {
  title = 'SRI Tools';
  isUserLoggedIn: boolean = false;

  constructor(public router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    this.authService.getLoginStatus().subscribe(status => {
      this.isUserLoggedIn = status;
    });
  }
}
