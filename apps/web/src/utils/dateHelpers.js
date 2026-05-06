export function toTimeInputValue(dbTime) {
  // dbTime often comes as "09:00:00"; keep HH:MM for <input type="time" />
  if (!dbTime) return "";
  return String(dbTime).slice(0, 5);
}

export function toDbTimeValue(inputHHMM) {
  if (!inputHHMM) return null;
  return `${inputHHMM}:00`;
}

export function getTodayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function getDatePlusDaysISO(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
