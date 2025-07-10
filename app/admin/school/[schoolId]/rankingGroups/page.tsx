"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { 
  useSchoolRankingGroups, 
  useCreateRankingGroup, 
  useAddStudentGroupToRankingGroup, 
  useRemoveStudentGroupFromRankingGroup,
  useSchoolGroupsWithCounts
} from "@/app/hooks/useAdminQueries";
import { AdminRankingGroupData, AdminGroupData } from "@/types/domain";

export default function RankingGroupsNewPage() {
  const params = useParams();
  const schoolId = parseInt(params.schoolId as string);

  const [newGroupName, setNewGroupName] = useState("");
  const [selectedRankingGroup, setSelectedRankingGroup] = useState<AdminRankingGroupData | null>(null);
  const [isAddGroupDialogOpen, setIsAddGroupDialogOpen] = useState(false);
  const [isAddStudentGroupDialogOpen, setIsAddStudentGroupDialogOpen] = useState(false);

  // Queries
  const { 
    data: rankingGroups = [], 
    isLoading: isLoadingRankingGroups, 
    error: rankingGroupsError 
  } = useSchoolRankingGroups(schoolId);

  const { 
    data: studentGroups = [], 
    isLoading: isLoadingStudentGroups 
  } = useSchoolGroupsWithCounts(schoolId);

  // Debug logging
  console.log('Ranking Groups Data:', rankingGroups);
  console.log('Student Groups Data:', studentGroups);
  console.log('School ID:', schoolId);
  
  // More detailed debugging
  rankingGroups.forEach((group, index) => {
    console.log(`Ranking Group ${index}:`, {
      id: group.id,
      name: group.name,
      studentGroupIds: group.studentGroupIds,
      studentGroupIdsLength: group.studentGroupIds?.length || 0
    });
  });

  // Mutations
  const createRankingGroupMutation = useCreateRankingGroup();
  const addStudentGroupMutation = useAddStudentGroupToRankingGroup();
  const removeStudentGroupMutation = useRemoveStudentGroupFromRankingGroup();

  const handleCreateRankingGroup = async () => {
    if (!newGroupName.trim()) {
      alert("Please enter a group name");
      return;
    }

    try {
      await createRankingGroupMutation.mutateAsync({
        schoolId,
        groupData: { name: newGroupName.trim() }
      });
      
      setNewGroupName("");
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

  const getStudentGroupById = (id: number): AdminGroupData | undefined => {
    return studentGroups.find(group => group.id === id);
  };

  const renderStudentGroupHierarchy = (groups: AdminGroupData[], level: number = 0): JSX.Element[] => {
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
              <span className="font-medium text-foreground">{group.name}</span>
              <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                Student Group
              </span>
            </div>
            <button className="p-1 hover:bg-accent/50 rounded transition-colors">
              +
            </button>
          </div>
          {/* Note: AdminGroupData doesn't include childGroups in the current type definition */}
        </div>
      ));
  };

  if (isLoadingRankingGroups || isLoadingStudentGroups) {
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
                      {rankingGroup.studentGroupIds.length} groups
                    </span>
                  </div>
                  <button
                    className="border border-border px-3 py-1 rounded hover:bg-accent transition-colors"
                    onClick={() => openAddStudentGroupDialog(rankingGroup)}
                  >
                    + Add Student Group
                  </button>
                </div>
              </div>
              {/* List all student groups in this ranking group */}
              <div className="p-4 space-y-2">
                {rankingGroup.studentGroupIds.length === 0 ? (
                  <div className="text-muted-foreground italic">No student groups in this ranking group.</div>
                ) : (
                  rankingGroup.studentGroupIds.map((groupId) => {
                    const group = getStudentGroupById(groupId);
                    if (!group) return null;
                    return (
                      <div key={group.id} className="flex items-center justify-between p-2 rounded border border-border bg-muted">
                        <div className="font-medium text-foreground">{group.name}</div>
                        <button
                          className="text-destructive border border-destructive px-2 py-1 rounded hover:bg-destructive hover:text-white transition-colors"
                          onClick={() => handleRemoveStudentGroup(group.id, rankingGroup.id)}
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })
                )}
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
              Add Student Groups to "{selectedRankingGroup.name}"
            </h2>
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
    </div>
  );
} 