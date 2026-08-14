import { Injectable } from '@angular/core';
import { Candidate, OfferStatus } from '../models/onboarding.models';

export interface CandidateListState {
  searchText: string;
  statusFilter: string;
  homeStateFilter: string;
  referredByFilter: string;
  experienceLevelFilter: string;
  incompleteCertsFilter: boolean;
  sortColumn: keyof Candidate | null;
  sortDirection: 'asc' | 'desc';
  pageIndex: number;
  pageSize: number;
  candidates: Candidate[];
}

/**
 * Retains the Candidate List UI state (filters, sort, pagination, and cached data)
 * across navigations within the onboarding feature. Because this service is
 * providedIn: 'root', it lives for the entire app session — the state persists
 * when the user navigates to a candidate detail/edit view and back.
 *
 * The cached candidates are invalidated when the user explicitly triggers a
 * data-changing action (add, edit, delete, convert) so the list reloads fresh
 * data while still preserving filter/sort/page position.
 */
@Injectable({ providedIn: 'root' })
export class CandidateListStateService {
  private state: CandidateListState | null = null;

  save(state: CandidateListState): void {
    this.state = { ...state, candidates: [...state.candidates] };
  }

  restore(): CandidateListState | null {
    return this.state;
  }

  /**
   * Marks the cached candidate data as stale (e.g., after add/edit/delete)
   * while preserving filter/sort/page state so the list reloads from API
   * but returns to the same position.
   */
  invalidateData(): void {
    if (this.state) {
      this.state.candidates = [];
    }
  }

  clear(): void {
    this.state = null;
  }
}
