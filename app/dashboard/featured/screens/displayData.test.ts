import { describe, expect, it } from 'vitest';
import type { GlobalPoints } from '@/app/supaApi/universal/utils/types';
import { buildSlides, studentDisplayLimit } from './displayData';

const empty: GlobalPoints = { schoolId: 12, totalStudents: 0, timeframes: [], grades: [], students: [], pointGroups: [], studentGroups: [], rankingGroups: [], pointEvents: [] };
const student = (id: number, points: number): GlobalPoints['students'][number] => ({ id, firstName: `Student ${id}`, lastName: 'Example', rank: id, lastMonthRank: 0, totalPoints: points, lastMonthPoints: 0, grade: 9, gradeRank: id, lastMonthGradeRank: 0, pointGroups: [], totalPointsByDay: new Map(), pointsEarnedEachDay: new Map(), monthToMonthChange: 0, studentGroups: [] });

describe('TV display rotation', () => {
  it('keeps a usable empty screen when no students or groups exist', () => {
    expect(buildSlides(empty)).toEqual([expect.objectContaining({ id: 'empty', rows: [] })]);
  });
  it('caps the overall category at 20 on one screen without mutating cached data or inventing rank gains', () => {
    const data = { ...empty, totalStudents: 85, students: Array.from({ length: 25 }, (_, i) => student(i + 1, (25 - i) * 10)) };
    const before = data.students.map(s => s.id);
    const slides = buildSlides(data);
    expect(slides.map(s => s.rows.length)).toEqual([20]);
    expect(new Set(slides.flatMap(s => s.rows.map(r => r.id))).size).toBe(20);
    expect(slides[0].rows[0].points).toBe(250);
    expect(slides[0].rows[0].change).toBeUndefined();
    expect(data.students.map(s => s.id)).toEqual(before);
  });
  it('uses category and grade ranks and skips categories without points', () => {
    const s = { ...student(7, 100), gradeRank: 2, lastMonthGradeRank: 4, pointGroups: [{ id: 1, points: 30, rank: 3, lastMonthPoints: 10, lastMonthRank: 5 }] };
    const slides = buildSlides({ ...empty, totalStudents: 60, categoryStudentCounts: { grades: { 9: 6, 10: 0 }, pointGroups: { 1: 9, 2: 0 } }, students: [s], grades: [9, 10], pointGroups: [{ id: 1, name: 'Service', color: '#fff' }, { id: 2, name: 'Empty', color: '#fff' }] });
    expect(slides.map(s => s.id)).toEqual(['overall', 'category-1', 'grade-9']);
    expect(slides[1].rows[0]).toMatchObject({ points: 30, rank: 3, change: 2 });
    expect(slides[2].rows[0]).toMatchObject({ points: 100, rank: 2, change: 2 });
  });
  it('preserves the existing team scoring formula on one team screen', () => {
    const group = { id: 1, name: 'Team A', totalStudents: 5, averagePoints: 20, rawPoints: 10, lastMonthAveragePoints: 0, lastMonthRawPoints: 0, pointGroups: [] };
    const slides = buildSlides({ ...empty, rankingGroups: [{ id: 1, name: 'Teams', studentGroups: [group, { ...group, id: 2, name: 'Team B', rawPoints: 50 }] }] });
    expect(slides[0].rows.map(r => [r.name, r.points])).toEqual([['Team B', 70], ['Team A', 30]]);
  });
  it.each([[0, 0], [1, 1], [2, 1], [3, 1], [4, 2], [30, 10], [57, 19], [59, 20], [60, 20], [100, 20]])('limits a population of %i to %i students', (population, expected) => {
    expect(studentDisplayLimit(population)).toBe(expected);
  });
  it('uses full category populations, not the combined API shortlist', () => {
    const students = Array.from({ length: 25 }, (_, i) => ({ ...student(i + 1, 100 - i), pointGroups: [{ id: 1, points: 100 - i, rank: i + 1, lastMonthPoints: 0, lastMonthRank: 0 }] }));
    const slides = buildSlides({ ...empty, totalStudents: 90, students, grades: [9], pointGroups: [{ id: 1, name: 'Service', color: '#fff' }], categoryStudentCounts: { grades: { 9: 30 }, pointGroups: { 1: 45 } } });
    expect(slides.map(slide => slide.rows.length)).toEqual([20, 15, 10]);
  });
  it('does not promote students outside a category cutoff from another shortlist', () => {
    const slides = buildSlides({ ...empty, totalStudents: 9, students: [student(1, 100), student(8, 20)] });
    expect(slides[0].rows.map(row => row.rank)).toEqual([1]);
  });
  it('keeps all ranking-group teams even beyond twenty', () => {
    const teams = Array.from({ length: 25 }, (_, i) => ({ id: i, name: `Team ${i}`, totalStudents: 3, averagePoints: i, rawPoints: 0, lastMonthAveragePoints: 0, lastMonthRawPoints: 0, pointGroups: [] }));
    expect(buildSlides({ ...empty, rankingGroups: [{ id: 1, name: 'Teams', studentGroups: teams }] })[0].rows).toHaveLength(25);
  });

});
