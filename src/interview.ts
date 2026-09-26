// The yearly interview ritual, kept pure and free of Preact so it can be
// unit-tested without a browser: the finite age-aware prompt pack, the age math,
// the band selection, the entry title, and the calm birthday nudge. There is no
// runtime generation of prompts. Every string here is user-visible and shipped
// verbatim, so it is copy-swept.

import type { Vault } from "./vault";

export type Prompt = { id: string; text: string };
export type PromptBand = { id: string; minAge: number; maxAge: number; prompts: Prompt[] };

// The finite pack. Seven contiguous, non-overlapping bands covering the first
// year through the teens. The teen band's maxAge clamps every older age. Prompt
// ids are stable (`<bandId>-<n>`). Each prompt is one short question.
export const AGE_BANDS: PromptBand[] = [
  {
    id: "first-year",
    minAge: 0,
    maxAge: 0,
    prompts: [
      { id: "first-year-1", text: "What makes you laugh right now?" },
      { id: "first-year-2", text: "What are you learning to do this month?" },
      { id: "first-year-3", text: "How do you like to be held and comforted?" },
      { id: "first-year-4", text: "What sound or song calms you down?" },
      { id: "first-year-5", text: "What do I want to remember about you at this age?" },
    ],
  },
  {
    id: "toddler",
    minAge: 1,
    maxAge: 2,
    prompts: [
      { id: "toddler-1", text: "What is your favorite thing to play with?" },
      { id: "toddler-2", text: "What word do you say all the time?" },
      { id: "toddler-3", text: "What food do you ask for again and again?" },
      { id: "toddler-4", text: "Who do you run to first in the morning?" },
      { id: "toddler-5", text: "What makes you laugh the hardest?" },
    ],
  },
  {
    id: "little-kid",
    minAge: 3,
    maxAge: 4,
    prompts: [
      { id: "little-kid-1", text: "What do you want to be when you grow up?" },
      { id: "little-kid-2", text: "What is your favorite game right now?" },
      { id: "little-kid-3", text: "Who is your best friend, and what do you do together?" },
      { id: "little-kid-4", text: "What is the best food in the whole world?" },
      { id: "little-kid-5", text: "What makes you feel brave?" },
    ],
  },
  {
    id: "early-school",
    minAge: 5,
    maxAge: 7,
    prompts: [
      { id: "early-school-1", text: "What did you learn this year that you are proud of?" },
      { id: "early-school-2", text: "What do you love about your friends?" },
      { id: "early-school-3", text: "What is the funniest thing that happened this year?" },
      { id: "early-school-4", text: "If you could go anywhere, where would you go?" },
      { id: "early-school-5", text: "What are you a little scared of, and what helps?" },
    ],
  },
  {
    id: "middle-childhood",
    minAge: 8,
    maxAge: 10,
    prompts: [
      { id: "middle-childhood-1", text: "What are you really good at right now?" },
      {
        id: "middle-childhood-2",
        text: "What is something you changed your mind about this year?",
      },
      { id: "middle-childhood-3", text: "What do you and your friends laugh about?" },
      { id: "middle-childhood-4", text: "What is a dream you have for next year?" },
      { id: "middle-childhood-5", text: "When were you the happiest this year?" },
    ],
  },
  {
    id: "tween",
    minAge: 11,
    maxAge: 13,
    prompts: [
      { id: "tween-1", text: "What matters most to you right now?" },
      { id: "tween-2", text: "What is something grown-ups get wrong about your age?" },
      { id: "tween-3", text: "What are you most proud of this year?" },
      { id: "tween-4", text: "Who do you look up to, and why?" },
      { id: "tween-5", text: "What do you want more time for?" },
    ],
  },
  {
    id: "teen",
    minAge: 14,
    maxAge: 200,
    prompts: [
      { id: "teen-1", text: "What are you figuring out about who you are?" },
      { id: "teen-2", text: "What do you want your future self to remember about this year?" },
      { id: "teen-3", text: "What is a belief you hold strongly right now?" },
      { id: "teen-4", text: "What are you excited about after this year?" },
      { id: "teen-5", text: "What do you wish I understood better?" },
    ],
  },
];

// How far before or after the birthday the nudge is allowed to show.
const NUDGE_WINDOW_DAYS = 14;

// Parse a date-only ISO birth date ("2026-01-08") into calendar parts, rejecting
// anything that is not a real date. Parsing the parts by hand avoids timezone
// drift from Date parsing a bare date as UTC midnight.
function parseBirthParts(iso: string): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  // Round-trip to reject impossible days (April 31, Feb 30, Feb 29 off a leap year).
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

// Whole years from the birth date to now, calendar-correct: not yet having had
// this year's birthday means one year younger. Returns null for an unparseable
// or future date so callers can guard. Never negative.
export function ageInYears(birthDateIso: string, now: Date): number | null {
  const birth = parseBirthParts(birthDateIso);
  if (!birth) return null;
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth() + 1;
  const nowDay = now.getDate();
  let age = nowYear - birth.year;
  if (nowMonth < birth.month || (nowMonth === birth.month && nowDay < birth.day)) {
    age -= 1;
  }
  if (age < 0) return null;
  return age;
}

// The band whose [minAge, maxAge] contains the age. Ages below the youngest band
// clamp to it and ages at or above the oldest band's minAge clamp to it, so
// every non-negative age resolves to a non-empty band.
export function promptsForAge(ageYears: number): PromptBand {
  for (const band of AGE_BANDS) {
    if (ageYears >= band.minAge && ageYears <= band.maxAge) return band;
  }
  if (ageYears < AGE_BANDS[0].minAge) return AGE_BANDS[0];
  return AGE_BANDS[AGE_BANDS.length - 1];
}

// The entry's derived title. The first year reads differently because the child
// has no age in years yet.
export function interviewTitle(ageYears: number): string {
  if (ageYears <= 0) return "Interview in the first year";
  return `Interview at age ${ageYears}`;
}

// Decide whether the calm birthday nudge should show, and for which age. Pure:
// it takes now explicitly. It shows only when a birth date is known, now is
// within the window around the birthday anniversary, and no unsealed interview
// for the age reached at that anniversary exists yet. A Feb 29 birthday resolves
// on Feb 28 in a non-leap year.
export function birthdayNudge(vault: Vault, now: Date): { age: number } | null {
  const birthDate = vault.child?.birthDate;
  if (!birthDate) return null;
  const birth = parseBirthParts(birthDate);
  if (!birth) return null;

  const nowMidnight = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());

  // The window is far shorter than a year, so at most one anniversary can fall
  // inside it. Check the anniversaries around now and take the one in range.
  for (const anniversaryYear of [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]) {
    const age = anniversaryYear - birth.year;
    if (age < 0) continue;
    const day =
      birth.month === 2 && birth.day === 29 && !isLeapYear(anniversaryYear) ? 28 : birth.day;
    const anniversary = Date.UTC(anniversaryYear, birth.month - 1, day);
    const diffDays = Math.round((nowMidnight - anniversary) / 86_400_000);
    if (Math.abs(diffDays) > NUDGE_WINDOW_DAYS) continue;

    // This year's interview counts as recorded only when an unsealed interview
    // carries the age. A sealed interview has no readable age, so it cannot.
    const recorded = vault.entries.some(
      (e) => e.type === "interview" && e.sealed == null && e.childAgeYears === age,
    );
    if (recorded) return null;
    return { age };
  }
  return null;
}
