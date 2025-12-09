import { HttpHeaders, HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { User } from '../models/user.model';
import { LoginModel } from '../models/login-model.model';
import { environment, local_environment } from '../../environments/environments';
import { v4 as uuidv4 } from 'uuid';
import { UserRole } from '../models/role.enum';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  currentUser: User | null = null;
  private loggedInStatus: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(this.isLoggedIn());
  private userRole: BehaviorSubject<UserRole> = new BehaviorSubject<UserRole>(UserRole.CM);
  private readonly authTokenStorageKey = 'authToken';

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

  getUserByRole(role: string): Observable<User[]>{
    return this.http.get<User[]>(`${environment.apiUrl}/auth/users/${role}`, this.httpOptions);
  }

  setUserRole(role: string) {
    this.userRole.next(role as UserRole);
  }

  setUser(user: User) {
    this.currentUser = user;
  }

  getUserRole(): UserRole {
    return this.userRole.getValue();
  }

  getUser(): any {
    return this.currentUser;
  }

  isUserInRole(roles: UserRole[]): boolean {
    return roles.includes(this.getUserRole()); 
  }

  isClient() {
      return this.userRole.getValue() === UserRole.Client;
  }

  isTemp(){
    return this.userRole.getValue() === UserRole.Temp;
  }

  isPM() {
      return this.userRole.getValue() === UserRole.PM;
  }

  isCM() {
      return this.userRole.getValue() === UserRole.CM;
  }

  isCoordinator() {
    return this.userRole.getValue() === UserRole.OSPCoordinator;
  }

  isMarketController() {
    return this.userRole.getValue() === UserRole.Controller;
  }

  isAdmin() {
    return this.userRole.getValue() === UserRole.Admin;
  }

  isHR() {
      return this.userRole.getValue() === UserRole.HR;
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
          const token = user?.token ?? user?.accessToken ?? null;
          if (token) {
            sessionStorage.setItem(this.authTokenStorageKey, token);
          }
  
          this.loggedInStatus.next(true);
          this.setUserRole(user.role);
          this.setUser(user);
        }
      })
    );
  }

  async getAccessToken(): Promise<string | null> {
    const cachedToken = sessionStorage.getItem(this.authTokenStorageKey);
    if (cachedToken) {
      return cachedToken;
    }

    const userString = localStorage.getItem('user');
    if (!userString) {
      return null;
    }

    try {
      const user = JSON.parse(userString);
      const token = user?.token ?? user?.accessToken ?? null;
      if (token) {
        sessionStorage.setItem(this.authTokenStorageKey, token);
        return token;
      }
    } catch (err) {
      console.warn('Unable to parse stored user for access token.', err);
    }

    return null;
  }

  private loadUserFromLocalStorage() {
    const user = localStorage.getItem('user');
    if (user) {
      const parsedUser = JSON.parse(user);
      this.setUserRole(parsedUser.role);
      this.currentUser = parsedUser; 
      this.loggedInStatus.next(true);
    }
  }

  forgotPassword(email: string): Observable<string> {
  const url = `${environment.apiUrl}/auth/forgot-password/${encodeURIComponent(email)}`;
    return this.http.post<string>(url, null, {
      headers: this.httpOptions?.headers,
      // backend returns plain text like Ok("Password email sent")
      responseType: 'text' as 'json'
    });
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    const payload = { token, newPassword }

    return this.http.post(`${environment.apiUrl}/auth/reset-password`, payload, this.httpOptions);
  }

  logout(): void {
    this.clearStorage();
    this.resetCurrentUser();
    this.loggedInStatus.next(false);
    this.router.navigate(['/login']);
}

private clearStorage(): void {
    localStorage.removeItem('loggedIn');
    sessionStorage.removeItem(this.authTokenStorageKey);
    localStorage.removeItem('user');
}

private resetCurrentUser(): void {
    const userString = localStorage.getItem('user');

    if (userString) {
        try {
            const userObj = JSON.parse(userString);

            if (userObj && userObj.id) {
                this.currentUser = new User(
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
        } catch (error) {
            console.error("Error parsing user data from localStorage:", error);
            this.currentUser = null;
        }
    } else {
        this.currentUser = null;
    }
  }

}
