import { Injectable, NgZone, Signal, signal } from '@angular/core';
import { PreliminaryPunchList } from '../models/preliminary-punch-list.model';
import { StreetSheet } from '../models/street-sheet.model';
import { MapMarker } from '../models/map-marker.model';

interface StreetSheetMarkerMap {
  [streetSheetId: string]: MapMarker[];
}

@Injectable({ providedIn: 'root' })
export class OfflineCacheService {
  private readonly storeName = 'datasets';
  private readonly punchListKey = 'punchLists';
  private readonly streetSheetKey = 'streetSheets';
  private readonly streetSheetMarkerKey = 'streetSheetMarkers';

  private readonly onlineState = signal<boolean>(this.readInitialOnlineState());
  private readonly punchListState = signal<PreliminaryPunchList[]>([]);
  private readonly streetSheetState = signal<StreetSheet[]>([]);
  private readonly streetSheetMarkerState = signal<StreetSheetMarkerMap>({});

  private readonly dbPromise: Promise<IDBDatabase> | null;

  readonly online: Signal<boolean> = this.onlineState.asReadonly();
  readonly punchLists: Signal<PreliminaryPunchList[]> = this.punchListState.asReadonly();
  readonly streetSheets: Signal<StreetSheet[]> = this.streetSheetState.asReadonly();

  constructor(private zone: NgZone) {
    this.dbPromise = this.isBrowser() && typeof indexedDB !== 'undefined'
      ? this.openDatabase()
      : null;

    if (this.isBrowser()) {
      window.addEventListener('online', () => this.zone.run(() => this.onlineState.set(true)));
      window.addEventListener('offline', () => this.zone.run(() => this.onlineState.set(false)));
    }

    if (this.dbPromise) {
      this.hydrateFromStorage();
    }
  }

  isOnline(): boolean {
    return this.onlineState();
  }

  async getPunchLists(): Promise<PreliminaryPunchList[]> {
    const current = this.punchListState();
    if (current.length) {
      return current;
    }

    const stored = await this.readDataset<PreliminaryPunchList[]>(this.punchListKey);
    return stored ?? [];
  }

  async savePunchLists(items: PreliminaryPunchList[]): Promise<void> {
    const normalized = items ?? [];

    if (this.dbPromise) {
      try {
        await this.writeDataset(this.punchListKey, normalized);
      } catch (error) {
        console.warn('Failed to persist punch lists offline', error);
      }
    }

    this.zone.run(() => this.punchListState.set(normalized));
  }

  async getStreetSheets(): Promise<StreetSheet[]> {
    const current = this.streetSheetState();
    if (current.length) {
      return current;
    }

    const stored = await this.readDataset<StreetSheet[]>(this.streetSheetKey);
    if (!stored) {
      return [];
    }

    const markerMap = await this.readDataset<StreetSheetMarkerMap>(this.streetSheetMarkerKey) ?? {};
    return stored.map(sheet => ({
      ...sheet,
      marker: markerMap[sheet.id] ?? sheet.marker ?? []
    }));
  }

  async saveStreetSheets(sheets: StreetSheet[]): Promise<void> {
    const markerMap = this.streetSheetMarkerState();
    const normalized = (sheets ?? []).map(sheet => ({
      ...sheet,
      marker: sheet.marker ?? markerMap[sheet.id] ?? []
    }));

    if (this.dbPromise) {
      try {
        await this.writeDataset(this.streetSheetKey, normalized);
      } catch (error) {
        console.warn('Failed to persist street sheets offline', error);
      }
    }

    this.zone.run(() => this.streetSheetState.set(normalized));
  }

  async saveStreetSheetMarkers(streetSheetId: string, markers: MapMarker[]): Promise<void> {
    const safeId = streetSheetId ?? '';
    if (!safeId) {
      return;
    }

    const nextMap: StreetSheetMarkerMap = {
      ...this.streetSheetMarkerState(),
      [safeId]: markers ?? []
    };

    if (this.dbPromise) {
      try {
        await this.writeDataset(this.streetSheetMarkerKey, nextMap);
        const updatedSheets = this.streetSheetState().map(sheet =>
          sheet.id === safeId
            ? { ...sheet, marker: markers ?? [] }
            : sheet
        );
        await this.writeDataset(this.streetSheetKey, updatedSheets);
        this.zone.run(() => {
          this.streetSheetMarkerState.set(nextMap);
          this.streetSheetState.set(updatedSheets);
        });
        return;
      } catch (error) {
        console.warn('Failed to persist street sheet markers offline', error);
      }
    }

    this.zone.run(() => {
      this.streetSheetMarkerState.set(nextMap);
      this.streetSheetState.update(sheets =>
        sheets.map(sheet => sheet.id === safeId ? { ...sheet, marker: markers ?? [] } : sheet)
      );
    });
  }

  async getStreetSheetMarkers(streetSheetId: string): Promise<MapMarker[]> {
    if (!streetSheetId) {
      return [];
    }

    const fromSignal = this.streetSheetMarkerState()[streetSheetId];
    if (fromSignal) {
      return fromSignal;
    }

    const cachedSheets = this.streetSheetState().find(sheet => sheet.id === streetSheetId);
    if (cachedSheets?.marker?.length) {
      return cachedSheets.marker;
    }

    const storedMap = await this.readDataset<StreetSheetMarkerMap>(this.streetSheetMarkerKey);
    return storedMap?.[streetSheetId] ?? [];
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined';
  }

  private readInitialOnlineState(): boolean {
    return typeof navigator === 'undefined' ? true : navigator.onLine;
  }

  private async hydrateFromStorage(): Promise<void> {
    try {
      const [punchLists, streetSheets, markerMap] = await Promise.all([
        this.readDataset<PreliminaryPunchList[]>(this.punchListKey),
        this.readDataset<StreetSheet[]>(this.streetSheetKey),
        this.readDataset<StreetSheetMarkerMap>(this.streetSheetMarkerKey)
      ]);

      this.zone.run(() => {
        if (punchLists) {
          this.punchListState.set(punchLists);
        }
        if (markerMap) {
          this.streetSheetMarkerState.set(markerMap);
        }
        if (streetSheets) {
          const merged = streetSheets.map(sheet => ({
            ...sheet,
            marker: markerMap?.[sheet.id] ?? sheet.marker ?? []
          }));
          this.streetSheetState.set(merged);
        }
      });
    } catch (error) {
      console.warn('Failed to hydrate offline cache', error);
    }
  }

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('sri-offline-cache', 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Unable to open IndexedDB'));
    });
  }

  private async readDataset<T>(key: string): Promise<T | undefined> {
    if (!this.dbPromise) {
      return undefined;
    }

    const db = await this.dbPromise;
    return new Promise<T | undefined>((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result as T | undefined);
      request.onerror = () => reject(request.error ?? new Error('Failed to read dataset'));
    });
  }

  private async writeDataset<T>(key: string, value: T): Promise<void> {
    if (!this.dbPromise) {
      return;
    }

    const db = await this.dbPromise;
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error('Failed to write dataset'));
    });
  }
}
