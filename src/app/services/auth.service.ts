import { HttpHeaders, HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { User } from '../models/user.model';
import { LoginModel } from '../models/login-model.model';
import { v4 as uuidv4 } from 'uuid';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private loggedInStatus: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(this.isLoggedIn());

  private apiUrl = 'https://localhost:7265/api/auth';

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };
  
  constructor(private router: Router, private http: HttpClient) { }

  register(user: User): Observable<User> {
    if (!user.id) {
      user.id = uuidv4();
      user.createdDate.toISOString();
    }
    debugger;
    return this.http.post<User>(`${this.apiUrl}/register`, user, this.httpOptions);
  }

  isLoggedIn(): boolean {
    return localStorage.getItem('loggedIn') === 'true';
  }

  getLoginStatus(): Observable<boolean> {
    return this.loggedInStatus.asObservable();
  }

  login(credentials: LoginModel): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, credentials, this.httpOptions).pipe(
      tap(response => localStorage.setItem('token', response))
    );
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/forgot-password`, { email }, this.httpOptions);
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
