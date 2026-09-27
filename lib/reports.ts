// Shared labels for the Complaint & Review system — used by
// components/reports/* and components/coordinator/*.
import type { ComplaintCategory, ComplaintStatus, ComplaintTargetType } from "./supabase/types";

export const TARGET_TYPE_LABELS: Record<ComplaintTargetType, string> = {
  facility: "Facility",
  coach: "Coach",
  event: "Event",
};

export const COMPLAINT_CATEGORY_LABELS: Record<ComplaintCategory, string> = {
  safety: "Safety concern",
  harassment: "Harassment",
  cleanliness: "Cleanliness",
  equipment: "Equipment issue",
  staff_behavior: "Staff behaviour",
  other: "Other",
};

export const COMPLAINT_STATUS_LABELS: Record<ComplaintStatus, string> = {
  open: "Open",
  in_review: "In review",
  resolved: "Resolved",
  rejected: "Rejected",
};

export const COMPLAINT_STATUS_VARIANT: Record<ComplaintStatus, "default" | "warning" | "success" | "danger"> = {
  open: "default",
  in_review: "warning",
  resolved: "success",
  rejected: "danger",
};
