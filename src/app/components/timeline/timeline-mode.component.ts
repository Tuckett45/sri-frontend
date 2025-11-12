import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
  computed,
  effect,
  signal,
  WritableSignal
} from '@angular/core';
import { formatDate } from '@angular/common';
import { TimelineItem } from '../../models/timeline-item.model';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

interface NormalizedTimelineItem extends TimelineItem {
  start: Date;
  end: Date;
}

interface LayoutItem extends NormalizedTimelineItem {
  left: string;
  width: string;
  row: number;
  clippedStart: Date;
  clippedEnd: Date;
  isClippedStart: boolean;
  isClippedEnd: boolean;
}

interface RangeSelection {
  start: Date | null;
  end: Date | null;
}

@Component({
  selector: 'app-timeline-mode',
  templateUrl: './timeline-mode.component.html',
  styleUrls: ['./timeline-mode.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class TimelineModeComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() items: TimelineItem[] | null = [];
  @Input() emptyStateMessage = 'No items fall within the selected range.';
  @Input() openLabel = 'Open';
  @Input() resolvedLabel = 'Resolved';

  @ViewChild('timelineTrack', { static: true })
  private timelineTrackRef!: ElementRef<HTMLDivElement>;

  readonly rowHeight = 44;
  readonly zoomBounds = { min: 14, max: 365 } as const;
  readonly today = signal(this.startOfDay(new Date()));
  readonly Math = Math;

  rangeModel: Date[] | null = null;
  zoomModel = 90;

  private readonly normalizedItems = signal<NormalizedTimelineItem[]>([]);
  private readonly rangeSelection: WritableSignal<RangeSelection> = signal({ start: null, end: null });
  private readonly windowDays = signal<number>(90);
  private readonly viewStart: WritableSignal<Date> = signal(this.startOfDay(new Date()));
  private readonly trackWidth = signal<number>(1);
  readonly dragging = signal(false);

  readonly viewEnd = computed(() => this.addDays(this.viewStart(), this.windowDays()));
  readonly activeBounds = computed(() => this.resolveActiveBounds());
  readonly filteredItems = computed(() => this.computeFilteredItems());
  readonly layoutItems = computed(() => this.computeLayout());
  readonly rowCount = computed(() =>
    this.layoutItems().reduce((max, item) => Math.max(max, item.row + 1), 0)
  );
  readonly statusSummary = computed(() => this.computeStatusSummary());
  readonly ticks = computed(() => this.buildTicks());
  readonly todayMarker = computed(() => this.buildTodayMarker());

  private resizeObserver?: ResizeObserver;
  private defaultView: { start: Date; window: number } | null = null;
  private pointerState: {
    active: boolean;
    pointerId: number | null;
    startX: number;
    startViewStart: Date;
  } = {
    active: false,
    pointerId: null,
    startX: 0,
    startViewStart: this.startOfDay(new Date())
  };

  constructor(private readonly ngZone: NgZone) {
    effect(() => {
      const range = this.rangeSelection();
      this.rangeModel = range.start && range.end
        ? [range.start, range.end]
        : range.start
          ? [range.start]
          : null;
    });

    effect(() => {
      this.zoomModel = this.windowDays();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('items' in changes) {
      this.handleItemsChange(this.items ?? []);
    }
  }

  ngAfterViewInit(): void {
    if (!this.timelineTrackRef) return;

    this.resizeObserver = new ResizeObserver(entries => {
      const width = entries[0]?.contentRect?.width ?? 1;
      this.ngZone.run(() => this.trackWidth.set(Math.max(width, 1)));
    });

    this.resizeObserver.observe(this.timelineTrackRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  onZoomModelChange(days: number): void {
    this.setWindowDays(days);
  }

  onRangeChange(range: Date[] | null): void {
    if (!range || range.length === 0) {
      this.rangeSelection.set({ start: null, end: null });
      this.resetView();
      return;
    }

    const start = range[0] ?? null;
    const end = range.length > 1 ? range[1] ?? null : null;
    this.rangeSelection.set({ start, end });
    this.alignViewToRange(start, end);
  }

  resetView(): void {
    if (this.defaultView) {
      this.windowDays.set(this.defaultView.window);
      this.viewStart.set(this.defaultView.start);
    }
  }

  clearRange(): void {
    this.rangeSelection.set({ start: null, end: null });
    this.resetView();
  }

  onPointerDown(event: PointerEvent): void {
    if (event.button !== 0 || !this.timelineTrackRef) return;

    const target = this.timelineTrackRef.nativeElement;
    target.setPointerCapture(event.pointerId);

    this.pointerState = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startViewStart: new Date(this.viewStart().getTime())
    };
    this.dragging.set(true);
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.pointerState.active || this.pointerState.pointerId !== event.pointerId) return;

    const width = this.trackWidth();
    if (!width) return;

    const deltaPx = event.clientX - this.pointerState.startX;
    const deltaDays = (deltaPx / width) * this.windowDays();
    const newStart = this.addDays(this.pointerState.startViewStart, -deltaDays);
    this.viewStart.set(this.clampViewStart(newStart, this.windowDays()));
  }

  onPointerUp(event: PointerEvent): void {
    if (!this.pointerState.active || this.pointerState.pointerId !== event.pointerId) return;

    this.timelineTrackRef.nativeElement.releasePointerCapture(event.pointerId);
    this.pointerState.active = false;
    this.pointerState.pointerId = null;
    this.dragging.set(false);
  }

  onPointerCancel(event: PointerEvent): void {
    if (this.pointerState.pointerId === event.pointerId) {
      this.pointerState.active = false;
      this.pointerState.pointerId = null;
      this.dragging.set(false);
      try {
        this.timelineTrackRef?.nativeElement.releasePointerCapture(event.pointerId);
      } catch {
        // noop - capture may already be released
      }
    }
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    const direction = event.deltaY > 0 ? 1 : -1;
    const factor = direction > 0 ? 1.15 : 0.85;
    this.setWindowDays(this.windowDays() * factor);
  }

  trackByItemId(_index: number, item: LayoutItem): string {
    return item.id;
  }

  buildTooltip(item: LayoutItem): string {
    const lines: string[] = [item.label];
    lines.push(`Start: ${formatDate(item.start, 'MMM d, y', 'en-US')}`);
    lines.push(`End: ${formatDate(item.end, 'MMM d, y', 'en-US')}`);

    if (item.status) {
      lines.push(`Status: ${item.status}`);
    }

    const metadata = item.metadata ?? {};
    const details = Object.entries(metadata)
      .filter(([, value]) => value !== null && value !== undefined && value !== '')
      .map(([key, value]) => `${this.toTitleCase(key)}: ${value}`);

    return lines.concat(details).join('\n');
  }

  // ---- private helpers ----

  private handleItemsChange(items: TimelineItem[]): void {
    const normalized = this.normalizeItems(items);
    this.normalizedItems.set(normalized);

    const bounds = this.resolveBounds(normalized);
    const window = this.computeDefaultWindow(bounds);
    const start = this.clampViewStart(this.addDays(bounds.min, -Math.min(7, window / 4)), window);

    this.defaultView = { start, window };
    this.windowDays.set(window);
    this.viewStart.set(start);
  }

  private normalizeItems(items: TimelineItem[]): NormalizedTimelineItem[] {
    return (items ?? [])
      .map(item => {
        const start = this.startOfDay(this.toDate(item.startDate));
        const rawEnd = this.toDate(item.endDate ?? item.startDate);
        const end = this.endOfDay(rawEnd < start ? start : rawEnd);
        return {
          ...item,
          start,
          end
        } as NormalizedTimelineItem;
      })
      .filter(item => !!item.start)
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }

  private resolveBounds(items: NormalizedTimelineItem[]): { min: Date; max: Date } {
    if (!items.length) {
      const today = this.startOfDay(new Date());
      return { min: today, max: this.addDays(today, 30) };
    }

    let min = items[0].start.getTime();
    let max = items[0].end.getTime();
    for (const item of items) {
      min = Math.min(min, item.start.getTime());
      max = Math.max(max, item.end.getTime());
    }
    if (max <= min) {
      max = min + DAY_IN_MS;
    }
    return { min: new Date(min), max: new Date(max) };
  }

  private resolveActiveBounds(): { min: Date; max: Date } {
    const base = this.resolveBounds(this.normalizedItems());
    const range = this.rangeSelection();

    const min = range.start ? this.startOfDay(range.start) : base.min;
    const maxCandidate = range.end ? this.endOfDay(range.end) : base.max;
    const max = maxCandidate <= min ? this.addDays(min, 1) : maxCandidate;

    return { min, max };
  }

  private computeDefaultWindow(bounds: { min: Date; max: Date }): number {
    const span = bounds.max.getTime() - bounds.min.getTime();
    const spanDays = Math.max(Math.ceil(span / DAY_IN_MS), this.zoomBounds.min);
    const padded = Math.min(Math.max(spanDays + 14, this.zoomBounds.min), this.zoomBounds.max);
    return padded;
  }

  private computeFilteredItems(): NormalizedTimelineItem[] {
    const range = this.rangeSelection();
    const items = this.normalizedItems();

    if (!range.start && !range.end) {
      return items;
    }

    const start = range.start ? this.startOfDay(range.start).getTime() : Number.MIN_SAFE_INTEGER;
    const end = range.end ? this.endOfDay(range.end).getTime() : Number.MAX_SAFE_INTEGER;

    return items.filter(item => item.end.getTime() >= start && item.start.getTime() <= end);
  }

  private computeLayout(): LayoutItem[] {
    const items = this.filteredItems();
    if (!items.length) return [];

    const start = this.viewStart().getTime();
    const end = this.viewEnd().getTime();
    const total = end - start || DAY_IN_MS;

    const rows: number[] = [];
    const layout: LayoutItem[] = [];

    for (const item of items) {
      if (item.end.getTime() < start || item.start.getTime() > end) {
        continue;
      }

      const clippedStart = new Date(Math.max(item.start.getTime(), start));
      const clippedEnd = new Date(Math.min(item.end.getTime(), end));
      const isClippedStart = item.start.getTime() < start;
      const isClippedEnd = item.end.getTime() > end;
      const duration = Math.max(clippedEnd.getTime() - clippedStart.getTime(), DAY_IN_MS / 2);

      let rowIndex = rows.findIndex(rowEnd => rowEnd <= clippedStart.getTime());
      if (rowIndex === -1) {
        rowIndex = rows.length;
        rows.push(clippedEnd.getTime());
      } else {
        rows[rowIndex] = clippedEnd.getTime();
      }

      const left = ((clippedStart.getTime() - start) / total) * 100;
      const width = (duration / total) * 100;

      layout.push({
        ...item,
        clippedStart,
        clippedEnd,
        isClippedStart,
        isClippedEnd,
        left: `${Math.max(0, Math.min(left, 100))}%`,
        width: `${Math.max(width, 0.75)}%`,
        row: rowIndex
      });
    }

    return layout;
  }

  private computeStatusSummary(): { key: string; count: number; label: string; color: string }[] {
    const counts = new Map<string, number>();
    for (const item of this.filteredItems()) {
      const key = (item.status ?? 'open').toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const summaries: { key: string; count: number; label: string; color: string }[] = [];
    counts.forEach((count, key) => {
      const label = key === 'resolved' ? this.resolvedLabel : this.openLabel;
      summaries.push({ key, count, label, color: this.resolveColor(key) });
    });

    return summaries.sort((a, b) => a.label.localeCompare(b.label));
  }

  private buildTicks(): { left: string; label: string }[] {
    const start = this.viewStart();
    const end = this.viewEnd();
    const total = end.getTime() - start.getTime();
    if (total <= 0) return [];

    const ticks: { left: string; label: string }[] = [];
    const tick = this.startOfMonth(start);
    while (tick.getTime() <= end.getTime()) {
      const left = ((tick.getTime() - start.getTime()) / total) * 100;
      ticks.push({ left: `${left}%`, label: formatDate(tick, 'MMM y', 'en-US') });
      tick.setMonth(tick.getMonth() + 1);
    }
    return ticks;
  }

  private buildTodayMarker(): { left: string } | null {
    const today = this.today();
    const start = this.viewStart();
    const end = this.viewEnd();
    if (today < start || today > end) return null;

    const total = end.getTime() - start.getTime();
    const left = ((today.getTime() - start.getTime()) / total) * 100;
    return { left: `${left}%` };
  }

  private alignViewToRange(start: Date | null, end: Date | null): void {
    const rangeStart = start ? this.startOfDay(start) : this.activeBounds().min;
    const rangeEnd = end ? this.endOfDay(end) : this.activeBounds().max;
    const span = Math.max(rangeEnd.getTime() - rangeStart.getTime(), DAY_IN_MS);
    const spanDays = span / DAY_IN_MS;
    const padded = Math.min(Math.max(Math.ceil(spanDays) + 7, this.zoomBounds.min), this.zoomBounds.max);

    this.windowDays.set(padded);
    this.viewStart.set(this.clampViewStart(this.addDays(rangeStart, -Math.min(5, padded / 6)), padded));
  }

  private setWindowDays(rawDays: number): void {
    const clamped = Math.min(Math.max(Math.round(rawDays), this.zoomBounds.min), this.zoomBounds.max);
    if (clamped === this.windowDays()) return;

    const center = this.addDays(this.viewStart(), this.windowDays() / 2);
    this.windowDays.set(clamped);
    const nextStart = this.addDays(center, -clamped / 2);
    this.viewStart.set(this.clampViewStart(nextStart, clamped));
  }

  private clampViewStart(candidate: Date, window: number): Date {
    const bounds = this.activeBounds();
    const margin = Math.max(Math.round(window * 0.1), 1);
    const minBound = this.addDays(bounds.min, -margin);
    const maxBound = this.addDays(bounds.max, margin);
    const maxStart = this.addDays(maxBound, -window);
    const minStartTime = minBound.getTime();
    const maxStartTime = Math.max(minStartTime, maxStart.getTime());

    const time = candidate.getTime();
    if (time < minStartTime) return new Date(minStartTime);
    if (time > maxStartTime) return new Date(maxStartTime);
    return new Date(time);
  }

  resolveColor(status: string): string {
    const key = (status ?? '').toLowerCase();
    if (key === 'resolved') return 'var(--green-500)';
    if (key === 'in-progress') return 'var(--orange-400)';
    if (key === 'open' || key === 'unresolved') return 'var(--red-500)';
    return 'var(--primary-color)';
  }

  private toDate(value: Date | string | null | undefined): Date {
    if (value instanceof Date) {
      return new Date(value.getTime());
    }
    if (typeof value === 'string') {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  }

  private startOfDay(date: Date): Date {
    const d = new Date(date.getTime());
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private endOfDay(date: Date): Date {
    const d = new Date(date.getTime());
    d.setHours(23, 59, 59, 999);
    return d;
  }

  private startOfMonth(date: Date): Date {
    const d = new Date(date.getFullYear(), date.getMonth(), 1);
    return this.startOfDay(d);
  }

  private addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * DAY_IN_MS);
  }

  private toTitleCase(text: string): string {
    return text
      .replace(/([A-Z])/g, ' $1')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\w\S*/g, (word: string) => word.charAt(0).toUpperCase() + word.slice(1));
  }
}
