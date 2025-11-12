import { isChecklistComplete } from './checklist.utils';
import { ChecklistItem } from '../models/deployment.models';

describe('isChecklistComplete', () => {
  const items: ChecklistItem[] = [
    { id: 'checkbox', label: 'Check', type: 'checkbox', required: true },
    { id: 'text', label: 'Text', type: 'text', required: true },
    { id: 'photo', label: 'Photo', type: 'photo', required: true },
  ];

  it('returns false when required values missing', () => {
    const result = isChecklistComplete(items, { checkbox: false, text: '', photo: [] });
    expect(result).toBeFalse();
  });

  it('returns true when values provided', () => {
    const result = isChecklistComplete(items, { checkbox: true, text: 'ok', photo: ['id'] });
    expect(result).toBeTrue();
  });
});
