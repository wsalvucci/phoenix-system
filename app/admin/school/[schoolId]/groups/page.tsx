"use client";

import { useState } from 'react';
import { useSchoolGroupsWithCounts, useCreateGroup, useUpdateGroup, useArchiveGroup, useDeleteGroup, useSchoolStudents, useAddStudentLeaderToGroup, useRemoveStudentLeaderFromGroup, useGroupStudentLeaders } from '@/app/hooks/useAdminQueries';
import { LoadingState } from '@/components/LoadingLayout';
import ThemeInput from '@/components/ThemeInput';
import MotionButton from '@/components/MotionButton';
import { AdminGroupWithCountsData } from '@/api/admin/groups';
import Link from 'next/link';

interface StudentLeadersDialogProps {
  group: AdminGroupWithCountsData;
  schoolId: number;
  students: Array<{
    id: number;
    firstName: string;
    lastName: string;
    grade: number;
    powerschoolId?: number;
  }>;
  onClose: () => void;
  onAddLeader: (groupId: number, studentId: number) => void;
  onRemoveLeader: (groupId: number, studentId: number) => void;
}

function StudentLeadersDialog({ 
  group, 
  schoolId, 
  students, 
  onClose, 
  onAddLeader, 
  onRemoveLeader 
}: StudentLeadersDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const { data: currentLeaders, isLoading: isLoadingLeaders } = useGroupStudentLeaders(schoolId, group.id);

  const handleAddLeader = (studentId: number) => {
    onAddLeader(group.id, studentId);
    setSearchTerm('');
    setShowSearchResults(false);
  };

  const handleRemoveLeader = (studentId: number) => {
    onRemoveLeader(group.id, studentId);
  };

  // Get students who are not already leaders
  const availableStudents = students.filter(student => 
    !currentLeaders?.some(leader => leader.id === student.id)
  );

  // Filter students based on search term
  const filteredStudents = availableStudents.filter(student => {
    const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    return fullName.includes(searchLower) || 
           student.firstName.toLowerCase().includes(searchLower) ||
           student.lastName.toLowerCase().includes(searchLower) ||
           (student.powerschoolId && student.powerschoolId.toString().includes(searchTerm));
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowSearchResults(value.length > 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setShowSearchResults(false);
      setSearchTerm('');
    }
  };

  // Close search results when clicking outside
  const handleDialogClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setShowSearchResults(false);
    }
  };

  // Prevent search results from closing when clicking on the search container
  const handleSearchContainerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50" onClick={handleDialogClick}>
      <div className="bg-card rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">
          Manage Student Leaders: {group.name}
        </h3>

        {/* Current Leaders */}
        <div className="mb-6">
          <h4 className="text-md font-medium mb-3 text-foreground">
            Current Leaders ({currentLeaders?.length || 0})
          </h4>
          {isLoadingLeaders ? (
            <div className="text-muted-foreground">Loading leaders...</div>
          ) : currentLeaders && currentLeaders.length > 0 ? (
            <div className="space-y-2">
              {currentLeaders.map(leader => (
                <div key={leader.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <span className="font-medium text-foreground">
                      {leader.firstName} {leader.lastName}
                    </span>
                    <span className="text-sm text-muted-foreground ml-2">
                      Grade {leader.grade}
                    </span>
                    {leader.powerschoolId && (
                      <span className="text-sm text-muted-foreground ml-2">
                        (ID: {leader.powerschoolId})
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveLeader(leader.id)}
                    className="px-3 py-1 bg-destructive text-destructive-foreground rounded text-sm hover:bg-destructive/90 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground p-3 bg-muted rounded-lg">
              No student leaders assigned to this group.
            </div>
          )}
        </div>

        {/* Add New Leader */}
        <div className="mb-6">
          <h4 className="text-md font-medium mb-3 text-foreground">
            Add New Leader
          </h4>
          <div className="relative" onClick={handleSearchContainerClick}>
            <ThemeInput
              placeholder="Search for a student by name or PowerSchool ID..."
              value={searchTerm}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
              className="w-full"
            />
            
            {/* Search Results Dropdown */}
            {showSearchResults && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-input rounded-lg shadow-lg max-h-60 overflow-y-auto z-10">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map(student => (
                    <button
                      key={student.id}
                      onClick={() => handleAddLeader(student.id)}
                      className="w-full px-4 py-3 text-left hover:bg-muted transition-colors border-b border-border last:border-b-0"
                    >
                      <div className="font-medium text-foreground">
                        {student.firstName} {student.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Grade {student.grade}
                        {student.powerschoolId && ` • ID: ${student.powerschoolId}`}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-muted-foreground text-sm">
                    {searchTerm.length > 0 ? 'No students found matching your search.' : 'Start typing to search for students...'}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {availableStudents.length === 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              All students are already leaders of this group.
            </p>
          )}
        </div>

        {/* Close Button */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const [leadersDialog, setLeadersDialog] = useState<{
    group: AdminGroupWithCountsData;
    show: boolean;
  } | null>(null);

  // Queries
  const { data: groups, isLoading, error } = useSchoolGroupsWithCounts(parseInt(schoolId), showArchived);
  const { data: students } = useSchoolStudents(parseInt(schoolId));
  const createGroupMutation = useCreateGroup();
  const updateGroupMutation = useUpdateGroup();
  const archiveGroupMutation = useArchiveGroup();
  const deleteGroupMutation = useDeleteGroup();
  const addStudentLeaderMutation = useAddStudentLeaderToGroup();
  const removeStudentLeaderMutation = useRemoveStudentLeaderFromGroup();

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

  // Handle add student leader
  const handleAddStudentLeader = async (groupId: number, studentId: number) => {
    try {
      await addStudentLeaderMutation.mutateAsync({
        schoolId: parseInt(schoolId),
        groupId,
        studentId
      });
    } catch (error) {
      console.error('Failed to add student leader:', error);
      alert('Failed to add student leader');
    }
  };

  // Handle remove student leader
  const handleRemoveStudentLeader = async (groupId: number, studentId: number) => {
    try {
      await removeStudentLeaderMutation.mutateAsync({
        schoolId: parseInt(schoolId),
        groupId,
        studentId
      });
    } catch (error) {
      console.error('Failed to remove student leader:', error);
      alert('Failed to remove student leader');
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

  // Nesting stripe color by level: the five chart tokens, so every stripe passes 3:1 against the card in both modes.
  const getLevelColor = (level: number): string => {
    return `hsl(var(--chart-${(level % 5) + 1}))`;
  };

  // Render group row recursively
  const renderGroupRow = (group: AdminGroupWithCountsData, level: number = 0) => {
    const indentStyle = {
      paddingLeft: `${level * 24 + 16}px`,
      borderLeft: `4px solid ${getLevelColor(level)}`
    };

    return (
      <div key={group.id}>
        <div className="grid grid-cols-8 gap-4 py-3 px-6 border-b border-border hover:bg-muted transition-colors">
          <div className="flex items-center" style={indentStyle}>
            <Link 
              href={`/admin/school/${schoolId}/editGroup/${group.id}`}
              className="font-medium text-foreground hover:underline"
            >
              {group.name}
              {group.archived && (
                <span className="ml-2 px-2 py-1 text-xs bg-secondary-foreground text-secondary rounded">
                  Archived
                </span>
              )}
            </Link>
          </div>
          <div className="flex items-center justify-center">
            <span className="text-sm text-muted-foreground">
              {group.teacherCount}
            </span>
          </div>
          <div className="flex items-center justify-center">
            <span className="text-sm text-muted-foreground">
              {group.studentCount}
            </span>
          </div>
          <div className="flex items-center justify-center">
            <button
              onClick={() => setLeadersDialog({
                group,
                show: true
              })}
              className="px-3 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors"
            >
              Manage Leaders
            </button>
          </div>
          <div className="flex items-center justify-center">
            <button
              onClick={() => {
                setNewGroupParent(group);
                setCreateForm({ ...createForm, parentId: group.id });
                setShowCreateForm(true);
              }}
              className="px-3 py-2 bg-secondary-foreground text-secondary rounded-lg font-medium text-sm hover:bg-secondary-foreground/90 transition-colors"
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
              className="px-3 py-2 bg-warning text-warning-foreground rounded-lg font-medium text-sm hover:bg-warning/90 transition-colors"
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
              className="px-3 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors"
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
              className="px-3 py-2 bg-destructive text-destructive-foreground rounded-lg font-medium text-sm hover:bg-destructive/90 transition-colors"
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
        <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              Edit Group: {editDialog.group.name}
            </h3>
            <form onSubmit={handleUpdateGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
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
                  <p className="text-destructive-ink text-sm mt-1">
                    Group name must be at least 3 characters long
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Parent Group
                </label>
                <select
                  value={editForm.parentId || ''}
                  onChange={(e) => setEditForm({ 
                    ...editForm, 
                    parentId: e.target.value ? parseInt(e.target.value) : null 
                  })}
                  className="w-full px-3 py-2 border border-input rounded-lg bg-card text-foreground"
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
                  className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="bg-muted p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">
            Add New Group
            {newGroupParent && (
              <span className="text-muted-foreground font-normal">
                {' '}to &quot;{newGroupParent.name}&quot;
              </span>
            )}
          </h2>
          <form onSubmit={handleCreateGroup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
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
                <p className="text-destructive-ink text-sm mt-1">
                  Group name must be at least 3 characters long
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="rounded border-input"
            />
            <span className="text-sm text-foreground">
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
        {() => (
          <div className="bg-card rounded-lg shadow overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-8 gap-4 py-4 px-6 bg-muted border-b border-border">
              <div className="font-semibold text-foreground">
                Group Name
              </div>
              <div className="font-semibold text-foreground text-center">
                Teachers
              </div>
              <div className="font-semibold text-foreground text-center">
                Students
              </div>
              <div className="font-semibold text-foreground text-center">
                Leaders
              </div>
              <div className="font-semibold text-foreground text-center">
                Add Child
              </div>
              <div className="font-semibold text-foreground text-center">
                Archive
              </div>
              <div className="font-semibold text-foreground text-center">
                Edit
              </div>
              <div className="font-semibold text-foreground text-center">
                Delete
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-border">
              {filteredGroups.length > 0 ? (
                filteredGroups.map(group => renderGroupRow(group))
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  {searchTerm ? 'No groups found matching your search.' : 'No groups found.'}
                </div>
              )}
            </div>
          </div>
        )}
      </LoadingState>

      {/* Summary */}
      <div className="mt-6 text-sm text-muted-foreground">
        {searchTerm ? (
          `Showing ${filteredGroups.length} of ${groups?.length || 0} groups`
        ) : (
          `Total: ${groups?.length || 0} groups`
        )}
      </div>

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {confirmDialog.type === 'archive' ? 'Archive Group' : 'Delete Group'}
            </h3>
            <p className="text-muted-foreground mb-6">
              {confirmDialog.type === 'archive' ? (
                <>
                  Are you sure you want to archive &quot;{confirmDialog.group.name}&quot;?
                  {confirmDialog.group.childGroups && confirmDialog.group.childGroups.length > 0 && (
                    <span className="block mt-2 text-destructive-ink">
                      Warning: This will also hide all child groups from the default view, even if they aren&apos;t archived.
                    </span>
                  )}
                </>
              ) : (
                <>
                  Are you sure you want to delete &quot;{confirmDialog.group.name}&quot;?
                  {confirmDialog.group.childGroups && confirmDialog.group.childGroups.length > 0 && (
                    <span className="block mt-2 text-primary">
                      Note: {confirmDialog.group.childGroups.length} child group{confirmDialog.group.childGroups.length === 1 ? '' : 's'} will become top-level group{confirmDialog.group.childGroups.length === 1 ? '' : 's'}.
                    </span>
                  )}
                  {(confirmDialog.group.studentCount > 0 || confirmDialog.group.teacherCount > 0) && (
                    <span className="block mt-2 text-warning-ink">
                      Warning: {confirmDialog.group.studentCount} student{confirmDialog.group.studentCount === 1 ? '' : 's'} and {confirmDialog.group.teacherCount} teacher{confirmDialog.group.teacherCount === 1 ? '' : 's'} will be removed from this group.
                    </span>
                  )}
                  <span className="block mt-2 text-destructive-ink">
                    This action cannot be undone.
                  </span>
                </>
              )}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
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
                className={`px-4 py-2 rounded-lg transition-colors ${
                  confirmDialog.type === 'archive' 
                    ? 'bg-warning text-warning-foreground hover:bg-warning/90' 
                    : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
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

      {/* Student Leaders Dialog */}
      {leadersDialog && (
        <StudentLeadersDialog
          group={leadersDialog.group}
          schoolId={parseInt(schoolId)}
          students={students || []}
          onClose={() => setLeadersDialog(null)}
          onAddLeader={handleAddStudentLeader}
          onRemoveLeader={handleRemoveStudentLeader}
        />
      )}
    </div>
  );
} 