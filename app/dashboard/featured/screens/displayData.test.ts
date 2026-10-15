import { describe, expect, it } from 'vitest';
import type { DisplayBoard, DisplayBoards } from '@/app/supaApi/universal/displayTypes';
import { buildSlides, toDisplayRows } from './displayData';

const board = (key: string, title: string, count: number, color: string | null = null): DisplayBoard => ({
  key, title, color,
  rows: Array.from({ length: count }, (_, i) => ({ key: `${key}:${i}`, rank: i + 1, firstName: `First${i}`, lastName: 'Example', grade: 9, totalPoints: (count - i) * 10 })),
});
const empty: DisplayBoards = { timeframes: [], timeframeId: 1, overall: board('overall', 'Overall', 0), grades: [], pointGroups: [], upcomingEvents: [] };

describe('TV display rotation', () => {
  it('keeps a usable empty screen when nothing is published', () => {
    expect(buildSlides(empty)).toEqual([expect.objectContaining({ id: 'empty', rows: [] })]);
  });

  it('renders each board as its own slide, in server order, without adding or dropping rows', () => {
    const data: DisplayBoards = { ...empty, overall: board('overall', 'Overall', 10), pointGroups: [board('pg-1', 'Service', 3, '#fff')], grades: [board('grade-9', 'Grade 9', 2)] };
    const slides = buildSlides(data);
    expect(slides.map(s => [s.id, s.rows.length])).toEqual([['overall', 10], ['pg-1', 3], ['grade-9', 2]]);
    expect(slides[1].title).toBe('Service');
    expect(slides[2].title).toBe('Grade 9 standouts');
  });

  it('carries only the opaque key, name, grade, points and rank', () => {
    const [row] = toDisplayRows(board('overall', 'Overall', 1));
    expect(row).toEqual({ key: 'overall:0', name: 'First0 Example', detail: 'Grade 9', points: 10, rank: 1 });
  });

  it('keeps tied ranks as the server sent them', () => {
    const tied: DisplayBoard = { key: 'overall', title: 'Overall', color: null, rows: [
      { key: 'overall:0', rank: 1, firstName: 'A', lastName: 'A', grade: 9, totalPoints: 50 },
      { key: 'overall:1', rank: 1, firstName: 'B', lastName: 'B', grade: 9, totalPoints: 50 },
      { key: 'overall:2', rank: 3, firstName: 'C', lastName: 'C', grade: 9, totalPoints: 40 },
    ] };
    expect(toDisplayRows(tied).map(r => r.rank)).toEqual([1, 1, 3]);
  });
});
