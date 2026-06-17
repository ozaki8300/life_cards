const DAY_MS = 86_400_000;

type DateParts = {
  day: number;
  month: number;
  year: number;
};

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function datePart(value: string) {
  return value.slice(0, 10);
}

export function parseDatePart(value: string): DateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart(value));

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return {
    day,
    month,
    year,
  };
}

export function formatDatePart({ day, month, year }: DateParts) {
  return `${year}-${padDatePart(month)}-${padDatePart(day)}`;
}

function toUtcTime(parts: DateParts) {
  return Date.UTC(parts.year, parts.month - 1, parts.day);
}

export function daysBetween(startDate: string, endDate: string) {
  const start = parseDatePart(startDate);
  const end = parseDatePart(endDate);

  if (!start || !end) {
    return null;
  }

  return Math.round((toUtcTime(end) - toUtcTime(start)) / DAY_MS);
}

export function absoluteDaysBetween(startDate: string, endDate: string) {
  const days = daysBetween(startDate, endDate);

  return days === null ? null : Math.abs(days);
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function addMonths(date: string, monthDelta: number) {
  const parts = parseDatePart(date);

  if (!parts) {
    return null;
  }

  const monthIndex = parts.month - 1 + monthDelta;
  const targetYear = parts.year + Math.floor(monthIndex / 12);
  const targetMonthIndex = ((monthIndex % 12) + 12) % 12;
  const targetMonth = targetMonthIndex + 1;
  const targetDay = Math.min(
    parts.day,
    daysInMonth(targetYear, targetMonth),
  );

  return formatDatePart({
    day: targetDay,
    month: targetMonth,
    year: targetYear,
  });
}

export function addDays(date: string, dayDelta: number) {
  const parts = parseDatePart(date);

  if (!parts) {
    return null;
  }

  const target = new Date(toUtcTime(parts) + dayDelta * DAY_MS);

  return formatDatePart({
    day: target.getUTCDate(),
    month: target.getUTCMonth() + 1,
    year: target.getUTCFullYear(),
  });
}

export function getIsoWeekNumber(date: string) {
  const parts = parseDatePart(date);

  if (!parts) {
    return null;
  }

  const target = new Date(toUtcTime(parts));
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);

  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));

  return Math.ceil(((target.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7);
}
