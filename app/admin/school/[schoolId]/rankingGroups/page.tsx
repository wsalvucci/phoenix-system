"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { 
  useSchoolRankingGroups, 
  useCreateRankingGroup, 
  useAddStudentGroupToRankingGroup, 
  useRemoveStudentGroupFromRankingGroup,
  useAddTeacherToRankingGroup,
  useRemoveTeacherFromRankingGroup,
  useUpdateRankingGroupTimeframe,
  useSchoolGroupsWithCounts,
  useSchoolTeachers,
  useSchoolTimeframes
} from "@/app/hooks/useAdminQueries";
import { AdminRankingGroupData, AdminGroupData } from "@/types/domain";
import { AdminGroupWithCountsData } from "@/api/admin/groups";

export default function RankingGroupsNewPage() {
  const params = useParams();
  const schoolId = parseInt(params.schoolId as string);

  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupTimeframeId, setNewGroupTimeframeId] = useState<number | null>(null);
  const [selectedRankingGroup, setSelectedRankingGroup] = useState<AdminRankingGroupData | null>(null);
  const [isAddGroupDialogOpen, setIsAddGroupDialogOpen] = useState(false);
  const [isAddStudentGroupDialogOpen, setIsAddStudentGroupDialogOpen] = useState(false);
  const [isAddTeacherDialogOpen, setIsAddTeacherDialogOpen] = useState(false);

  // Queries
  const { 
    data: rankingGroups = [], 
    isLoading: isLoadingRankingGroups, 
    error: rankingGroupsError 
  } = useSchoolRankingGroups(schoolId);

  const { 
    data: studentGroups = [], 
    isLoading: isLoadingStudentGroups 
  } = useSchoolGroupsWithCounts(schoolId, true); // Include archived groups

  const { 
    data: teachers = [], 
    isLoading: isLoadingTeachers 
  } = useSchoolTeachers(schoolId);

  const { 
    data: timeframes = [], 
    isLoading: isLoadingTimeframes 
  } = useSchoolTimeframes(schoolId);

  // Mutations
  const createRankingGroupMutation = useCreateRankingGroup();
  const addStudentGroupMutation = useAddStudentGroupToRankingGroup();
  const removeStudentGroupMutation = useRemoveStudentGroupFromRankingGroup();
  const addTeacherMutation = useAddTeacherToRankingGroup();
  const removeTeacherMutation = useRemoveTeacherFromRankingGroup();
  const updateTimeframeMutation = useUpdateRankingGroupTimeframe();

  const handleCreateRankingGroup = async () => {
    if (!newGroupName.trim()) {
      alert("Please enter a group name");
      return;
    }

    try {
      await createRankingGroupMutation.mutateAsync({
        schoolId,
        groupData: { 
          name: newGroupName.trim(),
          timeframeId: newGroupTimeframeId
        }
      });
      
      setNewGroupName("");
      setNewGroupTimeframeId(null);
      setIsAddGroupDialogOpen(false);
      alert("Ranking group created successfully");
    } catch (error) {
      alert("Failed to create ranking group");
      console.error("Error creating ranking group:", error);
    }
  };

  const handleAddStudentGroup = async (studentGroupId: number) => {
    if (!selectedRankingGroup) return;

    try {
      await addStudentGroupMutation.mutateAsync({
        studentGroupId,
        rankingGroupId: selectedRankingGroup.id
      });
      
      setIsAddStudentGroupDialogOpen(false);
      setSelectedRankingGroup(null);
      alert("Student group added to ranking group");
    } catch (error) {
      alert("Failed to add student group to ranking group");
      console.error("Error adding student group:", error);
    }
  };

  const handleRemoveStudentGroup = async (studentGroupId: number, rankingGroupId: number) => {
    try {
      await removeStudentGroupMutation.mutateAsync({
        studentGroupId,
        rankingGroupId
      });
      
      alert("Student group removed from ranking group");
    } catch (error) {
      alert("Failed to remove student group from ranking group");
      console.error("Error removing student group:", error);
    }
  };

  const openAddStudentGroupDialog = (rankingGroup: AdminRankingGroupData) => {
    setSelectedRankingGroup(rankingGroup);
    setIsAddStudentGroupDialogOpen(true);
  };

  const openAddTeacherDialog = (rankingGroup: AdminRankingGroupData) => {
    setSelectedRankingGroup(rankingGroup);
    setIsAddTeacherDialogOpen(true);
  };

  const handleAddTeacher = async (teacherId: number) => {
    if (!selectedRankingGroup) return;

    try {
      await addTeacherMutation.mutateAsync({
        teacherId,
        rankingGroupId: selectedRankingGroup.id
      });
      
      setIsAddTeacherDialogOpen(false);
      setSelectedRankingGroup(null);
      alert("Teacher added to ranking group");
    } catch (error) {
      alert("Failed to add teacher to ranking group");
      console.error("Error adding teacher:", error);
    }
  };

  const handleRemoveTeacher = async (teacherId: number, rankingGroupId: number) => {
    try {
      await removeTeacherMutation.mutateAsync({
        teacherId,
        rankingGroupId
      });
      
      alert("Teacher removed from ranking group");
    } catch (error) {
      alert("Failed to remove teacher from ranking group");
      console.error("Error removing teacher:", error);
    }
  };

  const handleUpdateTimeframe = async (rankingGroupId: number, timeframeId: number | null) => {
    try {
      await updateTimeframeMutation.mutateAsync({
        rankingGroupId,
        timeframeId
      });
      
      alert("Timeframe updated successfully");
    } catch (error) {
      alert("Failed to update timeframe");
      console.error("Error updating timeframe:", error);
    }
  };

  const renderStudentGroupHierarchy = (groups: AdminGroupWithCountsData[], level: number = 0): JSX.Element[] => {
    return groups
      .filter(group => !selectedRankingGroup?.studentGroupIds.includes(group.id))
      .map(group => (
        <div key={group.id} className="space-y-2">
          <div 
            className={`flex items-center justify-between p-2 rounded-lg border border-border hover:bg-accent cursor-pointer transition-colors ${
              level > 0 ? 'ml-4' : ''
            }`}
            onClick={() => handleAddStudentGroup(group.id)}
          >
            <div className="flex items-center gap-2">
              {level > 0 && (
                <span className="text-muted-foreground text-sm">└─</span>
              )}
              <span className="font-medium text-foreground">{group.name}</span>
              <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                Student Group
              </span>
              {level > 0 && (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  Child Group
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                ({group.studentCount} students)
              </span>
            </div>
            <button className="p-1 hover:bg-accent/50 rounded transition-colors">
              +
            </button>
          </div>
          {/* Render child groups if they exist */}
          {group.childGroups && group.childGroups.length > 0 && (
            <div className="ml-4">
              {renderStudentGroupHierarchy(group.childGroups, level + 1)}
            </div>
          )}
        </div>
      ));
  };

  if (isLoadingRankingGroups || isLoadingStudentGroups || isLoadingTeachers || isLoadingTimeframes) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading ranking groups...</p>
        </div>
      </div>
    );
  }

  if (rankingGroupsError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-destructive text-2xl mb-4">⚠️</div>
          <p className="text-destructive">Failed to load ranking groups</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Ranking Groups</h1>
          <p className="text-muted-foreground">
            Manage ranking groups and assign student groups to them
          </p>
        </div>
        
        <button
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          onClick={() => setIsAddGroupDialogOpen(true)}
        >
          + Add Ranking Group
        </button>
      </div>

      {rankingGroups.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <div className="text-4xl mb-4">👥</div>
          <h3 className="text-lg font-semibold mb-2 text-foreground">No ranking groups yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first ranking group to start organizing student groups for competitions and rankings.
          </p>
          <button 
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            onClick={() => setIsAddGroupDialogOpen(true)}
          >
            + Create First Ranking Group
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {rankingGroups.map((rankingGroup) => (
            <div key={rankingGroup.id} className="bg-card border border-border rounded-lg">
              <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-foreground">👥 {rankingGroup.name}</span>
                    <span className="bg-secondary text-secondary-foreground px-2 py-1 rounded text-sm">
                      {rankingGroup.studentGroups.length} groups
                    </span>
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                      {rankingGroup.teachers.length} teachers
                    </span>
                    {rankingGroup.timeframe ? (
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                        {rankingGroup.timeframe.name}
                      </span>
                    ) : (
                      <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm">
                        No timeframe
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="border border-border px-3 py-1 rounded hover:bg-accent transition-colors"
                      onClick={() => openAddStudentGroupDialog(rankingGroup)}
                    >
                      + Add Student Group
                    </button>
                    <button
                      className="border border-border px-3 py-1 rounded hover:bg-accent transition-colors"
                      onClick={() => openAddTeacherDialog(rankingGroup)}
                    >
                      + Add Teacher
                    </button>
                    <select
                      className="border border-border px-3 py-1 rounded bg-background text-foreground"
                      value={rankingGroup.timeframeId || ""}
                      onChange={(e) => {
                        const timeframeId = e.target.value ? parseInt(e.target.value) : null;
                        handleUpdateTimeframe(rankingGroup.id, timeframeId);
                      }}
                    >
                      <option value="">No timeframe</option>
                      {timeframes.map((timeframe) => (
                        <option key={timeframe.id} value={timeframe.id}>
                          {timeframe.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              {/* List all student groups in this ranking group */}
              <div className="p-4 space-y-2">
                <div className="mb-4">
                  <h4 className="font-semibold text-foreground mb-2">Student Groups</h4>
                  {rankingGroup.studentGroups.length === 0 ? (
                    <div className="text-muted-foreground italic">No student groups in this ranking group.</div>
                  ) : (
                    rankingGroup.studentGroups.map((group) => (
                      <div key={group.id} className="flex items-center justify-between p-2 rounded border border-border bg-muted">
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-foreground">{group.name}</div>
                          {group.archived && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                              Archived
                            </span>
                          )}
                        </div>
                        <button
                          className="text-destructive border border-destructive px-2 py-1 rounded hover:bg-destructive hover:text-white transition-colors"
                          onClick={() => handleRemoveStudentGroup(group.id, rankingGroup.id)}
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>
                
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Teachers</h4>
                  {rankingGroup.teachers.length === 0 ? (
                    <div className="text-muted-foreground italic">No teachers assigned to this ranking group.</div>
                  ) : (
                    rankingGroup.teachers.map((teacher) => (
                      <div key={teacher.id} className="flex items-center justify-between p-2 rounded border border-border bg-muted">
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-foreground">
                            {teacher.firstName} {teacher.lastName}
                          </div>
                        </div>
                        <button
                          className="text-destructive border border-destructive px-2 py-1 rounded hover:bg-destructive hover:text-white transition-colors"
                          onClick={() => handleRemoveTeacher(teacher.id, rankingGroup.id)}
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Group Dialog */}
      {isAddGroupDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-96">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Create New Ranking Group</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">
                  Group Name
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Enter ranking group name"
                  className="w-full p-2 border border-input rounded bg-background text-foreground focus:border-ring focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateRankingGroup();
                    }
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">
                  Timeframe (Optional)
                </label>
                <select
                  value={newGroupTimeframeId || ""}
                  onChange={(e) => setNewGroupTimeframeId(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full p-2 border border-input rounded bg-background text-foreground focus:border-ring focus:outline-none"
                >
                  <option value="">No timeframe</option>
                  {timeframes.map((timeframe) => (
                    <option key={timeframe.id} value={timeframe.id}>
                      {timeframe.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button 
                  className="border border-border px-4 py-2 rounded hover:bg-accent transition-colors"
                  onClick={() => setIsAddGroupDialogOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90 transition-colors"
                  onClick={handleCreateRankingGroup}
                  disabled={createRankingGroupMutation.isPending}
                >
                  {createRankingGroupMutation.isPending ? "Creating..." : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Student Group Dialog */}
      {isAddStudentGroupDialogOpen && selectedRankingGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-2xl max-h-[80vh] overflow-hidden">
            <h2 className="text-xl font-semibold mb-4 text-foreground">
              Add Student Groups to &quot;{selectedRankingGroup.name}&quot;
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Select from parent groups and their child groups. Child groups are indented and marked with a "Child Group" badge.
            </p>
            <div className="max-h-[60vh] overflow-y-auto">
              <div className="space-y-4">
                {renderStudentGroupHierarchy(studentGroups)}
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button 
                className="border border-border px-4 py-2 rounded hover:bg-accent transition-colors"
                onClick={() => setIsAddStudentGroupDialogOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Teacher Dialog */}
      {isAddTeacherDialogOpen && selectedRankingGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-2xl max-h-[80vh] overflow-hidden">
            <h2 className="text-xl font-semibold mb-4 text-foreground">
              Add Teachers to &quot;{selectedRankingGroup.name}&quot;
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Select teachers to assign to this ranking group.
            </p>
            <div className="max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                {teachers
                  .filter(teacher => !selectedRankingGroup.teacherIds.includes(teacher.id))
                  .map(teacher => (
                    <div 
                      key={teacher.id} 
                      className="flex items-center justify-between p-2 rounded-lg border border-border hover:bg-accent cursor-pointer transition-colors"
                      onClick={() => handleAddTeacher(teacher.id)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">
                          {teacher.firstName} {teacher.lastName}
                        </span>
                        <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                          Teacher
                        </span>
                      </div>
                      <button className="p-1 hover:bg-accent/50 rounded transition-colors">
                        +
                      </button>
                    </div>
                  ))}
                {teachers.filter(teacher => !selectedRankingGroup.teacherIds.includes(teacher.id)).length === 0 && (
                  <div className="text-muted-foreground italic text-center py-4">
                    All teachers are already assigned to this ranking group.
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button 
                className="border border-border px-4 py-2 rounded hover:bg-accent transition-colors"
                onClick={() => setIsAddTeacherDialogOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 