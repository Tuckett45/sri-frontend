import { OfferStatus } from '../models/onboarding.models';

/**
 * Defines the valid offer status transitions.
 *
 * State machine:
 *   pre_offer → offer
 *   offer → pre_offer | offer_acceptance
 *   offer_acceptance → offer
 */
export const OFFER_TRANSITIONS: Record<OfferStatus, OfferStatus[]> = {
  pre_offer: ['offer'],
  offer: ['pre_offer', 'offer_acceptance'],
  offer_acceptance: ['offer'],
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
