"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { 
  useSchoolTimeframes, 
  useCreateTimeframe, 
  useUpdateTimeframe, 
  useDeleteTimeframe, 
  useActivateTimeframe
} from "@/app/hooks/useAdminQueries";
import { AdminTimeframeData } from "@/types/domain";

export default function TimeframesNewPage() {
  const params = useParams();
  const schoolId = parseInt(params.schoolId as string);

  const [newTimeframeName, setNewTimeframeName] = useState("");
  const [newTimeframeStartsAt, setNewTimeframeStartsAt] = useState("");
  const [newTimeframeEndsAt, setNewTimeframeEndsAt] = useState("");
  const [isAddTimeframeDialogOpen, setIsAddTimeframeDialogOpen] = useState(false);
  const [editingTimeframe, setEditingTimeframe] = useState<AdminTimeframeData | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Queries
  const { 
    data: timeframes = [], 
    isLoading: isLoadingTimeframes, 
    error: timeframesError 
  } = useSchoolTimeframes(schoolId);

  // Mutations
  const createTimeframeMutation = useCreateTimeframe();
  const updateTimeframeMutation = useUpdateTimeframe();
  const deleteTimeframeMutation = useDeleteTimeframe();
  const activateTimeframeMutation = useActivateTimeframe();

  const handleCreateTimeframe = async () => {
    if (!newTimeframeName.trim() || !newTimeframeStartsAt || !newTimeframeEndsAt) {
      alert("Please fill in all fields");
      return;
    }

    if (new Date(newTimeframeStartsAt) >= new Date(newTimeframeEndsAt)) {
      alert("End date must be after start date");
      return;
    }

    try {
      await createTimeframeMutation.mutateAsync({
        schoolId,
        timeframeData: {
          name: newTimeframeName.trim(),
          startsAt: newTimeframeStartsAt,
          endsAt: newTimeframeEndsAt
        }
      });
      
      setNewTimeframeName("");
      setNewTimeframeStartsAt("");
      setNewTimeframeEndsAt("");
      setIsAddTimeframeDialogOpen(false);
      alert("Timeframe created successfully");
    } catch (error) {
      alert("Failed to create timeframe");
      console.error("Error creating timeframe:", error);
    }
  };

  const handleUpdateTimeframe = async () => {
    if (!editingTimeframe) return;

    if (!editingTimeframe.name.trim() || !editingTimeframe.startsAt || !editingTimeframe.endsAt) {
      alert("Please fill in all fields");
      return;
    }

    if (new Date(editingTimeframe.startsAt) >= new Date(editingTimeframe.endsAt)) {
      alert("End date must be after start date");
      return;
    }

    try {
      await updateTimeframeMutation.mutateAsync({
        timeframeId: editingTimeframe.id,
        timeframeData: {
          name: editingTimeframe.name,
          startsAt: editingTimeframe.startsAt,
          endsAt: editingTimeframe.endsAt
        }
      });
      
      setEditingTimeframe(null);
      setIsEditDialogOpen(false);
      alert("Timeframe updated successfully");
    } catch (error) {
      alert("Failed to update timeframe");
      console.error("Error updating timeframe:", error);
    }
  };

  const handleDeleteTimeframe = async (timeframeId: number, timeframeName: string) => {
    if (!confirm(`Are you sure you want to delete "${timeframeName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteTimeframeMutation.mutateAsync(timeframeId);
      alert("Timeframe deleted successfully");
    } catch (error) {
      alert("Failed to delete timeframe");
      console.error("Error deleting timeframe:", error);
    }
  };

  const handleActivateTimeframe = async (timeframeId: number) => {
    try {
      await activateTimeframeMutation.mutateAsync(timeframeId);
      alert("Timeframe activated successfully");
    } catch (error) {
      alert("Failed to activate timeframe");
      console.error("Error activating timeframe:", error);
    }
  };

  const openEditDialog = (timeframe: AdminTimeframeData) => {
    setEditingTimeframe({ ...timeframe });
    setIsEditDialogOpen(true);
  };

  const formatDateTime = (dateTimeString: string) => {
    return new Date(dateTimeString).toLocaleString();
  };

  const getTimeframeStatus = (timeframe: AdminTimeframeData) => {
    const now = new Date();
    const startDate = new Date(timeframe.startsAt);
    const endDate = new Date(timeframe.endsAt);

    if (timeframe.active) {
      return { status: "Active", color: "bg-green-100 text-green-800" };
    } else if (now < startDate) {
      return { status: "Upcoming", color: "bg-blue-100 text-blue-800" };
    } else if (now >= startDate && now <= endDate) {
      return { status: "In Progress", color: "bg-yellow-100 text-yellow-800" };
    } else {
      return { status: "Ended", color: "bg-gray-100 text-gray-800" };
    }
  };

  if (isLoadingTimeframes) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading timeframes...</p>
        </div>
      </div>
    );
  }

  if (timeframesError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-destructive text-2xl mb-4">⚠️</div>
          <p className="text-destructive">Failed to load timeframes</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Timeframes</h1>
          <p className="text-muted-foreground">
            Manage timeframes for organizing competitions and events
          </p>
        </div>
        
        <button
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          onClick={() => setIsAddTimeframeDialogOpen(true)}
        >
          + Add Timeframe
        </button>
      </div>

      {timeframes.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <div className="text-4xl mb-4">⏰</div>
          <h3 className="text-lg font-semibold mb-2 text-foreground">No timeframes yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first timeframe to start organizing competitions and events.
          </p>
          <button 
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            onClick={() => setIsAddTimeframeDialogOpen(true)}
          >
            + Create First Timeframe
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {timeframes.map((timeframe) => {
            const status = getTimeframeStatus(timeframe);
            return (
              <div key={timeframe.id} className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-foreground">{timeframe.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded ${status.color}`}>
                      {status.status}
                    </span>
                    {timeframe.active && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        Currently Active
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!timeframe.active && (
                      <button
                        className="text-green-600 hover:bg-green-50 px-2 py-1 rounded text-sm transition-colors"
                        onClick={() => handleActivateTimeframe(timeframe.id)}
                      >
                        Activate
                      </button>
                    )}
                    <button
                      className="text-primary hover:bg-primary/10 px-2 py-1 rounded text-sm transition-colors"
                      onClick={() => openEditDialog(timeframe)}
                    >
                      Edit
                    </button>
                    <button
                      className="text-destructive hover:bg-destructive/10 px-2 py-1 rounded text-sm transition-colors"
                      onClick={() => handleDeleteTimeframe(timeframe.id, timeframe.name)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div>
                    <span className="font-medium text-foreground">Starts:</span> {formatDateTime(timeframe.startsAt)}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Ends:</span> {formatDateTime(timeframe.endsAt)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Timeframe Dialog */}
      {isAddTimeframeDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-96">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Create New Timeframe</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">
                  Timeframe Name
                </label>
                <input
                  type="text"
                  value={newTimeframeName}
                  onChange={(e) => setNewTimeframeName(e.target.value)}
                  placeholder="Enter timeframe name"
                  className="w-full p-2 border border-input rounded bg-background text-foreground focus:border-ring focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">
                  Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={newTimeframeStartsAt}
                  onChange={(e) => setNewTimeframeStartsAt(e.target.value)}
                  className="w-full p-2 border border-input rounded bg-background text-foreground focus:border-ring focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">
                  End Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={newTimeframeEndsAt}
                  onChange={(e) => setNewTimeframeEndsAt(e.target.value)}
                  className="w-full p-2 border border-input rounded bg-background text-foreground focus:border-ring focus:outline-none"
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <button 
                  className="border border-border px-4 py-2 rounded hover:bg-accent transition-colors"
                  onClick={() => {
                    setIsAddTimeframeDialogOpen(false);
                    setNewTimeframeName("");
                    setNewTimeframeStartsAt("");
                    setNewTimeframeEndsAt("");
                  }}
                >
                  Cancel
                </button>
                <button 
                  className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90 transition-colors"
                  onClick={handleCreateTimeframe}
                  disabled={createTimeframeMutation.isPending}
                >
                  {createTimeframeMutation.isPending ? "Creating..." : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Timeframe Dialog */}
      {isEditDialogOpen && editingTimeframe && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-96">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Edit Timeframe</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">
                  Timeframe Name
                </label>
                <input
                  type="text"
                  value={editingTimeframe.name}
                  onChange={(e) => setEditingTimeframe({ ...editingTimeframe, name: e.target.value })}
                  className="w-full p-2 border border-input rounded bg-background text-foreground focus:border-ring focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">
                  Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={editingTimeframe.startsAt.slice(0, 16)}
                  onChange={(e) => setEditingTimeframe({ ...editingTimeframe, startsAt: e.target.value })}
                  className="w-full p-2 border border-input rounded bg-background text-foreground focus:border-ring focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">
                  End Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={editingTimeframe.endsAt.slice(0, 24)}
                  onChange={(e) => setEditingTimeframe({ ...editingTimeframe, endsAt: e.target.value })}
                  className="w-full p-2 border border-input rounded bg-background text-foreground focus:border-ring focus:outline-none"
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <button 
                  className="border border-border px-4 py-2 rounded hover:bg-accent transition-colors"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditingTimeframe(null);
                  }}
                >
                  Cancel
                </button>
                <button 
                  className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90 transition-colors"
                  onClick={handleUpdateTimeframe}
                  disabled={updateTimeframeMutation.isPending}
                >
                  {updateTimeframeMutation.isPending ? "Updating..." : "Update"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 