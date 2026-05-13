# Screen Reader Testing Guide for ATLAS

## Overview

This guide provides instructions for testing ATLAS components with screen readers to ensure accessibility for users with visual impairments.

## Screen Readers

### Windows

#### NVDA (Free)
- **Download**: https://www.nvaccess.org/download/
- **Browser**: Firefox or Chrome
- **Start**: Ctrl + Alt + N
- **Stop**: Insert + Q
- **Read All**: Insert + Down Arrow
- **Next Element**: Down Arrow
- **Previous Element**: Up Arrow
- **Next Heading**: H
- **Next Link**: K
- **Next Button**: B
- **Next Form Field**: F
- **Next Table**: T

#### JAWS (Commercial)
- **Website**: https://www.freedomscientific.com/products/software/jaws/
- **Browser**: Chrome, Firefox, or Edge
- **Start**: Automatically starts with Windows
- **Stop**: Insert + F4
- **Read All**: Insert + Down Arrow
- **Next Element**: Down Arrow
- **Previous Element**: Up Arrow
- **Next Heading**: H
- **Next Link**: Tab
- **Next Button**: B
- **Forms Mode**: Enter/Space on form field

### macOS/iOS

#### VoiceOver (Built-in)
- **Start**: Cmd + F5 (or triple-click Touch ID)
- **Stop**: Cmd + F5
- **VoiceOver Key**: Control + Option (VO)
- **Read All**: VO + A
- **Next Element**: VO + Right Arrow
- **Previous Element**: VO + Left Arrow
- **Next Heading**: VO + Cmd + H
- **Rotor**: VO + U (navigate by headings, links, etc.)
- **Interact with Element**: VO + Space

### Android

#### TalkBack (Built-in)
- **Start**: Settings > Accessibility > TalkBack
- **Quick Enable**: Volume Up + Volume Down (3 seconds)
- **Next Element**: Swipe Right
- **Previous Element**: Swipe Left
- **Activate**: Double Tap
- **Reading Controls**: Swipe Up/Down

## Testing Checklist

### General Navigation

- [ ] Screen reader announces page title on load
- [ ] Landmarks (main, navigation, search) are announced
- [ ] Headings are announced with correct level
- [ ] Skip links are announced and functional
- [ ] Focus order is logical and predictable

### Tables

- [ ] Table caption is announced
- [ ] Column headers are announced
- [ ] Row headers are announced (if applicable)
- [ ] Cell content is announced with context
- [ ] Sorting state is announced
- [ ] Loading state is announced
- [ ] Empty state is announced

### Forms

- [ ] Labels are announced for all inputs
- [ ] Required fields are announced
- [ ] Error messages are announced immediately
- [ ] Hint text is announced
- [ ] Invalid state is announced
- [ ] Success messages are announced

### Buttons and Links

- [ ] Button purpose is clear from label
- [ ] Link destination is clear from text
- [ ] Icon-only buttons have aria-label
- [ ] Disabled state is announced
- [ ] Loading state is announced

### Status Messages

- [ ] Success messages are announced
- [ ] Error messages are announced immediately
- [ ] Warning messages are announced
- [ ] Loading states are announced
- [ ] Progress updates are announced

### Modals and Dialogs

- [ ] Modal title is announced on open
- [ ] Focus moves to modal on open
- [ ] Focus is trapped within modal
- [ ] Close button is announced
- [ ] Focus returns to trigger on close

### Dynamic Content

- [ ] New content is announced when added
- [ ] Removed content is announced
- [ ] Updated content is announced
- [ ] Loading states are announced
- [ ] Completion states are announced

## Component-Specific Tests

### Deployment List

```
Expected Announcements:
1. "Deployments, main region"
2. "Skip to deployments table, link"
3. "Create New Deployment, button"
4. "Filter deployments, search region"
5. "Deployments table with X total deployments, table"
6. "Title, column header, sortable"
7. "Deployment: [name], State: [state], Type: [type], row"
8. "View details for deployment: [name], button"
```

Test Steps:
1. Navigate to deployment list page
2. Verify page title is announced
3. Tab through filter controls
4. Verify filter labels are announced
5. Navigate to table
6. Verify table caption is announced
7. Navigate through table rows
8. Verify row content is announced with context
9. Activate "View Details" button
10. Verify navigation occurs

### Deployment Detail

```
Expected Announcements:
1. "Deployment Details, main region"
2. "Deployment: [name], heading level 1"
3. "State: [state], status"
4. "Type: [type], status"
5. "State transition, button"
6. "Submit evidence, button"
7. "Request approval, button"
```

Test Steps:
1. Navigate to deployment detail page
2. Verify deployment title is announced
3. Navigate through status indicators
4. Verify state and type are announced
5. Navigate to action buttons
6. Verify button purposes are clear
7. Activate state transition
8. Verify modal is announced

### AI Analysis

```
Expected Announcements:
1. "AI Analysis, main region"
2. "Run Analysis, button"
3. "Loading analysis, status"
4. "Analysis complete, status"
5. "Readiness: [status], status"
6. "Findings, heading level 2"
7. "[Severity] severity finding: [title]"
8. "Recommendations, heading level 2"
9. "[Priority] priority: [title]"
```

Test Steps:
1. Navigate to AI analysis page
2. Activate "Run Analysis" button
3. Verify loading state is announced
4. Wait for analysis to complete
5. Verify completion is announced
6. Navigate through findings
7. Verify severity is announced
8. Navigate through recommendations
9. Verify priority is announced

### Query Builder

```
Expected Announcements:
1. "Query Builder, main region"
2. "Data source, combobox"
3. "Add filter, button"
4. "Field, combobox"
5. "Operator, combobox"
6. "Value, textbox"
7. "Execute Query, button"
8. "Loading results, status"
9. "Query results, table"
10. "Export, button"
```

Test Steps:
1. Navigate to query builder page
2. Select data source
3. Verify selection is announced
4. Add filter
5. Verify filter controls are announced
6. Execute query
7. Verify loading state is announced
8. Navigate through results
9. Verify results are announced
10. Export results
11. Verify export is announced

## Common Issues and Solutions

### Issue: Content not announced

**Possible Causes:**
- Missing ARIA label
- Missing role attribute
- Content hidden with display: none
- Content outside live region

**Solutions:**
- Add aria-label or aria-labelledby
- Add appropriate role attribute
- Use visibility: hidden or position: absolute for hiding
- Ensure dynamic content is in aria-live region

### Issue: Too much information announced

**Possible Causes:**
- Redundant labels
- Unnecessary ARIA attributes
- Decorative content not hidden

**Solutions:**
- Remove redundant text
- Use aria-hidden="true" for decorative elements
- Simplify ARIA labels

### Issue: Announcements out of order

**Possible Causes:**
- Incorrect DOM order
- Focus management issues
- Async content loading

**Solutions:**
- Ensure logical DOM order
- Manage focus explicitly
- Use aria-live for async updates

### Issue: Modal not announced

**Possible Causes:**
- Missing role="dialog"
- Missing aria-labelledby
- Focus not moved to modal

**Solutions:**
- Add role="dialog" or role="alertdialog"
- Add aria-labelledby pointing to title
- Move focus to modal on open

## Best Practices

### DO

✅ Use semantic HTML elements
✅ Provide descriptive labels
✅ Announce state changes
✅ Announce loading states
✅ Announce errors immediately
✅ Use aria-live for dynamic content
✅ Hide decorative content
✅ Test with actual screen readers

### DON'T

❌ Rely on visual cues alone
❌ Use placeholder as label
❌ Announce every keystroke
❌ Over-announce content
❌ Use generic labels like "Click here"
❌ Forget to announce errors
❌ Assume automated tests are enough

## Testing Workflow

### 1. Automated Testing

Run automated accessibility tests:

```bash
npm run test:a11y
```

### 2. Manual Testing with Screen Reader

For each component:

1. **Navigate to component**
   - Verify page title is announced
   - Verify main landmarks are announced

2. **Tab through interactive elements**
   - Verify all elements are reachable
   - Verify labels are descriptive
   - Verify state is announced

3. **Test dynamic content**
   - Trigger state changes
   - Verify changes are announced
   - Verify timing is appropriate

4. **Test error states**
   - Trigger errors
   - Verify errors are announced immediately
   - Verify error messages are clear

5. **Test success states**
   - Complete actions
   - Verify success is announced
   - Verify next steps are clear

### 3. Document Issues

For each issue found:

```markdown
## Issue: [Brief description]

**Component**: [Component name]
**Screen Reader**: [NVDA/JAWS/VoiceOver/TalkBack]
**Browser**: [Browser name and version]

**Steps to Reproduce**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected**: [What should be announced]
**Actual**: [What was actually announced]

**Severity**: [Critical/High/Medium/Low]
```

## Resources

### Documentation
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Screen Reader Testing](https://webaim.org/articles/screenreader_testing/)
- [Deque University](https://dequeuniversity.com/)

### Tools
- [NVDA](https://www.nvaccess.org/)
- [JAWS](https://www.freedomscientific.com/products/software/jaws/)
- [VoiceOver User Guide](https://support.apple.com/guide/voiceover/welcome/mac)
- [TalkBack User Guide](https://support.google.com/accessibility/android/answer/6283677)

### Communities
- [WebAIM Discussion List](https://webaim.org/discussion/)
- [A11y Slack](https://web-a11y.slack.com/)
- [NVDA Users Mailing List](https://nvda.groups.io/g/nvda)

## Support

For questions about screen reader testing, contact the ATLAS accessibility team or file an issue in the project repository.
