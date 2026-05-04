import { Observable, Subject, timer } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

/**
 * Debounce configuration options
 */
export interface DebounceOptions {
  /** Debounce time in milliseconds (default: 300ms) */
  time?: number;
  /** Whether to use distinctUntilChanged to filter duplicate values (default: true) */
  distinct?: boolean;
}

/**
 * Debounced request manager
 * 
 * Manages debounced API requests to prevent duplicate calls
 * when user input or actions trigger rapid successive requests.
 * 
 * Requirements: 11.2
 */
export class DebouncedRequest<T, R> {
  private subject = new Subject<T>();
  private readonly DEFAULT_DEBOUNCE_TIME = 300; // 300ms

  /**
   * Create a debounced request handler
   * 
   * @param requestFn - Function that executes the actual request
   * @param options - Debounce configuration options
   * @returns Observable of debounced results
   */
  constructor(
    private requestFn: (params: T) => Observable<R>,
    private options?: DebounceOptions
  ) {}

  /**
   * Get the observable stream of debounced results
   * 
   * @returns Observable that emits debounced request results
   */
  get stream$(): Observable<R> {
    const debounceMs = this.options?.time ?? this.DEFAULT_DEBOUNCE_TIME;
    const useDistinct = this.options?.distinct ?? true;

    let stream$ = this.subject.asObservable().pipe(
      debounceTime(debounceMs)
    );

    if (useDistinct) {
      stream$ = stream$.pipe(
        distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr))
      );
    }

    return stream$.pipe(
      switchMap(params => this.requestFn(params))
    );
  }

  /**
   * Trigger a debounced request
   * 
   * @param params - Request parameters
   */
  next(params: T): void {
    this.subject.next(params);
  }

  /**
   * Complete the debounced request stream
   */
  complete(): void {
    this.subject.complete();
  }

  /**
   * Unsubscribe and clean up
   */
  destroy(): void {
    this.subject.complete();
  }
}

/**
 * Create a debounced observable from a source observable
 * 
 * @param source$ - Source observable
 * @param debounceMs - Debounce time in milliseconds
 * @param useDistinct - Whether to filter duplicate values
 * @returns Debounced observable
 */
export function debounceObservable<T>(
  source$: Observable<T>,
  debounceMs: number = 300,
  useDistinct: boolean = true
): Observable<T> {
  let result$ = source$.pipe(debounceTime(debounceMs));
  
  if (useDistinct) {
    result$ = result$.pipe(
      distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr))
    );
  }
  
  return result$;
}

/**
 * Throttle an observable to limit emission rate
 * 
 * @param source$ - Source observable
 * @param throttleMs - Throttle time in milliseconds
 * @returns Throttled observable
 */
export function throttleObservable<T>(
  source$: Observable<T>,
  throttleMs: number = 1000
): Observable<T> {
  return source$.pipe(
    switchMap(value => timer(0, throttleMs).pipe(
      switchMap(() => [value])
    ))
  );
}
