/**
 * Tests for the Dashboard API functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getTopScrollingDashboard, checkSchoolAccess } from '@/api/dashboard';
import { getSupabaseUser } from '@/api/user';
import supabaseServiceClient from '@/app/supaApi/server/supabaseServiceClient';
import { percentileToRating } from '@/types/domain';

// Mock dependencies
vi.mock('@/api/user');
vi.mock('@/app/supaApi/server/supabaseServiceClient');
vi.mock('@/utils/serverLogger', () => ({
  createServerLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
  logDatabaseQuery: vi.fn(),
  logServerError: vi.fn(),
}));


describe('Dashboard API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkSchoolAccess', () => {
    it('should return true for admin access', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        single: vi.fn()
      };
      (supabaseServiceClient as any).mockResolvedValue(mockSupabase);

      const mockUser = { id: 'user123' };
      (getSupabaseUser as any).mockResolvedValue(mockUser);

      const mockUserData = {
        id: 1,
        admin: {
          admin_school_pair: [{ school_id: 1 }]
        },
        teacher: []
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUserData,
              error: null
            })
          })
        })
      });

      const result = await checkSchoolAccess(1);
      expect(result).toBe(true);
    });

    it('should return true for teacher access', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        single: vi.fn()
      };
      (supabaseServiceClient as any).mockResolvedValue(mockSupabase);

      const mockUser = { id: 'user123' };
      (getSupabaseUser as any).mockResolvedValue(mockUser);

      const mockUserData = {
        id: 1,
        admin: null,
        teacher: [{ school_id: 1 }]
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUserData,
              error: null
            })
          })
        })
      });

      const result = await checkSchoolAccess(1);
      expect(result).toBe(true);
    });

    it('should return true for student access through user_student_pair', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        single: vi.fn()
      };
      (supabaseServiceClient as any).mockResolvedValue(mockSupabase);

      const mockUser = { id: 'user123' };
      (getSupabaseUser as any).mockResolvedValue(mockUser);

      const mockUserData = {
        id: 1,
        admin: null,
        teacher: []
      };

      const mockStudentPairData = [
        { student: { school_id: 1 } }
      ];

      mockSupabase.from
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockUserData,
                error: null
              })
            })
          })
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: mockStudentPairData,
              error: null
            })
          })
        });

      const result = await checkSchoolAccess(1);
      expect(result).toBe(true);
    });

    it('should return false when no user is authenticated', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        single: vi.fn()
      };
      (supabaseServiceClient as any).mockResolvedValue(mockSupabase);

      (getSupabaseUser as any).mockResolvedValue(null);

      const result = await checkSchoolAccess(1);
      expect(result).toBe(false);
    });

    it('should return false when user has no access', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        single: vi.fn()
      };
      (supabaseServiceClient as any).mockResolvedValue(mockSupabase);

      const mockUser = { id: 'user123' };
      (getSupabaseUser as any).mockResolvedValue(mockUser);

      const mockUserData = {
        id: 1,
        admin: null,
        teacher: []
      };

      const mockStudentPairData = [
        { student: { school_id: 2 } } // Different school
      ];

      mockSupabase.from
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockUserData,
                error: null
              })
            })
          })
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: mockStudentPairData,
              error: null
            })
          })
        });

      const result = await checkSchoolAccess(1);
      expect(result).toBe(false);
    });

    it('should return false when database error occurs', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        single: vi.fn()
      };
      (supabaseServiceClient as any).mockResolvedValue(mockSupabase);

      const mockUser = { id: 'user123' };
      (getSupabaseUser as any).mockResolvedValue(mockUser);

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' }
            })
          })
        })
      });

      const result = await checkSchoolAccess(1);
      expect(result).toBe(false);
    });
  });

  describe('getTopScrollingDashboard', () => {
    const mockTimeframeData = [
      {
        id: 1,
        name: 'Fall 2024',
        starts_at: '2024-09-01',
        ends_at: '2024-12-31',
        active: true,
        school_id: 1
      }
    ];

    const mockStudentsData = [
      {
        id: 1,
        first_name: 'John',
        last_name: 'Doe',
        grade: 10,
        student_point: [
          {
            point_value: 100,
            point_event: {
              date: '2024-10-15',
              point_group: {
                id: 1,
                name: 'Participation',
                color: '#00ff00'
              }
            }
          }
        ],
        student_group_pair: [
          {
            student_group: {
              id: 1,
              name: 'Math Club'
            }
          }
        ]
      },
      {
        id: 2,
        first_name: 'Jane',
        last_name: 'Smith',
        grade: 10,
        student_point: [
          {
            point_value: 150,
            point_event: {
              date: '2024-10-15',
              point_group: {
                id: 1,
                name: 'Participation',
                color: '#00ff00'
              }
            }
          }
        ],
        student_group_pair: [
          {
            student_group: {
              id: 1,
              name: 'Math Club'
            }
          }
        ]
      }
    ];

    beforeEach(() => {
      // Mock successful access check
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        single: vi.fn()
      };
      (supabaseServiceClient as any).mockResolvedValue(mockSupabase);

      const mockUser = { id: 'user123' };
      (getSupabaseUser as any).mockResolvedValue(mockUser);

      const mockUserData = {
        id: 1,
        admin: {
          admin_school_pair: [{ school_id: 1 }]
        },
        teacher: []
      };

      mockSupabase.from
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockUserData,
                error: null
              })
            })
          })
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: mockTimeframeData,
              error: null
            })
          })
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockResolvedValue({
                  data: mockStudentsData,
                  error: null
                })
              })
            })
          })
        });
    });

    it('should return dashboard data with student rankings', async () => {
      const result = await getTopScrollingDashboard(1, null);

      expect(result).toHaveProperty('timeframes');
      expect(result).toHaveProperty('students');
      expect(result.timeframes).toHaveLength(1);
      expect(result.students).toHaveLength(2);

      // Check that students are sorted by total points (Jane should be first with 150 points)
      expect(result.students[0].firstName).toBe('Jane');
      expect(result.students[0].totalPoints).toBe(150);
      expect(result.students[0].totalRank).toBe(1);

      expect(result.students[1].firstName).toBe('John');
      expect(result.students[1].totalPoints).toBe(100);
      expect(result.students[1].totalRank).toBe(2);
    });

    it('should calculate grade-based rankings correctly', async () => {
      const result = await getTopScrollingDashboard(1, null);

      // Both students are in grade 10, so Jane should rank 1st and John 2nd
      expect(result.students[0].rankInGrade).toEqual({ grade: 10, rank: 1 });
      expect(result.students[1].rankInGrade).toEqual({ grade: 10, rank: 2 });
    });

    it('should calculate group-based rankings correctly', async () => {
      const result = await getTopScrollingDashboard(1, null);

      // Both students are in Math Club, so Jane should rank 1st and John 2nd
      expect(result.students[0].studentGroups).toHaveLength(1);
      expect(result.students[0].studentGroups[0]).toEqual({
        id: 1,
        name: 'Math Club',
        rank: 1
      });

      expect(result.students[1].studentGroups).toHaveLength(1);
      expect(result.students[1].studentGroups[0]).toEqual({
        id: 1,
        name: 'Math Club',
        rank: 2
      });
    });

    it('should calculate point type ratings correctly', async () => {
      const result = await getTopScrollingDashboard(1, null);

      // Jane has 150 points, John has 100 points
      // Jane should have a higher rating
      expect(result.students[0].pointsByType).toHaveLength(1);
      expect(result.students[0].pointsByType[0].points).toBe(150);
      expect(result.students[0].pointsByType[0].rating).toBeDefined();

      expect(result.students[1].pointsByType).toHaveLength(1);
      expect(result.students[1].pointsByType[0].points).toBe(100);
      expect(result.students[1].pointsByType[0].rating).toBeDefined();
    });

    it('should return empty students array when no students found', async () => {
      // Mock successful access check
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        single: vi.fn()
      };
      (supabaseServiceClient as any).mockResolvedValue(mockSupabase);
      
      const mockUser = { id: 'user123' };
      (getSupabaseUser as any).mockResolvedValue(mockUser);
      
      mockSupabase.from
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 1,
                  admin: { admin_school_pair: [{ school_id: 1 }] },
                  teacher: []
                },
                error: null
              })
            })
          })
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: mockTimeframeData,
              error: null
            })
          })
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          })
        });

      const result = await getTopScrollingDashboard(1, null);

      expect(result.students).toHaveLength(0);
      expect(result.timeframes).toHaveLength(1);
    });

    it('should throw error when user has no access', async () => {
      // Mock failed access check
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        single: vi.fn()
      };
      (supabaseServiceClient as any).mockResolvedValue(mockSupabase);

      const mockUser = { id: 'user123' };
      (getSupabaseUser as any).mockResolvedValue(mockUser);

      const mockUserData = {
        id: 1,
        admin: null,
        teacher: []
      };

      const mockStudentPairData = [
        { student: { school_id: 2 } } // Different school
      ];

      mockSupabase.from
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockUserData,
                error: null
              })
            })
          })
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: mockStudentPairData,
              error: null
            })
          })
        });

      await expect(getTopScrollingDashboard(1, null))
        .rejects
        .toThrow('User does not have access to this school');
    });

    it('should throw error when no timeframe found', async () => {
      // Mock successful access check
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        single: vi.fn()
      };
      (supabaseServiceClient as any).mockResolvedValue(mockSupabase);
      
      const mockUser = { id: 'user123' };
      (getSupabaseUser as any).mockResolvedValue(mockUser);
      
      mockSupabase.from
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 1,
                  admin: { admin_school_pair: [{ school_id: 1 }] },
                  teacher: []
                },
                error: null
              })
            })
          })
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [], // No timeframes
              error: null
            })
          })
        });

      await expect(getTopScrollingDashboard(1, null))
        .rejects
        .toThrow('No timeframe found');
    });

    it('should throw error when student data fetch fails', async () => {
      // Mock successful access check
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        single: vi.fn()
      };
      (supabaseServiceClient as any).mockResolvedValue(mockSupabase);
      
      const mockUser = { id: 'user123' };
      (getSupabaseUser as any).mockResolvedValue(mockUser);
      
      mockSupabase.from
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 1,
                  admin: { admin_school_pair: [{ school_id: 1 }] },
                  teacher: []
                },
                error: null
              })
            })
          })
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: mockTimeframeData,
              error: null
            })
          })
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database error' }
                })
              })
            })
          })
        });

      await expect(getTopScrollingDashboard(1, null))
        .rejects
        .toThrow('Database error');
    });

    it('should limit results to top 20 students', async () => {
      // Mock successful access check
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        single: vi.fn()
      };
      (supabaseServiceClient as any).mockResolvedValue(mockSupabase);
      
      const mockUser = { id: 'user123' };
      (getSupabaseUser as any).mockResolvedValue(mockUser);
      
      // Create 25 students
      const manyStudents = Array.from({ length: 25 }, (_, i) => ({
        id: i + 1,
        first_name: `Student${i + 1}`,
        last_name: 'Test',
        grade: 10,
        student_point: [
          {
            point_value: 100 - i, // Decreasing points
            point_event: {
              date: '2024-10-15',
              point_group: {
                id: 1,
                name: 'Participation',
                color: '#00ff00'
              }
            }
          }
        ],
        student_group_pair: []
      }));

      mockSupabase.from
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 1,
                  admin: { admin_school_pair: [{ school_id: 1 }] },
                  teacher: []
                },
                error: null
              })
            })
          })
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: mockTimeframeData,
              error: null
            })
          })
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockResolvedValue({
                  data: manyStudents,
                  error: null
                })
              })
            })
          })
        });

      const result = await getTopScrollingDashboard(1, null);

      expect(result.students).toHaveLength(20);
      expect(result.students[0].firstName).toBe('Student1'); // Highest points
      expect(result.students[19].firstName).toBe('Student20'); // 20th highest points
    });

    it('should only count points within the selected timeframe for totalPoints and pointsByType', async () => {
      // Mock successful access check
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        single: vi.fn()
      };
      (supabaseServiceClient as any).mockResolvedValue(mockSupabase);
      
      const mockUser = { id: 'user123' };
      (getSupabaseUser as any).mockResolvedValue(mockUser);
      
      const mockTimeframeData = [
        {
          id: 1,
          name: 'Fall 2024',
          starts_at: '2024-09-01',
          ends_at: '2024-12-31',
          active: true,
          school_id: 1
        }
      ];

      // Student has points both inside and outside the timeframe
      const mockStudentsData = [
        {
          id: 1,
          first_name: 'John',
          last_name: 'Doe',
          grade: 10,
          student_point: [
            {
              point_value: 100,
              point_event: {
                date: '2024-10-15', // inside timeframe
                point_group: {
                  id: 1,
                  name: 'Participation',
                  color: '#00ff00'
                }
              }
            },
            {
              point_value: 50,
              point_event: {
                date: '2024-08-15', // outside timeframe
                point_group: {
                  id: 1,
                  name: 'Participation',
                  color: '#00ff00'
                }
              }
            },
            {
              point_value: 25,
              point_event: {
                date: '2025-01-01', // outside timeframe
                point_group: {
                  id: 2,
                  name: 'Homework',
                  color: '#ff0000'
                }
              }
            }
          ],
          student_group_pair: []
        }
      ];

      const mockUserData = {
        id: 1,
        admin: { admin_school_pair: [{ school_id: 1 }] },
        teacher: []
      };

      mockSupabase.from
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockUserData,
                error: null
              })
            })
          })
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: mockTimeframeData,
              error: null
            })
          })
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockResolvedValue({
                  data: mockStudentsData,
                  error: null
                })
              })
            })
          })
        });

      const result = await getTopScrollingDashboard(1, null);
      expect(result.students).toHaveLength(1);
      const student = result.students[0];
      // Only the point with date '2024-10-15' (100 points) is within the timeframe
      expect(student.totalPoints).toBe(100);
      expect(student.pointsByType).toHaveLength(1);
      expect(student.pointsByType[0]).toMatchObject({
        id: 1,
        name: 'Participation',
        points: 100
      });
      // No points for Homework (id:2) should be included
      expect(student.pointsByType.find(p => p.id === 2)).toBeUndefined();
    });
  });

  describe('percentileToRating', () => {
    it('should return correct ratings for different percentiles', () => {
      expect(percentileToRating(0.95).letter).toBe('S');
      expect(percentileToRating(0.85).letter).toBe('A');
      expect(percentileToRating(0.75).letter).toBe('B+');
      expect(percentileToRating(0.65).letter).toBe('B-');
      expect(percentileToRating(0.55).letter).toBe('C');
      expect(percentileToRating(0.45).letter).toBe('D+');
    });

    it('should handle edge cases', () => {
      expect(percentileToRating(1.0).letter).toBe('S+');
      expect(percentileToRating(0.0).letter).toBe('F-');
      expect(percentileToRating(0.5).letter).toBe('C-');
    });
  });
}); 