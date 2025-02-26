import { Component, OnInit } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss'],
  standalone: false
})
export class OverviewComponent implements OnInit {
  userRole: string = ''; // Store the user role here
  activeTab: number = 0;

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.userRole = this.authService.getUserRole(); 
  }

  // Logic to switch between tabs based on role
  switchTab(role: string) {
    switch (role) {
      case 'Client':
        this.activeTab = 0;
        break;
      case 'Vendor':
        this.activeTab = 1;
        break;
      case 'SRI':
        this.activeTab = 2;
        break;
      default:
        this.activeTab = 0;
        break;
    }
  }
}