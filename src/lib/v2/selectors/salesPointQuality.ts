/**
 * Sales Point data quality derivation (sales-point-api §2; spec 07 §5).
 * Pure module shared by the seed builders and `salesPointStore` commands.
 */

import type {
  SalesPoint,
  SalesPointDataQuality,
  SalesPointDataWarning,
} from "@/lib/types/v2/salesPoint";

export function deriveSalesPointDataQuality(
  salesPoint: Omit<SalesPoint, "dataQuality"> & { dataQuality?: SalesPointDataQuality },
): SalesPointDataQuality {
  const warnings: SalesPointDataWarning[] = [];

  const hasCompleteAddress = Boolean(salesPoint.address.line1 && salesPoint.address.fullAddress);
  const primaryContact = salesPoint.contacts.find((contact) => contact.isPrimary && contact.isActive);
  const hasPrimaryContact = Boolean(primaryContact);
  const hasValidPhoneOrEmail = salesPoint.contacts.some(
    (contact) => contact.isActive && Boolean(contact.phone || contact.email),
  );
  const hasDeliveryInstructions = Boolean(salesPoint.deliveryInstructions);

  if (!hasPrimaryContact) {
    warnings.push({
      code: "MISSING_PRIMARY_CONTACT",
      message: "No active primary contact. Dispatch may be blocked by contact policy.",
      severity: "WARNING",
    });
  }
  if (!hasValidPhoneOrEmail) {
    warnings.push({
      code: "MISSING_PHONE_OR_EMAIL",
      message: "No contact with a valid phone or email.",
      severity: "WARNING",
    });
  }
  if (!hasCompleteAddress) {
    warnings.push({
      code: "MISSING_ADDRESS",
      message: "Address is incomplete. Dispatch requires a complete address unless waived.",
      severity: "CRITICAL",
    });
  }
  if (
    !salesPoint.geography.zone ||
    !salesPoint.geography.region ||
    !salesPoint.geography.area ||
    !salesPoint.geography.subArea
  ) {
    warnings.push({
      code: "MISSING_GEOGRAPHY",
      message: "Geography hierarchy (Zone/Region/Area/Sub Area) is incomplete.",
      severity: "WARNING",
    });
  }
  if (!hasDeliveryInstructions) {
    warnings.push({
      code: "MISSING_DELIVERY_INSTRUCTION",
      message: "Delivery instructions are missing.",
      severity: "INFO",
    });
  }

  const recentIssueCount = salesPoint.dataQuality?.recentIssueCount ?? 0;

  let state: SalesPointDataQuality["state"] = "COMPLETE";
  if (salesPoint.status === "NEEDS_REVIEW") {
    state = "NEEDS_REVIEW";
  } else if (!hasCompleteAddress) {
    state = "MISSING_ADDRESS";
  } else if (!hasPrimaryContact || !hasValidPhoneOrEmail) {
    state = "MISSING_CONTACT";
  } else if (recentIssueCount > 0) {
    state = "REPEATED_ISSUE";
  } else if (!hasDeliveryInstructions) {
    state = "DELIVERY_INSTRUCTION_MISSING";
  }

  return {
    state,
    hasCompleteAddress,
    hasPrimaryContact,
    hasValidPhoneOrEmail,
    hasDeliveryInstructions,
    recentIssueCount,
    warnings,
  };
}
