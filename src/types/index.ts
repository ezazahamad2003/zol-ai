import type { Database } from "./database";

export type Business = Database["public"]["Tables"]["businesses"]["Row"];
export type BusinessInsert = Database["public"]["Tables"]["businesses"]["Insert"];
export type BusinessUpdate = Database["public"]["Tables"]["businesses"]["Update"];

export type Booking = Database["public"]["Tables"]["bookings"]["Row"];
export type BookingInsert = Database["public"]["Tables"]["bookings"]["Insert"];

export type CallLog = Database["public"]["Tables"]["call_logs"]["Row"];

export type GoogleCalendarToken = Database["public"]["Tables"]["google_calendar_tokens"]["Row"];

export type WorkingHours = {
  [day: string]: { open: string; close: string; enabled: boolean };
};
