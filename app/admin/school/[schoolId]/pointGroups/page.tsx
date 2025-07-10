"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { 
  useSchoolPointGroups, 
  useCreatePointGroup, 
  useUpdatePointGroup
} from "@/app/hooks/useAdminQueries";
import { AdminPointGroupData } from "@/types/domain";

export default function PointGroupsNewPage() {
  const params = useParams();
  const schoolId = parseInt(params.schoolId as string);

  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupColor, setNewGroupColor] = useState("#3B82F6");
  const [newGroupRanked, setNewGroupRanked] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);
  const [isAddGroupDialogOpen, setIsAddGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AdminPointGroupData | null>(null);

  // Queries
  const { 
    data: pointGroups = [], 
    isLoading: isLoadingPointGroups, 
    error: pointGroupsError 
  } = useSchoolPointGroups(schoolId);

  // Mutations
  const createPointGroupMutation = useCreatePointGroup();
  const updatePointGroupMutation = useUpdatePointGroup();

  const handleCreatePointGroup = async () => {
    if (!newGroupName.trim()) {
      alert("Please enter a group name");
      return;
    }

    try {
      await createPointGroupMutation.mutateAsync({
        schoolId,
        groupData: { 
          name: newGroupName.trim(),
          color: newGroupColor,
          ranked: newGroupRanked,
          parentId: selectedParentId || undefined
        }
      });
      
      setNewGroupName("");
      setNewGroupColor("#3B82F6");
      setNewGroupRanked(false);
      setSelectedParentId(null);
      setIsAddGroupDialogOpen(false);
      alert("Point group created successfully");
    } catch (error) {
      alert("Failed to create point group");
      console.error("Error creating point group:", error);
    }
  };

  const handleUpdatePointGroup = async (groupId: number, updates: {
    name?: string;
    color?: string;
    ranked?: boolean;
  }) => {
    try {
      await updatePointGroupMutation.mutateAsync({
        pointGroupId: groupId,
        groupData: updates
      });
      
      setEditingGroup(null);
      alert("Point group updated successfully");
    } catch (error) {
      alert("Failed to update point group");
      console.error("Error updating point group:", error);
    }
  };

  const renderPointGroupHierarchy = (groups: AdminPointGroupData[], level: number = 0): JSX.Element[] => {
    return groups
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(group => (
        <div key={group.id} className="space-y-2">
          <div 
            className={`flex items-center gap-4 p-3 rounded-lg border border-border bg-card ${
              level > 0 ? 'ml-4' : ''
            }`}
            style={{ borderLeftColor: group.color, borderLeftWidth: '4px' }}
          >
            <div className="flex-1">
              {editingGroup?.id === group.id ? (
                <input
                  type="text"
                  value={editingGroup.name}
                  onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                  className="w-full p-1 border rounded"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleUpdatePointGroup(group.id, { name: editingGroup.name });
                    } else if (e.key === 'Escape') {
                      setEditingGroup(null);
                    }
                  }}
                  onBlur={() => handleUpdatePointGroup(group.id, { name: editingGroup.name })}
                  autoFocus
                />
              ) : (
                <div className="flex items-center gap-2">
                  <span 
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: group.color }}
                  ></span>
                  <span className="font-medium text-foreground">{group.name}</span>
                  {group.ranked && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      Ranked
                    </span>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {editingGroup?.id === group.id ? (
                <>
                  <input
                    type="color"
                    value={editingGroup.color}
                    onChange={(e) => setEditingGroup({ ...editingGroup, color: e.target.value })}
                    className="w-8 h-8 border rounded"
                  />
                  <input
                    type="checkbox"
                    checked={editingGroup.ranked}
                    onChange={(e) => setEditingGroup({ ...editingGroup, ranked: e.target.checked })}
                    className="w-4 h-4"
                  />
                </>
              ) : (
                <>
                  <button
                    className="text-primary hover:bg-primary/10 p-1 rounded transition-colors"
                    onClick={() => setEditingGroup(group)}
                  >
                    ✏️
                  </button>
                  <button
                    className="text-green-600 hover:bg-green-50 p-1 rounded transition-colors"
                    onClick={() => {
                      setSelectedParentId(group.id);
                      setIsAddGroupDialogOpen(true);
                    }}
                  >
                    ➕
                  </button>
                </>
              )}
            </div>
          </div>
          
          {group.childGroups && group.childGroups.length > 0 && (
            <div className="ml-4">
              {renderPointGroupHierarchy(group.childGroups, level + 1)}
            </div>
          )}
        </div>
      ));
  };

  if (isLoadingPointGroups) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading point groups...</p>
        </div>
      </div>
    );
  }

  if (pointGroupsError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-destructive text-2xl mb-4">⚠️</div>
          <p className="text-destructive">Failed to load point groups</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Point Groups</h1>
          <p className="text-muted-foreground">
            Manage point groups and their hierarchy for organizing different types of points
          </p>
        </div>
        
        <button
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          onClick={() => {
            setSelectedParentId(null);
            setIsAddGroupDialogOpen(true);
          }}
        >
          + Add Point Group
        </button>
      </div>

      {pointGroups.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <div className="text-4xl mb-4">🎯</div>
          <h3 className="text-lg font-semibold mb-2 text-foreground">No point groups yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first point group to start organizing different types of points and achievements.
          </p>
          <button 
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            onClick={() => {
              setSelectedParentId(null);
              setIsAddGroupDialogOpen(true);
            }}
          >
            + Create First Point Group
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {renderPointGroupHierarchy(pointGroups)}
        </div>
      )}

      {/* Add Group Dialog */}
      {isAddGroupDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-96">
            <h2 className="text-xl font-semibold mb-4 text-foreground">
              {selectedParentId ? 'Create Child Point Group' : 'Create New Point Group'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">
                  Group Name
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Enter point group name"
                  className="w-full p-2 border border-input rounded bg-background text-foreground focus:border-ring focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreatePointGroup();
                    }
                  }}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">
                  Color
                </label>
                <input
                  type="color"
                  value={newGroupColor}
                  onChange={(e) => setNewGroupColor(e.target.value)}
                  className="w-full h-10 border border-input rounded"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ranked"
                  checked={newGroupRanked}
                  onChange={(e) => setNewGroupRanked(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="ranked" className="text-sm font-medium text-foreground">
                  Ranked (affects leaderboards)
                </label>
              </div>
              
              <div className="flex justify-end gap-2">
                <button 
                  className="border border-border px-4 py-2 rounded hover:bg-accent transition-colors"
                  onClick={() => {
                    setIsAddGroupDialogOpen(false);
                    setNewGroupName("");
                    setNewGroupColor("#3B82F6");
                    setNewGroupRanked(false);
                    setSelectedParentId(null);
                  }}
                >
                  Cancel
                </button>
                <button 
                  className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90 transition-colors"
                  onClick={handleCreatePointGroup}
                  disabled={createPointGroupMutation.isPending}
                >
                  {createPointGroupMutation.isPending ? "Creating..." : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 