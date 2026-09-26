// Human phrasing for the integrity readout. Kept pure and separate so the
// exact strings a parent reads are unit-tested.

export function formatEntryCount(count: number): string {
  if (count === 1) return "1 letter";
  return `${count} letters`;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function clockTime(d: Date): string {
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${hours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
}

// "today at 9:14 PM" when saved on the same calendar day, otherwise
// "March 3, 2026". Returns just the phrase; callers add "Saved ".
export function formatSavedMoment(iso: string, now: Date): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "at an unknown time";
  if (sameDay(d, now)) return `today at ${clockTime(d)}`;
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

// Full identity used by the download ritual: "March 3, 2026 at 9:14 PM".
export function formatFullMoment(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "an unknown time";
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} at ${clockTime(d)}`;
}

export function formatCopyLine(generation: number): string {
  return `This is copy ${generation}.`;
}
