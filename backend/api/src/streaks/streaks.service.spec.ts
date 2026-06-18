import { computeStreaks, isoAddDays } from './streaks.service';

describe('isoAddDays', () => {
  it('adds and subtracts days, crossing month boundaries', () => {
    expect(isoAddDays('2026-06-18', -1)).toBe('2026-06-17');
    expect(isoAddDays('2026-07-01', -1)).toBe('2026-06-30');
    expect(isoAddDays('2026-06-30', 1)).toBe('2026-07-01');
  });
});

describe('computeStreaks', () => {
  const today = '2026-06-18';

  it('returns zero for no activity', () => {
    expect(computeStreaks(new Set(), today)).toEqual({ current: 0, longest: 0 });
  });

  it('counts a run ending today', () => {
    const days = new Set(['2026-06-16', '2026-06-17', '2026-06-18']);
    expect(computeStreaks(days, today)).toEqual({ current: 3, longest: 3 });
  });

  it('keeps the current streak alive if the latest activity was yesterday', () => {
    const days = new Set(['2026-06-16', '2026-06-17']);
    expect(computeStreaks(days, today)).toEqual({ current: 2, longest: 2 });
  });

  it('breaks the current streak when the gap is more than a day', () => {
    const days = new Set(['2026-06-15', '2026-06-16']); // ends two days before today
    const r = computeStreaks(days, today);
    expect(r.current).toBe(0);
    expect(r.longest).toBe(2);
  });

  it('reports the longest historical run separate from the current one', () => {
    const days = new Set(['2026-06-10', '2026-06-11', '2026-06-12', '2026-06-18']);
    const r = computeStreaks(days, today);
    expect(r.longest).toBe(3); // the 10→12 run
    expect(r.current).toBe(1); // only today
  });
});
