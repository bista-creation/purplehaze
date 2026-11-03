const NEPAL_OFFSET = "+05:45";

export function parseNepalDateTime(value: string): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  const normalized = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)
    ? `${trimmed}:00${NEPAL_OFFSET}`
    : /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(trimmed)
      ? `${trimmed}${NEPAL_OFFSET}`
      : trimmed;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseNepalDateAndTime(dateValue: string, timeValue: string) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);
  const timeMatch = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(timeValue.trim());
  if (!dateMatch || !timeMatch) return null;

  let hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);
  const meridiem = timeMatch[3].toUpperCase();
  if (meridiem === "PM" && hours !== 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;

  const iso = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}T${String(
    hours,
  ).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00${NEPAL_OFFSET}`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function todayInNepal() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Returns UTC Date objects for start-of-day (00:00:00) and end-of-day (23:59:59.999)
 * aligned strictly with the Asia/Kathmandu (UTC+05:45) day boundary.
 */
export function getNepalDayRange(dateStr?: string): {
  startOfDay: Date;
  endOfDay: Date;
  dateStr: string;
} {
  const targetDateStr = dateStr || todayInNepal();
  const startOfDay = new Date(`${targetDateStr}T00:00:00.000${NEPAL_OFFSET}`);
  const endOfDay = new Date(`${targetDateStr}T23:59:59.999${NEPAL_OFFSET}`);
  return { startOfDay, endOfDay, dateStr: targetDateStr };
}

export function isRestaurantOpen(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kathmandu",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const total = hour * 60 + minute;
  return total >= 9 * 60 && total < 22 * 60;
}
