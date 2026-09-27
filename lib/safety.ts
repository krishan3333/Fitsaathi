// Shared labels/helpers for Women-Safe Mode (safety sessions, trusted
// contacts, SOS) — used by components/safety/*.
import type { SafetySessionStatus } from "./supabase/types";

export const SAFETY_STATUS_LABELS: Record<SafetySessionStatus, string> = {
  active: "Session active",
  sos: "SOS triggered",
  ended: "Session ended",
};

export function mapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

/** The message handed to the device's own SMS/WhatsApp/share sheet — never
 * sent by a server, since no SMS/email provider exists in this app. */
export function sosMessage(name: string, mapsUrl: string | null): string {
  return `${name} triggered an SOS on MoveUp Safety.${mapsUrl ? ` Last known location: ${mapsUrl}` : " No location was shared."} Please check on them.`;
}

function digitsOnly(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

export function smsHref(phone: string, message: string): string {
  // iOS uses "&body=", Android/desktop use "?body=" — sniff once, best-effort.
  const separator = /iphone|ipad|ipod/i.test(typeof navigator === "undefined" ? "" : navigator.userAgent) ? "&" : "?";
  return `sms:${digitsOnly(phone)}${separator}body=${encodeURIComponent(message)}`;
}

export function whatsappHref(phone: string, message: string): string {
  return `https://wa.me/${digitsOnly(phone).replace(/^\+/, "")}?text=${encodeURIComponent(message)}`;
}
