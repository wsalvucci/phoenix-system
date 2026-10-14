import type { DisplayBoard, DisplayBoards, DisplayStudentRow } from '@/app/supaApi/universal/displayTypes';

// Rows arrive already cut by the server (public.display_cut). Nothing here limits, ranks,
// merges or re-orders across cohorts: each slide is exactly one board.
export type DisplayRow = { key: string; name: string; detail: string; points: number; rank: number };
export type DisplaySlide = { id: string; title: string; subtitle: string; rows: DisplayRow[] };
export const formatPoints = (value: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value || 0);
export const studentName = (student: Pick<DisplayStudentRow, 'firstName' | 'lastName'>) => `${student.firstName} ${student.lastName}`;

export const toDisplayRows = (board: DisplayBoard | undefined): DisplayRow[] =>
  (board?.rows ?? []).map(row => ({ key: row.key, name: studentName(row), detail: `Grade ${row.grade}`, points: row.totalPoints, rank: row.rank }));

export function buildSlides(data: DisplayBoards): DisplaySlide[] {
  const slides: DisplaySlide[] = [];
  const add = (board: DisplayBoard, title: string, subtitle: string) => {
    const rows = toDisplayRows(board);
    if (rows.length) slides.push({ id: board.key, title, subtitle, rows });
  };
  add(data.overall, 'The leaderboard', 'Overall standings');
  data.pointGroups.forEach(board => add(board, board.title, 'Category leaders'));
  data.grades.forEach(board => add(board, `${board.title} standouts`, 'Your classmates. Their achievements.'));
  return slides.length ? slides : [{ id: 'empty', title: 'Your story starts here', subtitle: 'Student achievements will appear as points are earned.', rows: [] }];
}
