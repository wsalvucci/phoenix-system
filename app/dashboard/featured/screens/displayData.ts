import type { GlobalPoints } from '@/app/supaApi/universal/utils/types';

export type DisplayRow = { id: number; name: string; detail: string; points: number; rank: number; change?: number };
export type DisplaySlide = { id: string; title: string; subtitle: string; rows: DisplayRow[] };
export const formatPoints = (value: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value || 0);
export const studentName = (student: GlobalPoints['students'][number]) => `${student.firstName} ${student.lastName}`;

// Match the existing grade policy: round fractional thirds up, with a hard cap.
export const studentDisplayLimit = (population: number) => Math.min(20, Math.ceil(Math.max(0, population) / 3));
export function limitStudentRows(rows: DisplayRow[], population: number): DisplayRow[] {
  const limit = studentDisplayLimit(population);
  // A student can enter the API shortlist through a different category. Never
  // promote that student into this category merely because other rows are absent.
  return rows.filter(row => row.rank > 0 && row.rank <= limit).slice(0, limit);
}

export function buildSlides(data: GlobalPoints): DisplaySlide[] {
  const slides: DisplaySlide[] = [];
  const add = (id: string, title: string, subtitle: string, rows: DisplayRow[]) => {
    if (!rows.length) return;
    slides.push({ id, title, subtitle: `${subtitle} · ${rows.length} ranked`, rows });
  };
  const students = [...data.students].sort((a, b) => b.totalPoints - a.totalPoints);
  const row = (s: typeof students[number]): DisplayRow => ({ id: s.id, name: studentName(s), detail: `Grade ${s.grade}`, points: s.totalPoints, rank: s.rank, change: s.lastMonthRank > 0 ? s.lastMonthRank - s.rank : undefined });
  add('overall', 'The leaderboard', 'Overall standings', limitStudentRows(students.map(row), data.totalStudents));
  data.pointGroups.forEach(group => {
    const rows = students.flatMap(s => {
      const score = s.pointGroups.find(p => p.id === group.id);
      return score && score.points > 0 ? [{ ...row(s), points: score.points, rank: score.rank, change: score.lastMonthRank > 0 ? score.lastMonthRank - score.rank : undefined }] : [];
    }).sort((a, b) => b.points - a.points);
    add(`category-${group.id}`, group.name, 'Category leaders', limitStudentRows(rows, data.categoryStudentCounts?.pointGroups[group.id] ?? rows.length));
  });
  [...data.grades].sort((a, b) => a - b).forEach(grade => {
    const gradeStudents = students.filter(s => s.grade === grade);
    const rows = gradeStudents.map(s => ({ ...row(s), rank: s.gradeRank, change: s.lastMonthGradeRank > 0 ? s.lastMonthGradeRank - s.gradeRank : undefined }));
    add(`grade-${grade}`, `Grade ${grade} standouts`, 'Your classmates. Their achievements.', limitStudentRows(rows, data.categoryStudentCounts?.grades[grade] ?? gradeStudents.length));
  });
  data.rankingGroups.forEach(group => add(`group-${group.id}`, group.name, 'Team score · average student points + group points', [...group.studentGroups].sort((a, b) => (b.averagePoints + b.rawPoints) - (a.averagePoints + a.rawPoints)).map((s, i) => ({ id: s.id, name: s.name, detail: `${s.totalStudents} students`, points: s.averagePoints + s.rawPoints, rank: i + 1 }))));
  return slides.length ? slides : [{ id: 'empty', title: 'Your story starts here', subtitle: 'Student achievements will appear as points are earned.', rows: [] }];
}
