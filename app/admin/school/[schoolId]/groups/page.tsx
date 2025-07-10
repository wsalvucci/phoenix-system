"use client";

import { useState } from 'react';
import { useSchoolGroupsWithCounts, useCreateGroup, useUpdateGroup, useArchiveGroup, useDeleteGroup } from '@/app/hooks/useAdminQueries';
import { LoadingState } from '@/components/LoadingLayout';
import ThemeInput from '@/components/ThemeInput';
import MotionButton from '@/components/MotionButton';
import { AdminGroupWithCountsData } from '@/api/admin/groups';
import Link from 'next/link';

export default function StudentGroupsManagementPage({ params: { schoolId } }: { params: { schoolId: string } }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [newGroupParent, setNewGroupParent] = useState<AdminGroupWithCountsData | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    type: 'archive' | 'delete';
    group: AdminGroupWithCountsData;
    show: boolean;
  } | null>(null);
  const [editDialog, setEditDialog] = useState<{
    group: AdminGroupWithCountsData;
    show: boolean;
  } | null>(null);

  // Queries
  const { data: groups, isLoading, error, refetch } = useSchoolGroupsWithCounts(parseInt(schoolId), showArchived);
  const createGroupMutation = useCreateGroup();
  const updateGroupMutation = useUpdateGroup();
  const archiveGroupMutation = useArchiveGroup();
  const deleteGroupMutation = useDeleteGroup();

  // Create form state
  const [createForm, setCreateForm] = useState({
    name: '',
    parentId: undefined as number | undefined
  });

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    parentId: undefined as number | null | undefined
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

  // Handle archive group
  const handleArchiveGroup = async (group: AdminGroupWithCountsData) => {
    try {
      await archiveGroupMutation.mutateAsync({
        schoolId: parseInt(schoolId),
        groupId: group.id
      });
      setConfirmDialog(null);
    } catch (error) {
      console.error('Failed to archive group:', error);
      alert('Failed to archive group');
    }
  };

  // Handle update group
  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDialog?.group) return;

    if (!editForm.name.trim()) {
      alert('Please enter a group name');
      return;
    }

    if (editForm.name.length < 3) {
      alert('Group name must be at least 3 characters long');
      return;
    }

    try {
      await updateGroupMutation.mutateAsync({
        schoolId: parseInt(schoolId),
        groupId: editDialog.group.id,
        groupData: {
          name: editForm.name.trim(),
          parentId: editForm.parentId
        }
      });

      // Reset form and close dialog
      setEditForm({
        name: '',
        parentId: undefined
      });
      setEditDialog(null);
    } catch (error) {
      console.error('Failed to update group:', error);
      alert('Failed to update group');
    }
  };

  // Handle delete group
  const handleDeleteGroup = async (group: AdminGroupWithCountsData) => {
    try {
      await deleteGroupMutation.mutateAsync({
        schoolId: parseInt(schoolId),
        groupId: group.id
      });
      setConfirmDialog(null);
    } catch (error) {
      console.error('Failed to delete group:', error);
      alert('Failed to delete group');
    }
  };

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
        <div className="grid grid-cols-7 gap-4 py-3 px-6 border-b border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
          <div className="flex items-center" style={indentStyle}>
            <Link 
              href={`/admin/school/${schoolId}/editGroup/${group.id}`}
              className="font-medium text-slate-900 dark:text-slate-100 hover:underline"
            >
              {group.name}
              {group.archived && (
                <span className="ml-2 px-2 py-1 text-xs bg-gray-500 text-white rounded">
                  Archived
                </span>
              )}
            </Link>
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
          <div className="flex items-center justify-center">
            <button
              onClick={() => {
                setNewGroupParent(group);
                setCreateForm({ ...createForm, parentId: group.id });
                setShowCreateForm(true);
              }}
              className="px-3 py-2 bg-gray-600 text-white rounded-lg font-medium text-sm hover:bg-gray-500 transition-colors"
            >
              Add Child
            </button>
          </div>
          <div className="flex items-center justify-center">
            <button
              onClick={() => setConfirmDialog({
                type: 'archive',
                group,
                show: true
              })}
              className="px-3 py-2 bg-yellow-600 text-white rounded-lg font-medium text-sm hover:bg-yellow-500 transition-colors"
              disabled={group.archived}
            >
              {group.archived ? 'Archived' : 'Archive'}
            </button>
          </div>
          <div className="flex items-center justify-center">
            <button
              onClick={() => {
                setEditForm({
                  name: group.name,
                  parentId: group.parentId || null
                });
                setEditDialog({
                  group,
                  show: true
                });
              }}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-500 transition-colors"
            >
              Edit
            </button>
          </div>
          <div className="flex items-center justify-center">
            <button
              onClick={() => setConfirmDialog({
                type: 'delete',
                group,
                show: true
              })}
              className="px-3 py-2 bg-red-600 text-white rounded-lg font-medium text-sm hover:bg-red-500 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
        
        {/* Render child groups */}
        {group.childGroups && group.childGroups.length > 0 && (
          <div>
            {group.childGroups.map(childGroup => renderGroupRow(childGroup, level + 1))}
                  </div>
      )}

      {/* Edit Group Dialog */}
      {editDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              Edit Group: {editDialog.group.name}
            </h3>
            <form onSubmit={handleUpdateGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Group Name *
                </label>
                <ThemeInput
                  placeholder="Enter group name (minimum 3 characters)"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                  minLength={3}
                />
                {editForm.name.length > 0 && editForm.name.length < 3 && (
                  <p className="text-red-500 text-sm mt-1">
                    Group name must be at least 3 characters long
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Parent Group
                </label>
                <select
                  value={editForm.parentId || ''}
                  onChange={(e) => setEditForm({ 
                    ...editForm, 
                    parentId: e.target.value ? parseInt(e.target.value) : null 
                  })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                >
                  <option value="">No Parent (Top Level)</option>
                  {(() => {
                    // Flatten the hierarchical structure to get all groups
                    const flattenGroups = (groupList: AdminGroupWithCountsData[]): AdminGroupWithCountsData[] => {
                      const result: AdminGroupWithCountsData[] = [];
                      groupList.forEach(group => {
                        result.push(group);
                        if (group.childGroups) {
                          result.push(...flattenGroups(group.childGroups));
                        }
                      });
                      return result;
                    };
                    
                    const allGroups = groups ? flattenGroups(groups) : [];
                    
                    return allGroups.map(group => {
                      // Don't show the current group as a parent option
                      if (group.id === editDialog.group.id) {
                        console.log('Filtering out current group:', group.name);
                        return null;
                      }
                      
                      // Check if this potential parent is a descendant of the current group
                      // (which would create a circular reference)
                      const isDescendantOfCurrentGroup = (() => {
                        const checkDescendants = (currentGroup: AdminGroupWithCountsData): boolean => {
                          if (!currentGroup.childGroups) return false;
                          return currentGroup.childGroups.some(child => {
                            if (child.id === group.id) return true;
                            return checkDescendants(child);
                          });
                        };
                        return checkDescendants(editDialog.group);
                      })();
                      
                      if (isDescendantOfCurrentGroup) {
                        console.log('Filtering out descendant:', group.name, 'of', editDialog.group.name);
                        return null;
                      }
                      
                      console.log('Including as parent option:', group.name);
                      return (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      );
                    });
                  })()}
                </select>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setEditDialog(null);
                    setEditForm({ name: '', parentId: undefined });
                  }}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={updateGroupMutation.isPending || editForm.name.length < 3}
                >
                  {updateGroupMutation.isPending ? 'Updating...' : 'Update Group'}
                </button>
              </div>
            </form>
          </div>
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

      {/* Search and Archive Toggle */}
      <div className="mb-6 flex justify-between items-center">
        <ThemeInput
          placeholder="Search groups..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-600"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              Show archived groups
            </span>
          </label>
        </div>
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
            <div className="grid grid-cols-7 gap-4 py-4 px-6 bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
              <div className="font-semibold text-slate-900 dark:text-slate-100">
                Group Name
              </div>
              <div className="font-semibold text-slate-900 dark:text-slate-100 text-center">
                Teachers
              </div>
              <div className="font-semibold text-slate-900 dark:text-slate-100 text-center">
                Students
              </div>
              <div className="font-semibold text-slate-900 dark:text-slate-100 text-center">
                Add Child
              </div>
              <div className="font-semibold text-slate-900 dark:text-slate-100 text-center">
                Archive
              </div>
              <div className="font-semibold text-slate-900 dark:text-slate-100 text-center">
                Edit
              </div>
              <div className="font-semibold text-slate-900 dark:text-slate-100 text-center">
                Delete
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

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {confirmDialog.type === 'archive' ? 'Archive Group' : 'Delete Group'}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              {confirmDialog.type === 'archive' ? (
                <>
                  Are you sure you want to archive "{confirmDialog.group.name}"?
                  {confirmDialog.group.childGroups && confirmDialog.group.childGroups.length > 0 && (
                    <span className="block mt-2 text-red-600 dark:text-red-400">
                      Warning: This will also hide all child groups from the default view, even if they aren't archived.
                    </span>
                  )}
                </>
              ) : (
                <>
                  Are you sure you want to delete "{confirmDialog.group.name}"?
                  {confirmDialog.group.childGroups && confirmDialog.group.childGroups.length > 0 && (
                    <span className="block mt-2 text-blue-600 dark:text-blue-400">
                      Note: {confirmDialog.group.childGroups.length} child group{confirmDialog.group.childGroups.length === 1 ? '' : 's'} will become top-level group{confirmDialog.group.childGroups.length === 1 ? '' : 's'}.
                    </span>
                  )}
                  {(confirmDialog.group.studentCount > 0 || confirmDialog.group.teacherCount > 0) && (
                    <span className="block mt-2 text-orange-600 dark:text-orange-400">
                      Warning: {confirmDialog.group.studentCount} student{confirmDialog.group.studentCount === 1 ? '' : 's'} and {confirmDialog.group.teacherCount} teacher{confirmDialog.group.teacherCount === 1 ? '' : 's'} will be removed from this group.
                    </span>
                  )}
                  <span className="block mt-2 text-red-600 dark:text-red-400">
                    This action cannot be undone.
                  </span>
                </>
              )}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmDialog.type === 'archive') {
                    handleArchiveGroup(confirmDialog.group);
                  } else {
                    handleDeleteGroup(confirmDialog.group);
                  }
                }}
                className={`px-4 py-2 text-white rounded-lg transition-colors ${
                  confirmDialog.type === 'archive' 
                    ? 'bg-yellow-600 hover:bg-yellow-500' 
                    : 'bg-red-600 hover:bg-red-500'
                }`}
                disabled={archiveGroupMutation.isPending || deleteGroupMutation.isPending}
              >
                {archiveGroupMutation.isPending || deleteGroupMutation.isPending ? (
                  'Processing...'
                ) : (
                  confirmDialog.type === 'archive' ? 'Archive' : 'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 