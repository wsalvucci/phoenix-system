"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useGroup, useAddStudentToGroup, useRemoveStudentFromGroup, useAddTeacherToGroup, useRemoveTeacherFromGroup, useSchoolStudents, useSchoolTeachers } from '@/app/hooks/useAdminQueries';
import { LoadingState } from '@/components/LoadingLayout';
import ThemeInput from '@/components/ThemeInput';
import MotionButton from '@/components/MotionButton';
import { motion, AnimatePresence } from 'framer-motion';

interface Student {
  id: number;
  firstName: string;
  lastName: string;
  grade: number;
  powerschoolId?: number;
}

interface Teacher {
  id: number;
  firstName: string;
  lastName: string;
}

interface ChildGroup {
  id: number;
  name: string;
  studentCount: number;
  teacherCount: number;
}

interface GroupData {
  id: number;
  name: string;
  parentId?: number | null;
  archived?: boolean;
  students: Student[];
  teachers: Teacher[];
  childGroups: ChildGroup[];
  parentGroup?: {
    id: number;
    name: string;
  };
}

export default function EditGroupPage({ params: { schoolId, groupId } }: { params: { schoolId: string, groupId: string } }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [teacherSearchTerm, setTeacherSearchTerm] = useState('');
  const [showAddStudentsModal, setShowAddStudentsModal] = useState(false);
  const [showAddTeachersModal, setShowAddTeachersModal] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [selectedTeachers, setSelectedTeachers] = useState<number[]>([]);
  const [selectedStudentsForRemoval, setSelectedStudentsForRemoval] = useState<number[]>([]);
  const [selectedTeachersForRemoval, setSelectedTeachersForRemoval] = useState<number[]>([]);

  // Queries
  const { data: group, isLoading, error } = useGroup(parseInt(schoolId), parseInt(groupId));
  const { data: allStudents } = useSchoolStudents(parseInt(schoolId));
  const { data: allTeachers } = useSchoolTeachers(parseInt(schoolId));

  // Mutations
  const addStudentMutation = useAddStudentToGroup();
  const removeStudentMutation = useRemoveStudentFromGroup();
  const addTeacherMutation = useAddTeacherToGroup();
  const removeTeacherMutation = useRemoveTeacherFromGroup();

  // Filter available students (not already in the group)
  const availableStudents = allStudents?.filter(student => 
    !group?.students.some(gStudent => gStudent.id === student.id)
  ) || [];

  // Filter available teachers (not already in the group)
  const availableTeachers = allTeachers?.filter(teacher => 
    !group?.teachers.some(gTeacher => gTeacher.id === teacher.id)
  ) || [];

  // Filter students based on search term
  const filteredStudents = group?.students.filter(student =>
    student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student.powerschoolId?.toString() || '').includes(searchTerm)
  ) || [];

  // Filter teachers based on search term
  const filteredTeachers = group?.teachers.filter(teacher =>
    teacher.firstName.toLowerCase().includes(teacherSearchTerm.toLowerCase()) ||
    teacher.lastName.toLowerCase().includes(teacherSearchTerm.toLowerCase())
  ) || [];

  // Filter available students for modal
  const filteredAvailableStudents = availableStudents.filter(student =>
    student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student.powerschoolId?.toString() || '').includes(searchTerm)
  );

  // Filter available teachers for modal
  const filteredAvailableTeachers = availableTeachers.filter(teacher =>
    teacher.firstName.toLowerCase().includes(teacherSearchTerm.toLowerCase()) ||
    teacher.lastName.toLowerCase().includes(teacherSearchTerm.toLowerCase())
  );

  const handleAddStudents = async () => {
    if (selectedStudents.length === 0) return;

    try {
      await Promise.all(
        selectedStudents.map(studentId =>
          addStudentMutation.mutateAsync({
            schoolId: parseInt(schoolId),
            groupId: parseInt(groupId),
            studentId
          })
        )
      );
      setSelectedStudents([]);
      setShowAddStudentsModal(false);
    } catch (error) {
      console.error('Failed to add students:', error);
      alert('Failed to add students to group');
    }
  };

  const handleRemoveStudents = async () => {
    if (selectedStudentsForRemoval.length === 0) return;

    if (!confirm(`Are you sure you want to remove ${selectedStudentsForRemoval.length} student(s) from this group? This will also remove them from all child groups.`)) {
      return;
    }

    try {
      await Promise.all(
        selectedStudentsForRemoval.map(studentId =>
          removeStudentMutation.mutateAsync({
            schoolId: parseInt(schoolId),
            groupId: parseInt(groupId),
            studentId
          })
        )
      );
      setSelectedStudentsForRemoval([]);
    } catch (error) {
      console.error('Failed to remove students:', error);
      alert('Failed to remove students from group');
    }
  };

  const handleAddTeachers = async () => {
    if (selectedTeachers.length === 0) return;

    try {
      await Promise.all(
        selectedTeachers.map(teacherId =>
          addTeacherMutation.mutateAsync({
            schoolId: parseInt(schoolId),
            groupId: parseInt(groupId),
            teacherId
          })
        )
      );
      setSelectedTeachers([]);
      setShowAddTeachersModal(false);
    } catch (error) {
      console.error('Failed to add teachers:', error);
      alert('Failed to add teachers to group');
    }
  };

  const handleRemoveTeachers = async () => {
    if (selectedTeachersForRemoval.length === 0) return;

    if (!confirm(`Are you sure you want to remove ${selectedTeachersForRemoval.length} teacher(s) from this group?`)) {
      return;
    }

    try {
      await Promise.all(
        selectedTeachersForRemoval.map(teacherId =>
          removeTeacherMutation.mutateAsync({
            schoolId: parseInt(schoolId),
            groupId: parseInt(groupId),
            teacherId
          })
        )
      );
      setSelectedTeachersForRemoval([]);
    } catch (error) {
      console.error('Failed to remove teachers:', error);
      alert('Failed to remove teachers from group');
    }
  };

  const toggleStudentSelection = (studentId: number) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const toggleTeacherSelection = (teacherId: number) => {
    setSelectedTeachers(prev => 
      prev.includes(teacherId) 
        ? prev.filter(id => id !== teacherId)
        : [...prev, teacherId]
    );
  };

  const toggleStudentRemovalSelection = (studentId: number) => {
    setSelectedStudentsForRemoval(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const toggleTeacherRemovalSelection = (teacherId: number) => {
    setSelectedTeachersForRemoval(prev => 
      prev.includes(teacherId) 
        ? prev.filter(id => id !== teacherId)
        : [...prev, teacherId]
    );
  };

  const selectAllStudents = () => {
    setSelectedStudents(filteredAvailableStudents.map(s => s.id));
  };

  const deselectAllStudents = () => {
    setSelectedStudents([]);
  };

  const selectAllTeachers = () => {
    setSelectedTeachers(filteredAvailableTeachers.map(t => t.id));
  };

  const deselectAllTeachers = () => {
    setSelectedTeachers([]);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/admin/school/${schoolId}/groups`}>
            <MotionButton variant="outline" size="sm">
              ← Back to Groups
            </MotionButton>
          </Link>
          <h1 className="text-3xl font-bold mt-4">Edit Group</h1>
        </div>
      </div>

      <LoadingState
        isLoading={isLoading}
        error={error}
        data={group}
      >
        {(groupData: GroupData) => (
          <div className="space-y-6">
            {/* Group Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border rounded-lg p-6"
            >
              <h2 className="text-2xl font-semibold mb-4">{groupData.name}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">{groupData.students.length}</div>
                  <div className="text-sm text-muted-foreground">Students</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">{groupData.teachers.length}</div>
                  <div className="text-sm text-muted-foreground">Teachers</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">{groupData.childGroups.length}</div>
                  <div className="text-sm text-muted-foreground">Child Groups</div>
                </div>
              </div>
            </motion.div>

            {/* Parent Group */}
            {groupData.parentGroup && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border rounded-lg p-6"
              >
                <h3 className="text-lg font-semibold mb-3">Parent Group</h3>
                <Link href={`/admin/school/${schoolId}/editGroup/${groupData.parentGroup.id}`}>
                  <MotionButton variant="outline" size="sm">
                    {groupData.parentGroup.name}
                  </MotionButton>
                </Link>
              </motion.div>
            )}

            {/* Child Groups */}
            {groupData.childGroups.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border rounded-lg p-6"
              >
                <h3 className="text-lg font-semibold mb-3">Child Groups</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupData.childGroups.map(childGroup => (
                    <Link key={childGroup.id} href={`/admin/school/${schoolId}/editGroup/${childGroup.id}`}>
                      <div className="p-4 border rounded-lg hover:bg-muted transition-colors cursor-pointer">
                        <div className="font-medium">{childGroup.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {childGroup.studentCount} students, {childGroup.teacherCount} teachers
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Teachers Section */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-card border rounded-lg p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Teachers ({groupData.teachers.length})</h3>
                  <MotionButton
                    onClick={() => setShowAddTeachersModal(true)}
                    size="sm"
                  >
                    Add Teachers
                  </MotionButton>
                </div>

                <ThemeInput
                  placeholder="Search teachers..."
                  value={teacherSearchTerm}
                  onChange={(e) => setTeacherSearchTerm(e.target.value)}
                  className="mb-4"
                />

                {selectedTeachersForRemoval.length > 0 && (
                  <div className="mb-4">
                    <MotionButton
                      onClick={handleRemoveTeachers}
                      variant="secondary"
                      size="sm"
                    >
                      Remove Selected ({selectedTeachersForRemoval.length})
                    </MotionButton>
                  </div>
                )}

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredTeachers.map(teacher => (
                    <div
                      key={teacher.id}
                      className={`p-3 border rounded-lg flex items-center justify-between ${
                        selectedTeachersForRemoval.includes(teacher.id) ? 'bg-destructive/10 border-destructive' : ''
                      }`}
                    >
                      <div>
                        <div className="font-medium">{teacher.firstName} {teacher.lastName}</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedTeachersForRemoval.includes(teacher.id)}
                        onChange={() => toggleTeacherRemovalSelection(teacher.id)}
                        className="rounded"
                      />
                    </div>
                  ))}
                  {filteredTeachers.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      No teachers found
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Students Section */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-card border rounded-lg p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Students ({groupData.students.length})</h3>
                  <MotionButton
                    onClick={() => setShowAddStudentsModal(true)}
                    size="sm"
                  >
                    Add Students
                  </MotionButton>
                </div>

                <ThemeInput
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mb-4"
                />

                {selectedStudentsForRemoval.length > 0 && (
                  <div className="mb-4">
                    <MotionButton
                      onClick={handleRemoveStudents}
                      variant="secondary"
                      size="sm"
                    >
                      Remove Selected ({selectedStudentsForRemoval.length})
                    </MotionButton>
                  </div>
                )}

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredStudents.map(student => (
                    <div
                      key={student.id}
                      className={`p-3 border rounded-lg flex items-center justify-between ${
                        selectedStudentsForRemoval.includes(student.id) ? 'bg-destructive/10 border-destructive' : ''
                      }`}
                    >
                      <div>
                        <div className="font-medium">{student.firstName} {student.lastName}</div>
                        <div className="text-sm text-muted-foreground">
                          Grade {student.grade}
                          {student.powerschoolId && ` • ID: ${student.powerschoolId}`}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedStudentsForRemoval.includes(student.id)}
                        onChange={() => toggleStudentRemovalSelection(student.id)}
                        className="rounded"
                      />
                    </div>
                  ))}
                  {filteredStudents.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      No students found
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </LoadingState>

      {/* Add Students Modal */}
      <AnimatePresence>
        {showAddStudentsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowAddStudentsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-background border border-border rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Add Students</h3>
                <button
                  onClick={() => setShowAddStudentsModal(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>

              <ThemeInput
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mb-4"
              />

              <div className="flex gap-2 mb-4">
                <MotionButton onClick={selectAllStudents} variant="outline" size="sm">
                  Select All
                </MotionButton>
                <MotionButton onClick={deselectAllStudents} variant="outline" size="sm">
                  Deselect All
                </MotionButton>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
                {filteredAvailableStudents.map(student => (
                  <div
                    key={student.id}
                    className={`p-3 border rounded-lg flex items-center justify-between ${
                      selectedStudents.includes(student.id) ? 'bg-primary/10 border-primary' : ''
                    }`}
                  >
                    <div>
                      <div className="font-medium">{student.firstName} {student.lastName}</div>
                      <div className="text-sm text-muted-foreground">
                        Grade {student.grade}
                        {student.powerschoolId && ` • ID: ${student.powerschoolId}`}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(student.id)}
                      onChange={() => toggleStudentSelection(student.id)}
                      className="rounded"
                    />
                  </div>
                ))}
                {filteredAvailableStudents.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    No available students found
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end">
                <MotionButton
                  onClick={() => setShowAddStudentsModal(false)}
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </MotionButton>
                <MotionButton
                  onClick={handleAddStudents}
                  size="sm"
                  disabled={selectedStudents.length === 0 || addStudentMutation.isPending}
                >
                  {addStudentMutation.isPending ? 'Adding...' : `Add ${selectedStudents.length} Student(s)`}
                </MotionButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Teachers Modal */}
      <AnimatePresence>
        {showAddTeachersModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowAddTeachersModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-background border border-border rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Add Teachers</h3>
                <button
                  onClick={() => setShowAddTeachersModal(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>

              <ThemeInput
                placeholder="Search teachers..."
                value={teacherSearchTerm}
                onChange={(e) => setTeacherSearchTerm(e.target.value)}
                className="mb-4"
              />

              <div className="flex gap-2 mb-4">
                <MotionButton onClick={selectAllTeachers} variant="outline" size="sm">
                  Select All
                </MotionButton>
                <MotionButton onClick={deselectAllTeachers} variant="outline" size="sm">
                  Deselect All
                </MotionButton>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
                {filteredAvailableTeachers.map(teacher => (
                  <div
                    key={teacher.id}
                    className={`p-3 border rounded-lg flex items-center justify-between ${
                      selectedTeachers.includes(teacher.id) ? 'bg-primary/10 border-primary' : ''
                    }`}
                  >
                    <div>
                      <div className="font-medium">{teacher.firstName} {teacher.lastName}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedTeachers.includes(teacher.id)}
                      onChange={() => toggleTeacherSelection(teacher.id)}
                      className="rounded"
                    />
                  </div>
                ))}
                {filteredAvailableTeachers.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    No available teachers found
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end">
                <MotionButton
                  onClick={() => setShowAddTeachersModal(false)}
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </MotionButton>
                <MotionButton
                  onClick={handleAddTeachers}
                  size="sm"
                  disabled={selectedTeachers.length === 0 || addTeacherMutation.isPending}
                >
                  {addTeacherMutation.isPending ? 'Adding...' : `Add ${selectedTeachers.length} Teacher(s)`}
                </MotionButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}