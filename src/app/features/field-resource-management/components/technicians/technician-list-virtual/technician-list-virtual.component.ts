import { Component, OnInit, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Technician } from '../../../models/technician.model';
import * as TechnicianSelectors from '../../../state/technicians/technician.selectors';
import * as TechnicianActions from '../../../state/technicians/technician.actions';

/**
 * Technician List with Virtual Scrolling
 * 
 * Alternative implementation of technician list using virtual scrolling
 * for optimal performance with large datasets (100+ technicians).
 * 
 * This component demonstrates how to use Angular CDK Virtual Scrolling
 * with the Field Resource Management Tool.
 * 
 * Use this component instead of TechnicianListComponent when:
 * - Displaying 100+ technicians
 * - Performance is critical
 * - Pagination is not desired
 * 
 * Features:
 * - Virtual scrolling with CDK
 * - Only renders visible items
 * - Smooth scrolling performance
 * - Memory efficient
 * 
 * Requirements: 14.3
 */
@Component({
  selector: 'frm-technician-list-virtual',
  templateUrl: './technician-list-virtual.component.html',
  styleUrls: ['./technician-list-virtual.component.scss']
})
export class TechnicianListVirtualComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  technicians$: Observable<Technician[]>;
  loading$: Observable<boolean>;
  error$: Observable<string | null>;

  // Virtual scroll configuration
  itemSize = 80; // Height of each item in pixels
  viewportHeight = 600; // Height of viewport in pixels

  constructor(
    private store: Store,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.technicians$ = this.store.select(TechnicianSelectors.selectAllTechnicians);
    this.loading$ = this.store.select(TechnicianSelectors.selectTechniciansLoading);
    this.error$ = this.store.select(TechnicianSelectors.selectTechniciansError);
  }

  ngOnInit(): void {
    // Load all technicians (no pagination needed with virtual scrolling)
    this.store.dispatch(TechnicianActions.loadTechnicians({ filters: {} }));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Track technicians by ID for optimal rendering performance
   */
  trackByTechnicianId(index: number, technician: Technician): string {
    return technician.id;
  }

  /**
   * Navigate to technician detail
   */
  viewTechnician(technician: Technician): void {
    this.router.navigate(['/field-resource-management/technicians', technician.id]);
  }

  /**
   * Navigate to technician edit
   */
  editTechnician(technician: Technician): void {
    this.router.navigate(['/field-resource-management/technicians', technician.id, 'edit']);
  }

  /**
   * Get full name
   */
  getFullName(technician: Technician): string {
    return `${technician.firstName} ${technician.lastName}`;
  }

  /**
   * Get skill names
   */
  getSkillNames(technician: Technician): string[] {
    return technician.skills.map(skill => skill.name);
  }

  /**
   * Get status text
   */
  getStatus(technician: Technician): string {
    return technician.isActive ? 'Active' : 'Inactive';
  }
}
