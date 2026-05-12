import { CertificationStatus } from '../models/technician.model';

/**
 * Number of days before expiration at which a credential is considered "expiring soon".
 */
const EXPIRING_SOON_THRESHOLD_DAYS = 30;

/**
 * Computes the certification status based on the expiration date relative to a reference date.
 *
 * @param expirationDate - The date the credential expires
 * @param referenceDate - The date to compare against (defaults to current date)
 * @returns CertificationStatus.Expired if expired, ExpiringSoon if within 30 days, Active otherwise
 */
export function computeCredentialStatus(
  expirationDate: Date,
  referenceDate: Date = new Date()
): CertificationStatus {
  if (expirationDate < referenceDate) {
    return CertificationStatus.Expired;
  }

  const thresholdDate = new Date(referenceDate);
  thresholdDate.setDate(thresholdDate.getDate() + EXPIRING_SOON_THRESHOLD_DAYS);

  if (expirationDate <= thresholdDate) {
    return CertificationStatus.ExpiringSoon;
  }

  return CertificationStatus.Active;
}
