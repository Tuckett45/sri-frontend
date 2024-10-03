import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private loggedInStatus: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(this.isLoggedIn());

  constructor(private router: Router) { }

  isLoggedIn(): boolean {
    return localStorage.getItem('loggedIn') === 'true';
  }

  getLoginStatus(): Observable<boolean> {
    return this.loggedInStatus.asObservable();
  }

  login(): void {
    localStorage.setItem('loggedIn', 'true');
    this.loggedInStatus.next(true);
  }

  logout(): void {
    // Clear authentication state
    localStorage.removeItem('loggedIn');
    sessionStorage.removeItem('authToken');
    
    // Set the login status to false to reflect changes
    this.loggedInStatus.next(false);
    
    // Redirect to login page to ensure the state is reset
    this.router.navigate(['/login']);
  }
}