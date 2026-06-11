import { OfferStatus } from '../models/onboarding.models';

/**
 * Defines the valid offer status transitions.
 *
 * State machine:
 *   needs_review → vetted_available | do_not_hire | turned_down_hold
 *   vetted_available → offer_extended | needs_review | do_not_hire | turned_down_hold
 *   offer_extended → offer_accepted_onboarding | vetted_available | do_not_hire | turned_down_hold
 *   offer_accepted_onboarding → hired_assigned | vetted_available (for reassignment)
 *   hired_assigned → vetted_available (for reassignment)
 *   do_not_hire → needs_review (can be reconsidered)
 *   turned_down_hold → needs_review | vetted_available (can be reconsidered later)
 */
export const OFFER_TRANSITIONS: Record<OfferStatus, OfferStatus[]> = {
  needs_review: ['vetted_available', 'do_not_hire', 'turned_down_hold'],
  vetted_available: ['offer_extended', 'needs_review', 'do_not_hire', 'turned_down_hold'],
  offer_extended: ['offer_accepted_onboarding', 'vetted_available', 'do_not_hire', 'turned_down_hold'],
  offer_accepted_onboarding: ['hired_assigned', 'vetted_available'],
  hired_assigned: ['vetted_available'],
  do_not_hire: ['needs_review'],
  turned_down_hold: ['needs_review', 'vetted_available'],
};

/**
 * Returns the list of valid target statuses for a given current status.
 */
export function getValidTransitions(current: OfferStatus): OfferStatus[] {
  return OFFER_TRANSITIONS[current] ?? [];
}

/**
 * Checks whether transitioning from one offer status to another is allowed.
 */
export function isValidTransition(from: OfferStatus, to: OfferStatus): boolean {
  return getValidTransitions(from).includes(to);
}
