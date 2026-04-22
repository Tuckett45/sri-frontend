import { TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';
import { BrowserModule } from '@angular/platform-browser';
import { HighlightPipe } from './highlight.pipe';

describe('HighlightPipe', () => {
  let pipe: HighlightPipe;
  let sanitizer: DomSanitizer;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [BrowserModule],
      providers: []
    });
    sanitizer = TestBed.inject(DomSanitizer);
    pipe = new HighlightPipe(sanitizer);
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return original value when search term is empty', () => {
    const result = pipe.transform('John Doe', '');
    expect(result).toBe('John Doe');
  });

  it('should return original value when value is empty', () => {
    const result = pipe.transform('', 'john');
    expect(result).toBe('');
  });

  it('should highlight matching text (case insensitive)', () => {
    const result = pipe.transform('John Doe', 'john');
    expect(result).toContain('search-highlight');
    expect(result).toContain('John');
  });

  it('should highlight multiple occurrences', () => {
    const result = pipe.transform('John and Johnny', 'john');
    const matches = (result as string).match(/search-highlight/g);
    expect(matches?.length).toBe(2);
  });

  it('should escape special regex characters', () => {
    const result = pipe.transform('Price: $100', '$');
    expect(result).toContain('search-highlight');
    expect(result).toContain('$');
  });
});
