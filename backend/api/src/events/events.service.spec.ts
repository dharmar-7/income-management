import { occurrenceInfo } from './events.service';

describe('occurrenceInfo', () => {
  const today = new Date(2026, 5, 18); // 18 Jun 2026 (month is 0-indexed)

  it("finds this year's upcoming occurrence", () => {
    const r = occurrenceInfo(new Date(1990, 9, 10), today); // 10 Oct
    expect(r.next.getFullYear()).toBe(2026);
    expect(r.next.getMonth()).toBe(9);
    expect(r.next.getDate()).toBe(10);
    expect(r.isToday).toBe(false);
    expect(r.daysUntil).toBeGreaterThan(0);
    expect(r.turning).toBe(36);
  });

  it('rolls to next year when the date already passed this year', () => {
    const r = occurrenceInfo(new Date(1990, 2, 5), today); // 5 Mar
    expect(r.next.getFullYear()).toBe(2027);
    expect(r.turning).toBe(37);
  });

  it('flags an occasion that falls today', () => {
    const r = occurrenceInfo(new Date(1990, 5, 18), today); // 18 Jun
    expect(r.isToday).toBe(true);
    expect(r.daysUntil).toBe(0);
    expect(r.turning).toBe(36);
  });
});
