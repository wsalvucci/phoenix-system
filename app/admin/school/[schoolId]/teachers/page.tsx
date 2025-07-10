"use client";

import { useState } from 'react';
import { useSchoolTeachers, useCreateTeacher, useSchoolGroups } from '@/app/hooks/useAdminQueries';
import { LoadingState } from '@/components/LoadingLayout';
import ThemeInput from '@/components/ThemeInput';
import ThemeSelect from '@/components/ThemeSelect';
import MotionButton from '@/components/MotionButton';
import { AdminTeacherData } from '@/types/domain';

enum SortType {
  FirstName = 'firstName',
  LastName = 'lastName'
}

enum SortDirection {
  Ascending = 'asc',
  Descending = 'desc'
}

export default function TeachersManagementPage({ params: { schoolId } }: { params: { schoolId: string } }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortType>(SortType.LastName);
  const [sortDirection, setSortDirection] = useState<SortDirection>(SortDirection.Ascending);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Queries
  const { data: teachers, isLoading, error } = useSchoolTeachers(parseInt(schoolId));
  const { data: groups, isLoading: groupsLoading } = useSchoolGroups(parseInt(schoolId));
  const createTeacherMutation = useCreateTeacher();

  // Create form state
  const [createForm, setCreateForm] = useState({
    firstName: '',
    lastName: '',
    groupIds: [] as number[]
  });

  // Filter and sort teachers
  const filteredAndSortedTeachers = teachers?.filter(teacher =>
    teacher.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.lastName.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case SortType.FirstName:
        comparison = a.firstName.localeCompare(b.firstName);
        break;
      case SortType.LastName:
        comparison = a.lastName.localeCompare(b.lastName);
        break;
    }
    return sortDirection === SortDirection.Ascending ? comparison : -comparison;
  }) || [];

  // Handle create teacher
  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.firstName || !createForm.lastName) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await createTeacherMutation.mutateAsync({
        schoolId: parseInt(schoolId),
        teacherData: {
          firstName: createForm.firstName,
          lastName: createForm.lastName,
          groupIds: createForm.groupIds
        }
      });

      // Reset form
      setCreateForm({
        firstName: '',
        lastName: '',
        groupIds: []
      });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create teacher:', error);
      alert('Failed to create teacher');
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Teachers Management</h1>
        <MotionButton
          onClick={() => setShowCreateForm(!showCreateForm)}
          variant="primary"
        >
          {showCreateForm ? 'Cancel' : 'Add Teacher'}
        </MotionButton>
      </div>

      {/* Create Teacher Form */}
      {showCreateForm && (
        <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Add New Teacher</h2>
          <form onSubmit={handleCreateTeacher} className="grid grid-cols-2 gap-4">
            <ThemeInput
              placeholder="First Name *"
              value={createForm.firstName}
              onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
              required
            />
            <ThemeInput
              placeholder="Last Name *"
              value={createForm.lastName}
              onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
              required
            />
            <div className="col-span-2 flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={createTeacherMutation.isPending}
              >
                {createTeacherMutation.isPending ? 'Creating...' : 'Create Teacher'}
              </button>
              <MotionButton
                variant="secondary"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </MotionButton>
            </div>
          </form>
        </div>
      )}

      {/* Search and Sort Controls */}
      <div className="flex gap-4 mb-6">
        <ThemeInput
          placeholder="Search teachers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        <ThemeSelect
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortType)}
        >
          <option value={SortType.LastName}>Last Name</option>
          <option value={SortType.FirstName}>First Name</option>
        </ThemeSelect>
        <ThemeSelect
          value={sortDirection}
          onChange={(e) => setSortDirection(e.target.value as SortDirection)}
        >
          <option value={SortDirection.Ascending}>Ascending</option>
          <option value={SortDirection.Descending}>Descending</option>
        </ThemeSelect>
      </div>

      {/* Teachers Table */}
      <LoadingState
        isLoading={isLoading}
        error={error}
        data={teachers}
        errorFallback={(err) => <div>Error loading teachers: {err.message}</div>}
      >
        {(data) => (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                      Groups
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredAndSortedTeachers.map((teacher) => (
                    <tr key={teacher.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {teacher.lastName}, {teacher.firstName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                        <div className="flex flex-wrap gap-1">
                          {teacher.groupIds && teacher.groupIds.length > 0 ? (
                            teacher.groupIds.map((groupId) => {
                              const group = groups?.find(g => g.id === groupId);
                              return (
                                <span
                                  key={groupId}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                >
                                  {group ? group.name : `Group #${groupId}`}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-slate-400 text-xs">No groups assigned</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </LoadingState>

      {/* Summary */}
      <div className="mt-6 text-sm text-slate-600 dark:text-slate-400">
        Showing {filteredAndSortedTeachers.length} of {teachers?.length || 0} teachers
      </div>
    </div>
  );
} 