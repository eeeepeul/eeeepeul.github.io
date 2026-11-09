// The calendar in box 2 of the second pages: one square for each day of the month, filled dark from the bottom up
// as far as that day's visitors reach (the busiest day fills its square to the top).
export const CALENDAR_DAYS = 30

// The visitors counted on each day (the cumulative number of that day), by the day of the month.
// PLACEHOLDER: until the real counts are recorded these are made up (they follow the look of the supplied picture:
// three full days and some days at about a quarter). Replace this with the counts of the real month and nothing
// else needs to change.
export const SAMPLE_VISITORS = {
  1: 100,
  2: 24,
  4: 24,
  6: 24,
  7: 24,
  15: 24,
  18: 24,
  19: 100,
  22: 100,
  25: 24,
  26: 24,
}

// How full each day's square is, from 0 (empty) to 1 (full), for days 1..days, from the visitors of each day.
// A day with any visitors shows at least a sliver; a day with none stays empty.
export function getDayFills(counts = SAMPLE_VISITORS, days = CALENDAR_DAYS) {
  const visitors = Array.from({ length: days }, (_, index) => Math.max(0, Number(counts[index + 1]) || 0))
  const busiest = Math.max(0, ...visitors)
  return visitors.map((count) => {
    if (!count || !busiest) return 0
    return Math.min(1, Math.max(0.04, count / busiest))
  })
}
