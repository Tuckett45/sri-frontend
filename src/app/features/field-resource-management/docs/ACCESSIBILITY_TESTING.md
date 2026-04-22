# Accessibility Testing Guide

## Overview

This guide provides step-by-step instructions for testing the accessibility features of the Field Resource Management Tool.

## Prerequisites

### Tools Required
1. **Screen Readers**
   - Windows: NVDA (free) or JAWS (commercial)
   - Mac: VoiceOver (built-in)
   - Linux: Orca (free)

2. **Browser Extensions**
   - axe DevTools (Chrome/Firefox)
   - WAVE (Chrome/Firefox/Edge)
   - Lighthouse (Chrome DevTools)

3. **Color Contrast Tools**
   - WebAIM Contrast Checker
   - Chrome DevTools Color Picker
   - Colour Contrast Analyser (desktop app)

4. **Browsers**
   - Chrome (latest)
   - Firefox (latest)
   - Safari (latest)
   - Edge (latest)

## Testing Checklist

### 1. Automated Testing

#### Run axe DevTools Scan
1. Install axe DevTools extension
2. Open the application
3. Open DevTools (F12)
4. Navigate to "axe DevTools" tab
5. Click "Scan ALL of my page"
6. Review and fix any issues found
7. Document results

**Expected Result**: 0 violations

#### Run Lighthouse Audit
1. Open Chrome DevTools (F12)
2. Navigate to "Lighthouse" tab
3. Select "Accessibility" category
4. Click "Analyze page load"
5. Review score and recommendations
6. Fix any issues with score < 90

**Expected Result**: Accessibility score ≥ 95

#### Run WAVE Extension
1. Install WAVE extension
2. Navigate to each major page
3. Click WAVE icon
4. Review errors, alerts, and features
5. Fix any errors
6. Document results

**Expected Result**: 0 errors, minimal alerts

### 2. Keyboard Navigation Testing

#### Test Tab Navigation
1. Load the application
2. Press Tab repeatedly
3. Verify:
   - All interactive elements are reachable
   - Tab order is logical (left-to-right, top-to-bottom)
   - Focus indicators are clearly visible
   - No keyboard traps exist

**Test Pages**:
- Dashboard
- Job List
- Job Form
- Technician List
- Calendar View
- Mobile Daily View

#### Test Skip Navigation
1. Load any page
2. Press Tab once
3. Verify "Skip to main content" link appears
4. Press Enter
5. Verify focus moves to main content
6. Repeat for "Skip to navigation"

**Expected Result**: Skip links work on all pages

#### Test Keyboard Shortcuts
Test the following shortcuts:

| Shortcut | Action | Page |
|----------|--------|------|
| Ctrl+S | Save form | Job Form, Technician Form |
| Ctrl+R | Refresh | Dashboard |
| Escape | Close dialog | All dialogs |
| Escape | Cancel form | All forms |
| Enter | Activate button | All buttons |
| Space | Toggle checkbox | All checkboxes |
| Arrow keys | Navigate menu | Dropdown menus |

**Expected Result**: All shortcuts work as documented

#### Test Focus Management
1. Open a modal dialog
2. Press Tab
3. Verify focus stays within dialog
4. Press Escape or close dialog
5. Verify focus returns to trigger element

**Expected Result**: Focus is properly trapped and restored

### 3. Screen Reader Testing

#### NVDA Testing (Windows)
1. Install NVDA
2. Start NVDA (Ctrl+Alt+N)
3. Navigate to application
4. Test each page using:
   - Tab key (navigate interactive elements)
   - H key (navigate headings)
   - L key (navigate lists)
   - B key (navigate buttons)
   - F key (navigate form fields)

**Test Scenarios**:

##### Dashboard
1. Navigate to dashboard
2. Verify KPI cards are announced with values
3. Verify charts have descriptive labels
4. Verify activity feed items are announced
5. Verify alerts are announced

##### Job List
1. Navigate to job list
2. Verify table headers are announced
3. Verify each job row is announced with key info
4. Verify action buttons are labeled
5. Verify batch selection is announced

##### Job Form
1. Navigate to job form
2. Verify all form labels are announced
3. Verify required fields are indicated
4. Verify validation errors are announced
5. Verify success message is announced

##### Mobile Job Card
1. Navigate to daily view
2. Verify job cards are announced as articles
3. Verify status is announced
4. Verify action buttons are labeled
5. Verify timer updates are announced

**Expected Result**: All content is accessible and properly announced

#### VoiceOver Testing (Mac)
1. Enable VoiceOver (Cmd+F5)
2. Navigate to application
3. Use VoiceOver commands:
   - VO+Right Arrow (next item)
   - VO+Left Arrow (previous item)
   - VO+Space (activate)
   - VO+H (next heading)
   - VO+J (next form control)

**Expected Result**: Same as NVDA testing

### 4. Color Contrast Testing

#### Automated Contrast Check
1. Open Chrome DevTools
2. Inspect any text element
3. Check "Contrast ratio" in Styles panel
4. Verify ratio meets WCAG AA standards:
   - Normal text: ≥ 4.5:1
   - Large text: ≥ 3:1

#### Manual Contrast Testing
1. Use WebAIM Contrast Checker
2. Test each color combination:
   - Primary text on dark background
   - Secondary text on dark background
   - Status colors on dark background
   - Button text on colored backgrounds
3. Document results

**Expected Result**: All combinations pass WCAG AA

#### Color Blindness Simulation
1. Use Chrome DevTools
2. Open Rendering tab
3. Select "Emulate vision deficiencies"
4. Test each type:
   - Protanopia (red-blind)
   - Deuteranopia (green-blind)
   - Tritanopia (blue-blind)
   - Achromatopsia (no color)
5. Verify information is still accessible

**Expected Result**: All information available without color

### 5. Zoom and Magnification Testing

#### Browser Zoom
1. Open application
2. Zoom to 200% (Ctrl/Cmd + +)
3. Verify:
   - All content is visible
   - No horizontal scrolling required
   - Text doesn't overlap
   - Buttons are still clickable
4. Test at 150%, 200%, 300%

**Expected Result**: Usable at all zoom levels up to 200%

#### Text Resize
1. Open browser settings
2. Increase font size to "Very Large"
3. Verify:
   - Text is readable
   - Layout doesn't break
   - No content is cut off

**Expected Result**: Readable at all text sizes

### 6. Mobile Accessibility Testing

#### Touch Target Size
1. Open application on mobile device
2. Verify all interactive elements are:
   - At least 44x44 pixels
   - Adequately spaced (8px minimum)
   - Easy to tap without errors

**Expected Result**: All targets meet minimum size

#### Screen Reader on Mobile
1. Enable TalkBack (Android) or VoiceOver (iOS)
2. Navigate through mobile views
3. Verify all content is announced
4. Verify gestures work correctly

**Expected Result**: Fully accessible on mobile

### 7. Form Accessibility Testing

#### Label Association
1. Inspect each form field
2. Verify:
   - Each field has a visible label
   - Label is associated with field (for/id or aria-labelledby)
   - Required fields are indicated
   - Placeholder is not used as label

**Expected Result**: All fields properly labeled

#### Error Handling
1. Submit form with errors
2. Verify:
   - Errors are announced to screen readers
   - Error messages are associated with fields (aria-describedby)
   - Focus moves to first error
   - Errors are visible and clear

**Expected Result**: Errors are accessible

#### Success Messages
1. Submit valid form
2. Verify:
   - Success message is announced
   - Message is visible
   - Focus management is appropriate

**Expected Result**: Success is communicated

### 8. Dynamic Content Testing

#### Live Regions
1. Trigger dynamic updates:
   - Job status change
   - New notification
   - Timer update
   - Data refresh
2. Verify updates are announced to screen readers
3. Verify announcements don't interrupt user

**Expected Result**: Updates are announced appropriately

#### Loading States
1. Trigger loading state
2. Verify:
   - Loading indicator is announced
   - Progress is communicated
   - User can cancel if appropriate

**Expected Result**: Loading states are accessible

## Test Results Documentation

### Template

```markdown
## Test Date: [Date]
## Tester: [Name]
## Browser: [Browser and Version]
## Screen Reader: [Name and Version]

### Automated Tests
- [ ] axe DevTools: [Score/Issues]
- [ ] Lighthouse: [Score]
- [ ] WAVE: [Errors/Alerts]

### Keyboard Navigation
- [ ] Tab navigation works
- [ ] Skip links work
- [ ] Keyboard shortcuts work
- [ ] Focus management works

### Screen Reader
- [ ] Dashboard accessible
- [ ] Job list accessible
- [ ] Job form accessible
- [ ] Mobile views accessible

### Color Contrast
- [ ] All text passes WCAG AA
- [ ] Status colors pass
- [ ] Color blindness tested

### Zoom/Magnification
- [ ] 200% zoom works
- [ ] Text resize works

### Mobile
- [ ] Touch targets adequate
- [ ] Mobile screen reader works

### Issues Found
1. [Issue description]
   - Severity: [Critical/High/Medium/Low]
   - Location: [Page/Component]
   - Steps to reproduce: [Steps]
   - Expected: [Expected behavior]
   - Actual: [Actual behavior]

### Recommendations
1. [Recommendation]
```

## Continuous Testing

### Automated Testing in CI/CD
1. Add axe-core to test suite
2. Run accessibility tests on every build
3. Fail build if critical issues found
4. Generate accessibility reports

### Regular Manual Testing
- Test with screen readers monthly
- Test new features before release
- Conduct user testing with people with disabilities
- Review and update documentation quarterly

## Resources

### Documentation
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Articles](https://webaim.org/articles/)

### Tools
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE](https://wave.webaim.org/)
- [NVDA](https://www.nvaccess.org/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

### Training
- [Web Accessibility by Google (Udacity)](https://www.udacity.com/course/web-accessibility--ud891)
- [WebAIM Training](https://webaim.org/training/)
- [Deque University](https://dequeuniversity.com/)

## Support

For accessibility questions or issues:
1. Check this documentation
2. Review WCAG guidelines
3. Test with assistive technologies
4. Consult with accessibility experts
5. Gather feedback from users with disabilities
