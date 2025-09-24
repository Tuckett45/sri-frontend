import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { User } from 'src/app/models/user.model';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  standalone: false
})
export class NavbarComponent {
  isMenuOpen = false;  // Track if the menu is open or not
  userData!: User;

  readonly notificationsEnabled = this.notificationService.notificationsEnabled;
  readonly unreadCount = this.notificationService.unreadCount;

  constructor(
    public authService: AuthService,
    private readonly notificationService: NotificationService
  ) {}

  // Function to toggle the menu on and off
  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  loadUserProfile(): void {
    const userString = localStorage.getItem('user');
    if (userString) {
      const userObj = JSON.parse(userString);

      this.userData = new User(
        userObj.id,
        userObj.name,
        userObj.email,
        userObj.password,
        userObj.role,
        userObj.market,
        userObj.company,
        new Date(userObj.createdDate),
        userObj.isApproved,
        userObj.approvalToken
      );
    }
  }

  logout(): void {
    this.authService.logout();
  }
}
