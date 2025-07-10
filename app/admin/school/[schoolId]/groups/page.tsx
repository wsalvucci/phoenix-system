"use client";

import { useState } from 'react';
import { useSchoolGroupsWithCounts, useCreateGroup } from '@/app/hooks/useAdminQueries';
import { LoadingState } from '@/components/LoadingLayout';
import ThemeInput from '@/components/ThemeInput';
import MotionButton from '@/components/MotionButton';
import { AdminGroupWithCountsData } from '@/api/admin/groups';
import Link from 'next/link';

export default function StudentGroupsManagementPage({ params: { schoolId } }: { params: { schoolId: string } }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGroupParent, setNewGroupParent] = useState<AdminGroupWithCountsData | null>(null);

  // Queries
  const { data: groups, isLoading, error, refetch } = useSchoolGroupsWithCounts(parseInt(schoolId));
  const createGroupMutation = useCreateGroup();

  // Create form state
  const [createForm, setCreateForm] = useState({
    name: '',
    parentId: undefined as number | undefined
  });

  // Filter groups recursively
  const filterGroupsRecursively = (groups: AdminGroupWithCountsData[], searchTerm: string): AdminGroupWithCountsData[] => {
    return groups
      .map(group => {
        const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase());
        const childMatches = group.childGroups ? filterGroupsRecursively(group.childGroups, searchTerm) : [];
        
        if (matchesSearch || childMatches.length > 0) {
          return {
            ...group,
            childGroups: childMatches
          };
        }
        return null;
      })
      .filter((group): group is NonNullable<typeof group> => group !== null);
  };

  const filteredGroups = groups ? filterGroupsRecursively(groups, searchTerm) : [];

  // Handle create group
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      alert('Please enter a group name');
      return;
    }

    if (createForm.name.length < 3) {
      alert('Group name must be at least 3 characters long');
      return;
    }

    try {
      await createGroupMutation.mutateAsync({
        schoolId: parseInt(schoolId),
        groupData: {
          name: createForm.name.trim(),
          parentId: createForm.parentId
        }
      });

      // Reset form
      setCreateForm({
        name: '',
        parentId: undefined
      });
      setShowCreateForm(false);
      setNewGroupParent(null);
    } catch (error) {
      console.error('Failed to create group:', error);
      alert('Failed to create group');
    }
  };

  // Generate border color based on level
  const getLevelColor = (level: number): string => {
    const colors = [
      '#FFC0CB', '#FFD700', '#98FB98', '#87CEEB', '#FFA07A', 
      '#DDA0DD', '#87CEFA', '#FF69B4', '#FF6347', '#F0E68C', 
      '#FFA500', '#20B2AA', '#00FF7F', '#7B68EE', '#FF4500', 
      '#9370DB', '#32CD32', '#40E0D0', '#FF1493', '#00BFFF'
    ];
    return colors[level % colors.length];
  };

  // Render group row recursively
  const renderGroupRow = (group: AdminGroupWithCountsData, level: number = 0) => {
    const indentStyle = {
      paddingLeft: `${level * 24 + 16}px`,
      borderLeft: `4px solid ${getLevelColor(level)}`
    };

    return (
      <div key={group.id}>
        <Link 
          href={`/admin/school/${schoolId}/editGroup/${group.id}`}
          className="block hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          <div className="grid grid-cols-4 gap-4 py-3 px-6 border-b border-slate-200 dark:border-slate-600">
            <div className="flex items-center" style={indentStyle}>
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {group.name}
              </span>
            </div>
            <div className="flex items-center justify-center">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {group.teacherCount}
              </span>
            </div>
            <div className="flex items-center justify-center">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {group.studentCount}
              </span>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setNewGroupParent(group);
                  setCreateForm({ ...createForm, parentId: group.id });
                  setShowCreateForm(true);
                }}
                className="px-3 py-2 bg-gray-600 text-white rounded-lg font-medium text-sm hover:bg-gray-500 transition-colors"
              >
                Add Child
              </button>
            </div>
          </div>
        </Link>
        
        {/* Render child groups */}
        {group.childGroups && group.childGroups.length > 0 && (
          <div>
            {group.childGroups.map(childGroup => renderGroupRow(childGroup, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Student Groups Management</h1>
        <div className="flex gap-2">
          <MotionButton
            onClick={() => {
              setNewGroupParent(null);
              setCreateForm({ name: '', parentId: undefined });
              setShowCreateForm(!showCreateForm);
            }}
            variant="primary"
          >
            {showCreateForm ? 'Cancel' : 'Add Group'}
          </MotionButton>
        </div>
      </div>

      {/* Create Group Form */}
      {showCreateForm && (
        <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">
            Add New Group
            {newGroupParent && (
              <span className="text-slate-600 dark:text-slate-400 font-normal">
                {' '}to "{newGroupParent.name}"
              </span>
            )}
          </h2>
          <form onSubmit={handleCreateGroup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Group Name *
              </label>
              <ThemeInput
                placeholder="Enter group name (minimum 3 characters)"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                required
                minLength={3}
              />
              {createForm.name.length > 0 && createForm.name.length < 3 && (
                <p className="text-red-500 text-sm mt-1">
                  Group name must be at least 3 characters long
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={createGroupMutation.isPending || createForm.name.length < 3}
              >
                {createGroupMutation.isPending ? 'Creating...' : 'Create Group'}
              </button>
                              <MotionButton
                  variant="secondary"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewGroupParent(null);
                    setCreateForm({ name: '', parentId: undefined });
                  }}
                >
                Cancel
              </MotionButton>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <ThemeInput
          placeholder="Search groups..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Groups Table */}
      <LoadingState
        isLoading={isLoading}
        error={error}
        data={groups}
        errorFallback={(err) => <div>Error loading groups: {err.message}</div>}
      >
        {(data) => (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-4 gap-4 py-4 px-6 bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
              <div className="font-semibold text-slate-900 dark:text-slate-100">
                Group Name
              </div>
              <div className="font-semibold text-slate-900 dark:text-slate-100 text-center">
                Teachers
              </div>
              <div className="font-semibold text-slate-900 dark:text-slate-100 text-center">
                Students
              </div>
              <div className="font-semibold text-slate-900 dark:text-slate-100 text-right">
                Actions
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-slate-200 dark:divide-slate-600">
              {filteredGroups.length > 0 ? (
                filteredGroups.map(group => renderGroupRow(group))
              ) : (
                <div className="py-8 text-center text-slate-500 dark:text-slate-400">
                  {searchTerm ? 'No groups found matching your search.' : 'No groups found.'}
                </div>
              )}
            </div>
          </div>
        )}
      </LoadingState>

      {/* Summary */}
      <div className="mt-6 text-sm text-slate-600 dark:text-slate-400">
        {searchTerm ? (
          `Showing ${filteredGroups.length} of ${groups?.length || 0} groups`
        ) : (
          `Total: ${groups?.length || 0} groups`
        )}
      </div>
    </div>
  );
} 