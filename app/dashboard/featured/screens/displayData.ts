import type { DisplayBoard, DisplayBoards, DisplayEvent, DisplayStudentRow } from '@/app/supaApi/universal/displayTypes';

// Rows arrive already cut by the server (public.display_cut). Nothing here limits, ranks,
// merges or re-orders across cohorts: each slide is exactly one board.
export type DisplayRow = { key: string; name: string; detail: string; points: number; rank: number };
export type DisplaySlide = { id: string; title: string; subtitle: string; rows: DisplayRow[]; color?: string | null };
export const formatPoints = (value: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value || 0);
export const studentName = (student: Pick<DisplayStudentRow, 'firstName' | 'lastName'>) => `${student.firstName} ${student.lastName}`;

export const toDisplayRows = (board: DisplayBoard | undefined): DisplayRow[] =>
  (board?.rows ?? []).map(row => ({ key: row.key, name: studentName(row), detail: `Grade ${row.grade}`, points: row.totalPoints, rank: row.rank }));

export function buildSlides(data: DisplayBoards): DisplaySlide[] {
  const slides: DisplaySlide[] = [];
  const add = (board: DisplayBoard, title: string, subtitle: string) => {
    const rows = toDisplayRows(board);
    if (rows.length) slides.push({ id: board.key, title, subtitle, rows, color: board.color });
  };
  const term = data.timeframes.find(t => t.id === data.timeframeId)?.name;
  add(data.overall, 'The Honor Roll', term ?? 'Overall standings');
  data.pointGroups.forEach(board => add(board, board.title, 'Category leaders'));
  data.grades.forEach(board => add(board, `${board.title} standouts`, 'Your classmates. Their achievements.'));
  return slides.length ? slides : [{ id: 'empty', title: 'Your story starts here', subtitle: 'Student achievements will appear as points are earned.', rows: [] }];
}

/** A wall shows ranks 1 to 10 only (DATA_DISCLOSURE.md D9). A higher rank is a cut violation: drop it and say so. */
export function visibleRows(rows: DisplayRow[]): DisplayRow[] {
  const kept = rows.filter(r => r.rank >= 1 && r.rank <= 10);
  if (kept.length !== rows.length) console.error('Display cut violation: a row ranked above 10 reached the wall and was not rendered.');
  return kept;
}

export type Scene =
  | { kind: 'board'; id: string; slide: DisplaySlide }
  | { kind: 'spotlight'; id: string }
  | { kind: 'events'; id: string; events: readonly DisplayEvent[] }
  | { kind: 'message'; id: string; heading: string; sub: string };

/**
 * The scenes of a rotation, in order: overall, categories, grades, one spotlight, coming up.
 * A scene exists only if its data exists; a school with only an overall board gets one scene.
 */
export function buildScenes(data: DisplayBoards): Scene[] {
  if (data.timeframeId === null) {
    return [{ kind: 'message', id: 'new-term', heading: 'A new term is about to begin.', sub: 'Student achievements will appear as points are earned.' }];
  }
  const slides = buildSlides(data);
  if (slides[0].id === 'empty') {
    return [{ kind: 'message', id: 'empty', heading: slides[0].title + '.', sub: slides[0].subtitle }];
  }
  const scenes: Scene[] = slides.map(slide => ({ kind: 'board', id: slide.id, slide }));
  if (data.grades.length === 0 && data.pointGroups.length === 0) return scenes;
  if (data.overall.rows.length) scenes.push({ kind: 'spotlight', id: 'spotlight' });
  if (data.upcomingEvents.length) scenes.push({ kind: 'events', id: 'events', events: data.upcomingEvents.slice(0, 4) });
  return scenes;
}
