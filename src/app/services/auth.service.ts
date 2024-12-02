import { HttpHeaders, HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { User } from '../models/user.model';
import { LoginModel } from '../models/login-model.model';
import { environment } from '../../environments/environments';
import { v4 as uuidv4 } from 'uuid';
import { UserRole } from '../models/role.enum';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private loggedInStatus: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(this.isLoggedIn());
  private userRole: BehaviorSubject<UserRole> = new BehaviorSubject<UserRole>(UserRole.CM);

  private apiUrl = '${environment.apiUrl}/auth';

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': environment.apiSubscriptionKey
    })
  };
  
  constructor(private router: Router, private http: HttpClient) {
    this.loadUserFromLocalStorage();
   }

  register(user: User): Observable<User> {
    if (!user.id) {
      user.id = uuidv4();
      user.createdDate.toISOString();
    }
    return this.http.post<User>(`${environment.apiUrl}/auth/register`, user, this.httpOptions);
  }

  getUserById(userId: string){
    return this.http.get<User>(`${environment.apiUrl}/auth/user-${userId}`, this.httpOptions);
  }

  setUserRole(role: string) {
    this.userRole.next(role as UserRole);
  }

  getUserRole(): UserRole {
    return this.userRole.getValue();
  }

  isUserInRole(roles: UserRole[]): boolean {
    return roles.includes(this.getUserRole()); 
  }

  isClient() {
      return this.userRole.getValue() === 'Client';
  }

  isPM() {
      return this.userRole.getValue() === 'PM';
  }

  isCM() {
      return this.userRole.getValue() === 'CM';
  }

  isLoggedIn(): boolean {
    return localStorage.getItem('loggedIn') === 'true';
  }

  getLoginStatus(): Observable<boolean> {
    return this.loggedInStatus.asObservable();
  }

  login(credentials: LoginModel): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/auth/login`, credentials, this.httpOptions).pipe(
      tap(user => {
        if (user) {
          localStorage.setItem('loggedIn', 'true');
          localStorage.setItem('user', JSON.stringify(user)); 
  
          this.loggedInStatus.next(true);
          this.setUserRole(user.role);
        }
      })
    );
  }

  private loadUserFromLocalStorage() {
    const user = localStorage.getItem('user');
    if (user) {
      const parsedUser = JSON.parse(user);
      this.setUserRole(parsedUser.role); // Set role from local storage
      this.loggedInStatus.next(true);
    }
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/auth/forgot-password/${email}`, this.httpOptions);
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    const payload = { token, newPassword }

    return this.http.post(`${environment.apiUrl}/auth/reset-password`, payload, this.httpOptions);
  }

  logout(): void {
    localStorage.removeItem('loggedIn');
    sessionStorage.removeItem('authToken');
    localStorage.removeItem('user');
    
    this.loggedInStatus.next(false);
    
    this.router.navigate(['/login']);
  }
}
