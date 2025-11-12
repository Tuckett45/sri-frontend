import { ChecklistItem } from '../models/deployment.models';

export function isChecklistComplete(items: ChecklistItem[], formValue: Record<string, unknown>): boolean {
  return items.every(item => {
    if (!item.required) {
      return true;
    }
    const value = formValue[item.id];
    switch (item.type) {
      case 'checkbox':
        return !!value;
      case 'photo':
      case 'file':
        return Array.isArray(value) && value.length > 0;
      default:
        return value !== undefined && value !== null && String(value).trim().length > 0;
    }
  });
}
