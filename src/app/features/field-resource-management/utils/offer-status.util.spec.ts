import { OFFER_TRANSITIONS, getValidTransitions, isValidTransition } from './offer-status.util';
import { OfferStatus } from '../models/onboarding.models';

describe('offer-status.util', () => {
  const allStatuses: OfferStatus[] = [
    'needs_review', 'vetted_available', 'offer_extended',
    'offer_accepted_onboarding', 'hired_assigned',
    'do_not_hire', 'turned_down_hold'
  ];

  describe('OFFER_TRANSITIONS', () => {
    it('should have an entry for every OfferStatus value', () => {
      for (const status of allStatuses) {
        expect(OFFER_TRANSITIONS[status]).toBeDefined();
      }
    });
  });

  describe('getValidTransitions', () => {
    it('should return vetted_available, do_not_hire, turned_down_hold for needs_review', () => {
      expect(getValidTransitions('needs_review')).toEqual(['vetted_available', 'do_not_hire', 'turned_down_hold']);
    });

    it('should return offer_extended, needs_review, do_not_hire, turned_down_hold for vetted_available', () => {
      expect(getValidTransitions('vetted_available')).toEqual(['offer_extended', 'needs_review', 'do_not_hire', 'turned_down_hold']);
    });

    it('should return offer_accepted_onboarding, vetted_available, do_not_hire, turned_down_hold for offer_extended', () => {
      expect(getValidTransitions('offer_extended')).toEqual(['offer_accepted_onboarding', 'vetted_available', 'do_not_hire', 'turned_down_hold']);
    });

    it('should return hired_assigned, vetted_available for offer_accepted_onboarding', () => {
      expect(getValidTransitions('offer_accepted_onboarding')).toEqual(['hired_assigned', 'vetted_available']);
    });

    it('should return vetted_available for hired_assigned', () => {
      expect(getValidTransitions('hired_assigned')).toEqual(['vetted_available']);
    });

    it('should return needs_review for do_not_hire', () => {
      expect(getValidTransitions('do_not_hire')).toEqual(['needs_review']);
    });

    it('should return needs_review, vetted_available for turned_down_hold', () => {
      expect(getValidTransitions('turned_down_hold')).toEqual(['needs_review', 'vetted_available']);
    });
  });

  describe('isValidTransition', () => {
    it('should allow needs_review → vetted_available', () => {
      expect(isValidTransition('needs_review', 'vetted_available')).toBeTrue();
    });

    it('should allow needs_review → do_not_hire', () => {
      expect(isValidTransition('needs_review', 'do_not_hire')).toBeTrue();
    });

    it('should allow needs_review → turned_down_hold', () => {
      expect(isValidTransition('needs_review', 'turned_down_hold')).toBeTrue();
    });

    it('should allow vetted_available → offer_extended', () => {
      expect(isValidTransition('vetted_available', 'offer_extended')).toBeTrue();
    });

    it('should allow turned_down_hold → needs_review', () => {
      expect(isValidTransition('turned_down_hold', 'needs_review')).toBeTrue();
    });

    it('should allow turned_down_hold → vetted_available', () => {
      expect(isValidTransition('turned_down_hold', 'vetted_available')).toBeTrue();
    });

    it('should reject do_not_hire → any status except needs_review', () => {
      const blocked: OfferStatus[] = ['vetted_available', 'offer_extended', 'offer_accepted_onboarding', 'hired_assigned', 'do_not_hire', 'turned_down_hold'];
      for (const status of blocked) {
        expect(isValidTransition('do_not_hire', status)).toBeFalse();
      }
    });

    it('should allow do_not_hire → needs_review', () => {
      expect(isValidTransition('do_not_hire', 'needs_review')).toBeTrue();
    });

    it('should reject needs_review → hired_assigned (skip stages)', () => {
      expect(isValidTransition('needs_review', 'hired_assigned')).toBeFalse();
    });

    it('should reject needs_review → needs_review (self-transition)', () => {
      expect(isValidTransition('needs_review', 'needs_review')).toBeFalse();
    });
  });
});
