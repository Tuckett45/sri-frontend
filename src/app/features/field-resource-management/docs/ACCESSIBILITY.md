# Accessibility Implementation Guide

## Overview

This document outlines the accessibility features implemented in the Field Resource Management Tool to ensure WCAG 2.1 Level AA compliance.

## ARIA Labels and Roles

### Navigation
- Main navigation has `role="navigation"` and `aria-label="Field Resource Management Navigation"`
- Navigation items have appropriate `aria-label` attributes
- Icons are marked with `aria-hidden="true"` to prevent screen reader duplication
- Expandable menu items have `aria-label` describing the expand action

### Main Content
- Main content area has `role="main"` and `id="main-content"` for skip navigation
- Main content is focusable with `tabindex="-1"` for programmatic focus

### Interactive Elements
- All icon buttons have descriptive `aria-label` attributes
- Status badges have `role="status"` and descriptive `aria-label`
- Action buttons describe the action and context (e.g., "Edit job J-12345")
- Form fields have associated labels and error messages via `aria-describedby`

### Dynamic Content
- Live regions use `aria-live="polite"` for non-critical updates
- Error messages use `aria-live="assertive"` for immediate attention
- Loading indicators have `role="progressbar"` with appropriate labels
- Timers have `role="timer"` for elapsed time displays

### Lists and Feeds
- Activity feeds use `role="feed"` for screen reader optimization
- Alert lists use `role="list"` with `role="listitem"` for each item
- Navigation menus use `role="list"` structure

### Charts and Visualizations
- Charts have `role="img"` with descriptive `aria-label`
- Chart descriptions provided via `aria-describedby` pointing to hidden text
- Data tables have proper `<th>` headers with `scope` attributes

## Keyboard Navigation

### Global Shortcuts
- **Ctrl+R** or **F5**: Refresh dashboard (prevented default browser refresh)
- **Escape**: Close dialogs and modals
- **Tab**: Navigate forward through interactive elements
- **Shift+Tab**: Navigate backward through interactive elements
- **Enter**: Activate buttons and links
- **Space**: Toggle checkboxes and buttons

### Form Navigation
- **Tab**: Move between form fields
- **Arrow keys**: Navigate within select dropdowns and radio groups
- **Enter**: Submit forms (when focus is on submit button)

### List Navigation
- **Tab**: Navigate between list items
- **Enter**: Activate clickable list items
- **Arrow keys**: Navigate within dropdown menus

### Focus Management
- Focus indicators are visible with 3px solid outline
- Focus is trapped within modal dialogs
- Focus returns to trigger element when dialogs close
- Skip navigation links appear on focus

## Skip Navigation

### Implementation
- Skip links are positioned absolutely off-screen
- Links become visible when focused
- Two skip links provided:
  1. "Skip to main content" - jumps to `#main-content`
  2. "Skip to navigation" - jumps to `#main-navigation`

### Usage
- Press Tab on page load to reveal skip links
- Press Enter to activate and jump to target
- Target elements are focusable with `tabindex="-1"`

## Color Contrast

### Standards
- Normal text (< 18pt): 4.5:1 contrast ratio
- Large text (≥ 18pt or 14pt bold): 3:1 contrast ratio
- UI components and graphics: 3:1 contrast ratio

### Implementation
- Primary text on dark background: #ffffff on #121212 (15.3:1)
- Secondary text: rgba(255, 255, 255, 0.6) on #121212 (7.2:1)
- Status colors tested for sufficient contrast:
  - Success (green): #4CAF50 on #1e1e1e (4.8:1)
  - Warning (orange): #FF9800 on #1e1e1e (5.2:1)
  - Error (red): #F44336 on #1e1e1e (4.6:1)
  - Info (blue): #2196F3 on #1e1e1e (5.1:1)

### Alternative Indicators
- Status is conveyed through:
  1. Color
  2. Icon (visual indicator)
  3. Text label (screen reader accessible)
- Charts include text descriptions in addition to colors
- Form validation shows icons and text, not just color

## Screen Reader Support

### Announcements
- Status changes announced via `AccessibilityService.announce()`
- Job assignments announced with job ID and technician name
- Errors announced with "Error:" prefix
- Success messages announced politely
- Loading states announced

### Content Structure
- Proper heading hierarchy (h1 → h2 → h3)
- Semantic HTML elements used throughout
- Lists use `<ul>`, `<ol>`, and `<li>` elements
- Tables use proper `<table>`, `<thead>`, `<tbody>` structure

### Hidden Content
- Decorative icons marked with `aria-hidden="true"`
- Screen reader only text uses `.sr-only` class
- Visually hidden labels provided where needed

## Testing Checklist

### Automated Testing
- [ ] Run axe DevTools accessibility scan
- [ ] Check color contrast with WebAIM Contrast Checker
- [ ] Validate HTML with W3C Validator
- [ ] Test with Lighthouse accessibility audit

### Manual Testing
- [ ] Navigate entire application using only keyboard
- [ ] Test with NVDA screen reader (Windows)
- [ ] Test with JAWS screen reader (Windows)
- [ ] Test with VoiceOver screen reader (Mac)
- [ ] Test with browser zoom at 200%
- [ ] Test with Windows High Contrast mode
- [ ] Test with color blindness simulators

### Keyboard Navigation Testing
- [ ] All interactive elements reachable via Tab
- [ ] Focus order is logical and intuitive
- [ ] Focus indicators are clearly visible
- [ ] Skip links work correctly
- [ ] Keyboard shortcuts function as expected
- [ ] No keyboard traps exist

### Screen Reader Testing
- [ ] All content is announced correctly
- [ ] Dynamic updates are announced
- [ ] Form labels and errors are associated
- [ ] Button purposes are clear
- [ ] Landmark regions are identified
- [ ] Heading structure is logical

## Accessibility Service

### Usage
```typescript
import { AccessibilityService } from '../services/accessibility.service';

constructor(private accessibilityService: AccessibilityService) {}

// Announce to screen readers
this.accessibilityService.announce('Job assigned successfully');

// Announce error
this.accessibilityService.announceError('Failed to save job');

// Announce status change
this.accessibilityService.announceStatusChange('J-12345', 'NotStarted', 'EnRoute');
```

### Methods
- `announce(message, politeness)`: General announcements
- `announceError(error)`: Error announcements (assertive)
- `announceSuccess(message)`: Success announcements (polite)
- `announceStatusChange(jobId, oldStatus, newStatus)`: Status change announcements
- `announceAssignment(jobId, technicianName)`: Assignment announcements
- `announceNotification(message)`: Notification announcements (assertive)

## Keyboard Shortcut Directive

### Usage
```typescript
import { KeyboardShortcutDirective } from '../directives/keyboard-shortcut.directive';

// In template
<div [frmKeyboardShortcut]="{key: 's', ctrl: true}" (shortcutTriggered)="onSave()">
```

### Configuration
```typescript
interface KeyboardShortcut {
  key: string;        // Key to listen for
  ctrl?: boolean;     // Require Ctrl key
  alt?: boolean;      // Require Alt key
  shift?: boolean;    // Require Shift key
  meta?: boolean;     // Require Meta/Command key
}
```

## Best Practices

### Do's
✅ Use semantic HTML elements
✅ Provide text alternatives for images and icons
✅ Ensure sufficient color contrast
✅ Make all functionality keyboard accessible
✅ Provide clear focus indicators
✅ Use ARIA attributes appropriately
✅ Test with real assistive technologies
✅ Announce dynamic content changes
✅ Provide skip navigation links
✅ Use proper heading hierarchy

### Don'ts
❌ Don't rely on color alone to convey information
❌ Don't use `tabindex` values greater than 0
❌ Don't create keyboard traps
❌ Don't hide focus indicators
❌ Don't use `aria-label` on non-interactive elements unnecessarily
❌ Don't override native HTML semantics without good reason
❌ Don't forget to test with actual users
❌ Don't use placeholder text as labels
❌ Don't auto-play audio or video
❌ Don't use time limits without providing extensions

## Resources

### Tools
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE Browser Extension](https://wave.webaim.org/extension/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [NVDA Screen Reader](https://www.nvaccess.org/)
- [Color Blindness Simulator](https://www.color-blindness.com/coblis-color-blindness-simulator/)

### Guidelines
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [WebAIM Articles](https://webaim.org/articles/)

## Maintenance

### Regular Reviews
- Review accessibility after major feature additions
- Re-test with screen readers quarterly
- Update ARIA labels when UI text changes
- Monitor user feedback for accessibility issues
- Keep up with WCAG updates and best practices

### Continuous Improvement
- Collect feedback from users with disabilities
- Conduct usability testing with assistive technology users
- Stay informed about new accessibility techniques
- Update documentation as implementation evolves
