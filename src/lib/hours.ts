import { SP_OFFSET_MS } from "@/lib/dates";
import { WEEKDAYS } from "@/lib/format";

export interface BusinessHour {
  weekday: number;
  is_closed: boolean;
  open_time: string | null;
  close_time: string | null;
}

/** Hora atual no fuso de São Paulo, sem depender do fuso do servidor. */
export function spNow() {
  const now = new Date(Date.now() - SP_OFFSET_MS);
  return {
    weekday: now.getUTCDay(),
    minutes: now.getUTCHours() * 60 + now.getUTCMinutes(),
  };
}

function toMinutes(value: string | null | undefined) {
  if (!value) return null;
  const [hours, minutes] = value.split(":");
  const h = Number(hours);
  const m = Number(minutes);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function short(value: string | null | undefined) {
  if (!value) return "";
  return value.slice(0, 5);
}

export function todayHours(hours: BusinessHour[]) {
  const { weekday } = spNow();
  return hours.find((row) => row.weekday === weekday) ?? null;
}

export function isOpenNow(hours: BusinessHour[], override: boolean | null) {
  if (override === false) return false;
  if (override === true) return true;

  const today = todayHours(hours);
  if (!today || today.is_closed) return false;

  const open = toMinutes(today.open_time);
  const close = toMinutes(today.close_time);
  if (open === null || close === null) return false;

  const { minutes } = spNow();
  if (close === open) return true;
  if (close < open) return minutes >= open || minutes < close;
  return minutes >= open && minutes < close;
}

/** Ex.: "Hoje: 18:00 às 23:30" ou "Fechado hoje". */
export function todayHoursLabel(hours: BusinessHour[]) {
  const today = todayHours(hours);
  if (!today) return "Horário não informado";
  if (today.is_closed) return "Fechado hoje";
  if (!today.open_time || !today.close_time) return "Horário não informado";
  return `Hoje: ${short(today.open_time)} às ${short(today.close_time)}`;
}

export function weeklyHours(hours: BusinessHour[]) {
  return [...hours]
    .sort((a, b) => a.weekday - b.weekday)
    .map((row) => ({
      ...row,
      label: WEEKDAYS[row.weekday] ?? "",
      hours:
        row.is_closed || !row.open_time || !row.close_time
          ? "Fechado"
          : `${short(row.open_time)} às ${short(row.close_time)}`,
    }));
}
