import { OFFER_TRANSITIONS, getValidTransitions, isValidTransition } from './offer-status.util';
import { OfferStatus } from '../models/onboarding.models';

describe('offer-status.util', () => {
  const allStatuses: OfferStatus[] = ['pre_offer', 'offer', 'offer_acceptance'];

  describe('OFFER_TRANSITIONS', () => {
    it('should have an entry for every OfferStatus value', () => {
      for (const status of allStatuses) {
        expect(OFFER_TRANSITIONS[status]).toBeDefined();
      }
    });
  });

  describe('getValidTransitions', () => {
    it('should return [offer] for pre_offer', () => {
      expect(getValidTransitions('pre_offer')).toEqual(['offer']);
    });

    it('should return [pre_offer, offer_acceptance] for offer', () => {
      expect(getValidTransitions('offer')).toEqual(['pre_offer', 'offer_acceptance']);
    });

    it('should return [offer] for offer_acceptance', () => {
      expect(getValidTransitions('offer_acceptance')).toEqual(['offer']);
    });
  });

  describe('isValidTransition', () => {
    it('should allow pre_offer → offer', () => {
      expect(isValidTransition('pre_offer', 'offer')).toBeTrue();
    });

    it('should allow offer → pre_offer', () => {
      expect(isValidTransition('offer', 'pre_offer')).toBeTrue();
    });

    it('should allow offer → offer_acceptance', () => {
      expect(isValidTransition('offer', 'offer_acceptance')).toBeTrue();
    });

    it('should allow offer_acceptance → offer', () => {
      expect(isValidTransition('offer_acceptance', 'offer')).toBeTrue();
    });

    it('should reject pre_offer → offer_acceptance', () => {
      expect(isValidTransition('pre_offer', 'offer_acceptance')).toBeFalse();
    });

    it('should reject pre_offer → pre_offer (self-transition)', () => {
      expect(isValidTransition('pre_offer', 'pre_offer')).toBeFalse();
    });

    it('should reject offer → offer (self-transition)', () => {
      expect(isValidTransition('offer', 'offer')).toBeFalse();
    });

    it('should reject offer_acceptance → pre_offer', () => {
      expect(isValidTransition('offer_acceptance', 'pre_offer')).toBeFalse();
    });

    it('should reject offer_acceptance → offer_acceptance (self-transition)', () => {
      expect(isValidTransition('offer_acceptance', 'offer_acceptance')).toBeFalse();
    });
  });
});
