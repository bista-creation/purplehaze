import { parseNepalDateTime, todayInNepal } from "@/lib/time";
import { toDateInput } from "@/lib/utils";

export interface ReportRange {
  fromDay: string;
  toDay: string;
  from: Date;
  to: Date;
}

/**
 * Resolves optional Nepal-time date inputs. When no dates are supplied the
 * caller can decide whether to export everything or use a default range.
 */
export function resolveReportRange(
  params: URLSearchParams,
  options: { defaultDays?: number | null } = {},
): ReportRange | null {
  const fromParam = params.get("from");
  const toParam = params.get("to");
  const valid = (value: string | null) =>
    value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;

  if (!valid(fromParam) && !valid(toParam) && options.defaultDays === null) {
    return null;
  }

  const today = todayInNepal();
  const defaultDays = options.defaultDays ?? 30;
  const defaultFrom = new Date(`${today}T00:00:00+05:45`);
  defaultFrom.setUTCDate(defaultFrom.getUTCDate() - Math.max(0, defaultDays - 1));

  let fromDay = valid(fromParam) ?? toDateInput(defaultFrom);
  let toDay = valid(toParam) ?? today;
  if (fromDay > toDay) [fromDay, toDay] = [toDay, fromDay];

  const from = parseNepalDateTime(`${fromDay}T00:00`);
  const to = parseNepalDateTime(`${toDay}T23:59:59`);
  if (!from || !to) return null;
  return { fromDay, toDay, from, to };
}

export function nepalRangeLabel(range: ReportRange) {
  return `${range.fromDay} to ${range.toDay}`;
}
