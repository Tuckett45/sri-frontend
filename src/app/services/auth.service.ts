import { HttpHeaders, HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { User } from '../models/user.model';
import { LoginModel } from '../models/login-model.model';
import { environment, local_environment } from '../../environments/environments';
import { v4 as uuidv4 } from 'uuid';
import { UserRole } from '../models/role.enum';
import { StatePersistenceService } from '../features/field-resource-management/services/state-persistence.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  currentUser: User | null = null;
  protected loggedInStatus: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(this.isLoggedIn());
  private userRole: BehaviorSubject<UserRole> = new BehaviorSubject<UserRole>(UserRole.CM);
  private readonly authTokenStorageKey = 'authToken';

  protected httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
      // Note: Ocp-Apim-Subscription-Key is now handled by ConfigurationInterceptor
    })
  };
  
  constructor(
    protected router: Router, 
    protected http: HttpClient,
    private statePersistenceService: StatePersistenceService
  ) {
    this.loadUserFromLocalStorage();
   }
 
  /**
   * Best-effort role extraction to handle varying backend payloads.
   */
  protected resolveRole(payload: any): string {
    if (!payload) return '';
    const candidates = [
      payload.role,
      payload.Role,
      payload.userRole,
      payload.roleName,
      payload.role_type,
      payload.roleType
    ];

    for (const val of candidates) {
      if (typeof val === 'string' && val.trim().length) {
        return val;
      }
    }

    const rolesArray = payload.roles || payload.Roles || payload.userRoles;
    if (Array.isArray(rolesArray) && rolesArray.length && typeof rolesArray[0] === 'string') {
      return rolesArray[0];
    }

    return '';
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

  getUserRole$(): Observable<UserRole> {
    return this.userRole.asObservable();
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

  isPayroll() {
      return this.userRole.getValue() === UserRole.Payroll;
  }

  isEngineeringFieldSupport() {
    return this.userRole.getValue() === UserRole.EngineeringFieldSupport;
  }

  isMaterialsManager() {
    return this.userRole.getValue() === UserRole.MaterialsManager;
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
          this.setUserRole(this.resolveRole(user));
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
      this.setUserRole(this.resolveRole(parsedUser));
      this.currentUser = parsedUser; 
      this.loggedInStatus.next(true);
    } else if (!environment.production) {
      // In development mode, use a mock admin user if no user is logged in
      this.currentUser = {
        id: 'dev-admin-123',
        name: 'Dev Admin',
        email: 'admin@dev.local',
        password: '',
        role: 'Admin',
        market: 'ALL',
        company: 'INTERNAL',
        createdDate: new Date(),
        isApproved: true
      };
      this.setUserRole(UserRole.Admin);
      this.loggedInStatus.next(true);
      console.log('AuthService: Using development mock user (Admin)');
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
    
    // Clear persisted FRM state to prevent data leakage between users
    this.statePersistenceService.clearPersistedState();
    
    this.router.navigate(['/login']);
  }

  protected clearStorage(): void {
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

  getPendingUsers(market?: string): Observable<any[]> {
    let url = `${environment.apiUrl}/auth/users/pending`;
    if (market) {
      url += `?market=${market}`;
    }
    return this.http.get<any[]>(url, this.httpOptions);
  }

  approveUser(userId: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/auth/users/${userId}/approve`, {}, this.httpOptions);
  }

  rejectUser(userId: string, reason?: string): Observable<any> {
    const body = reason || '';
    return this.http.post(`${environment.apiUrl}/auth/users/${userId}/reject`, JSON.stringify(body), this.httpOptions);
  }

}
