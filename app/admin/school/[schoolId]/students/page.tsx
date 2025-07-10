"use client";

import { useState } from 'react';
import { useSchoolStudents, useCreateStudent, useUpdateStudent, useDeleteStudent, useSchoolGroups } from '@/app/hooks/useAdminQueries';
import { LoadingState } from '@/components/LoadingLayout';
import ThemeInput from '@/components/ThemeInput';
import ThemeSelect from '@/components/ThemeSelect';
import MotionButton from '@/components/MotionButton';
import { AdminStudentData } from '@/types/domain';
import CSVReader from 'react-csv-reader';
import { DateTime } from 'luxon';
import { bulkAddStudentsToSchool } from '@/app/supaApi/server/admin/adminApi';

enum SortType {
  FirstName = 'firstName',
  LastName = 'lastName',
  Grade = 'grade',
  PowerschoolId = 'powerschoolId'
}

enum SortDirection {
  Ascending = 'asc',
  Descending = 'desc'
}

// Types for bulk import
type PreviewStudent = {
  powerschoolId: number;
  firstName: string;
  lastName: string;
  grade: number;
  birthdate: DateTime;
  gender: string;
};

export default function StudentsManagementPage({ params: { schoolId } }: { params: { schoolId: string } }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortType>(SortType.LastName);
  const [sortDirection, setSortDirection] = useState<SortDirection>(SortDirection.Ascending);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<AdminStudentData | null>(null);

  // Bulk import state
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [previewStudents, setPreviewStudents] = useState<PreviewStudent[]>([]);
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [bulkImportError, setBulkImportError] = useState<string | null>(null);

  // Queries
  const { data: students, isLoading, error, refetch } = useSchoolStudents(parseInt(schoolId));
  const { data: groups, isLoading: groupsLoading } = useSchoolGroups(parseInt(schoolId));
  const createStudentMutation = useCreateStudent();
  const updateStudentMutation = useUpdateStudent();
  const deleteStudentMutation = useDeleteStudent();

  // Create form state
  const [createForm, setCreateForm] = useState({
    firstName: '',
    lastName: '',
    grade: '',
    birthdate: '',
    gender: '',
    powerschoolId: '',
    groupIds: [] as number[]
  });

  // Edit form state
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    grade: '',
    birthdate: '',
    gender: '',
    powerschoolId: '',
    groupIds: [] as number[]
  });

  // Filter and sort students
  const filteredAndSortedStudents = students?.filter(student =>
    student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student.powerschoolId?.toString() || '').includes(searchTerm)
  ).sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case SortType.FirstName:
        comparison = a.firstName.localeCompare(b.firstName);
        break;
      case SortType.LastName:
        comparison = a.lastName.localeCompare(b.lastName);
        break;
      case SortType.Grade:
        comparison = a.grade - b.grade;
        break;
      case SortType.PowerschoolId:
        comparison = (a.powerschoolId ?? 0) - (b.powerschoolId ?? 0);
        break;
    }
    return sortDirection === SortDirection.Ascending ? comparison : -comparison;
  }) || [];

  // Handle create student
  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.firstName || !createForm.lastName || !createForm.grade || !createForm.powerschoolId) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await createStudentMutation.mutateAsync({
        schoolId: parseInt(schoolId),
        studentData: {
          firstName: createForm.firstName,
          lastName: createForm.lastName,
          grade: parseInt(createForm.grade),
          birthdate: createForm.birthdate || undefined,
          gender: createForm.gender || undefined,
          powerschoolId: parseInt(createForm.powerschoolId),
          groupIds: createForm.groupIds
        }
      });

      // Reset form
      setCreateForm({
        firstName: '',
        lastName: '',
        grade: '',
        birthdate: '',
        gender: '',
        powerschoolId: '',
        groupIds: []
      });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create student:', error);
      alert('Failed to create student');
    }
  };

  // Handle update student
  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    try {
      await updateStudentMutation.mutateAsync({
        studentId: editingStudent.id,
        studentData: {
          firstName: editForm.firstName || undefined,
          lastName: editForm.lastName || undefined,
          grade: editForm.grade ? parseInt(editForm.grade) : undefined,
          birthdate: editForm.birthdate || undefined,
          gender: editForm.gender || undefined,
          powerschoolId: editForm.powerschoolId ? parseInt(editForm.powerschoolId) : undefined,
          groupIds: editForm.groupIds
        }
      });

      setEditingStudent(null);
      setEditForm({
        firstName: '',
        lastName: '',
        grade: '',
        birthdate: '',
        gender: '',
        powerschoolId: '',
        groupIds: []
      });
    } catch (error) {
      console.error('Failed to update student:', error);
      alert('Failed to update student');
    }
  };

  // Handle delete student
  const handleDeleteStudent = async (studentId: number, studentName: string) => {
    if (!confirm(`Are you sure you want to delete ${studentName}?`)) {
      return;
    }

    try {
      await deleteStudentMutation.mutateAsync(studentId);
    } catch (error) {
      console.error('Failed to delete student:', error);
      alert('Failed to delete student');
    }
  };

  // Start editing a student
  const startEditing = (student: AdminStudentData) => {
    setEditingStudent(student);
    setEditForm({
      firstName: student.firstName,
      lastName: student.lastName,
      grade: student.grade.toString(),
      birthdate: student.birthdate || '',
      gender: student.gender || '',
      powerschoolId: student.powerschoolId?.toString() || '',
      groupIds: student.groupIds || []
    });
  };

  // Bulk import functions
  const handleCSVUpload = (data: any[]) => {
    setBulkImportError(null);
    setPreviewStudents([]);
    
    if (!data || data.length === 0) {
      setBulkImportError('No data found in CSV file');
      return;
    }

    const processedStudents: PreviewStudent[] = [];
    
    data.forEach((row, index) => {
      // Skip empty rows
      if (!row.Id || row.Id === '' || row.Id === null || row.Id === undefined) {
        return;
      }

      try {
        // Parse name (assuming format: "LastName, FirstName")
        const nameParts = row.Name?.split(',') || [];
        if (nameParts.length < 2) {
          console.warn(`Row ${index + 1}: Invalid name format - ${row.Name}`);
          return;
        }

        const lastName = nameParts[0]?.trim() || '';
        const firstName = nameParts[1]?.trim() || '';

        if (!lastName || !firstName) {
          console.warn(`Row ${index + 1}: Missing first or last name`);
          return;
        }

        // Parse grade
        const grade = parseInt(row.Grade);
        if (isNaN(grade) || grade < 9 || grade > 12) {
          console.warn(`Row ${index + 1}: Invalid grade - ${row.Grade}`);
          return;
        }

        // Parse birthdate
        let birthdate: DateTime;
        try {
          birthdate = DateTime.fromFormat(row.Birthday, "MM/dd/yy");
          if (!birthdate.isValid) {
            console.warn(`Row ${index + 1}: Invalid birthdate format - ${row.Birthday}`);
            return;
          }
        } catch (error) {
          console.warn(`Row ${index + 1}: Could not parse birthdate - ${row.Birthday}`);
          return;
        }

        // Validate gender
        const gender = row.Gender?.toUpperCase();
        if (!['M', 'F', 'O'].includes(gender)) {
          console.warn(`Row ${index + 1}: Invalid gender - ${row.Gender}`);
          return;
        }

        processedStudents.push({
          powerschoolId: parseInt(row.Id),
          firstName,
          lastName,
          grade,
          birthdate,
          gender
        });
      } catch (error) {
        console.warn(`Row ${index + 1}: Error processing row`, error);
      }
    });

    if (processedStudents.length === 0) {
      setBulkImportError('No valid student data found in CSV file');
      return;
    }

    setPreviewStudents(processedStudents);
  };

  const handleBulkImport = async () => {
    if (isBulkImporting || previewStudents.length === 0) return;

    setIsBulkImporting(true);
    setBulkImportError(null);

    try {
      const success = await bulkAddStudentsToSchool(
        previewStudents.map(student => ({
          powerschoolId: student.powerschoolId,
          firstName: student.firstName,
          lastName: student.lastName,
          grade: student.grade,
          birthdate: student.birthdate.toISODate() || '',
          gender: student.gender,
        })),
        parseInt(schoolId)
      );

      if (success) {
        setShowBulkImport(false);
        setPreviewStudents([]);
        refetch(); // Refresh the students list
      } else {
        setBulkImportError('Failed to import students. Please try again.');
      }
    } catch (error) {
      console.error('Bulk import error:', error);
      setBulkImportError('An error occurred while importing students.');
    } finally {
      setIsBulkImporting(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Students Management</h1>
        <div className="flex gap-2">
          <MotionButton
            onClick={() => setShowBulkImport(!showBulkImport)}
            variant="secondary"
          >
            {showBulkImport ? 'Cancel Import' : 'Bulk Import CSV'}
          </MotionButton>
          <MotionButton
            onClick={() => setShowCreateForm(!showCreateForm)}
            variant="primary"
          >
            {showCreateForm ? 'Cancel' : 'Add Student'}
          </MotionButton>
        </div>
      </div>

      {/* Bulk Import Section */}
      {showBulkImport && (
        <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Bulk Import Students</h2>
          <div className="mb-4">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              Import a CSV file from PowerSchool. Expected columns: Id, Name (LastName, FirstName), Grade, Birthday (MM/dd/yy), Gender (M/F/O)
            </p>
            <CSVReader
              parserOptions={{ header: true }}
              onFileLoaded={handleCSVUpload}
              onError={(error) => setBulkImportError(`CSV Error: ${error.message}`)}
            />
          </div>

          {bulkImportError && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg">
              {bulkImportError}
            </div>
          )}

          {previewStudents.length > 0 && (
            <>
              <div className="mb-4">
                <h3 className="text-lg font-medium mb-2">
                  Preview ({previewStudents.length} students)
                </h3>
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full border-collapse border border-slate-300 dark:border-slate-600">
                    <thead className="bg-slate-50 dark:bg-slate-700">
                      <tr>
                        <th className="border border-slate-300 dark:border-slate-600 px-3 py-2 text-left text-xs font-medium">PowerSchool ID</th>
                        <th className="border border-slate-300 dark:border-slate-600 px-3 py-2 text-left text-xs font-medium">Last Name</th>
                        <th className="border border-slate-300 dark:border-slate-600 px-3 py-2 text-left text-xs font-medium">First Name</th>
                        <th className="border border-slate-300 dark:border-slate-600 px-3 py-2 text-left text-xs font-medium">Grade</th>
                        <th className="border border-slate-300 dark:border-slate-600 px-3 py-2 text-left text-xs font-medium">Birthday</th>
                        <th className="border border-slate-300 dark:border-slate-600 px-3 py-2 text-left text-xs font-medium">Gender</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewStudents.map((student, index) => (
                        <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                          <td className="border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm">{student.powerschoolId}</td>
                          <td className="border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm">{student.lastName}</td>
                          <td className="border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm">{student.firstName}</td>
                          <td className="border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm">{student.grade}</td>
                          <td className="border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm">{student.birthdate.toFormat("MMM dd yyyy")}</td>
                          <td className="border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm">{student.gender}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="flex gap-2">
                <MotionButton
                  onClick={handleBulkImport}
                  variant="primary"
                  disabled={isBulkImporting}
                >
                  {isBulkImporting ? 'Importing...' : `Import ${previewStudents.length} Students`}
                </MotionButton>
                <MotionButton
                  onClick={() => {
                    setShowBulkImport(false);
                    setPreviewStudents([]);
                    setBulkImportError(null);
                  }}
                  variant="secondary"
                >
                  Cancel
                </MotionButton>
              </div>
            </>
          )}
        </div>
      )}

      {/* Create Student Form */}
      {showCreateForm && (
        <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Add New Student</h2>
          <form onSubmit={handleCreateStudent} className="grid grid-cols-2 gap-4">
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
            <ThemeInput
              placeholder="Grade *"
              type="number"
              value={createForm.grade}
              onChange={(e) => setCreateForm({ ...createForm, grade: e.target.value })}
              required
            />
            <ThemeInput
              placeholder="PowerSchool ID *"
              type="number"
              value={createForm.powerschoolId}
              onChange={(e) => setCreateForm({ ...createForm, powerschoolId: e.target.value })}
              required
            />
            <ThemeInput
              placeholder="Birthdate"
              type="date"
              value={createForm.birthdate}
              onChange={(e) => setCreateForm({ ...createForm, birthdate: e.target.value })}
            />
            <ThemeSelect
              value={createForm.gender}
              onChange={(e) => setCreateForm({ ...createForm, gender: e.target.value })}
            >
              <option value="">Select Gender</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="O">Other</option>
            </ThemeSelect>
            <div className="col-span-2 flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={createStudentMutation.isPending}
              >
                {createStudentMutation.isPending ? 'Creating...' : 'Create Student'}
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

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg max-w-2xl w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">Edit Student</h2>
            <form onSubmit={handleUpdateStudent} className="grid grid-cols-2 gap-4">
              <ThemeInput
                placeholder="First Name"
                value={editForm.firstName}
                onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
              />
              <ThemeInput
                placeholder="Last Name"
                value={editForm.lastName}
                onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
              />
              <ThemeInput
                placeholder="Grade"
                type="number"
                value={editForm.grade}
                onChange={(e) => setEditForm({ ...editForm, grade: e.target.value })}
              />
              <ThemeInput
                placeholder="PowerSchool ID"
                type="number"
                value={editForm.powerschoolId}
                onChange={(e) => setEditForm({ ...editForm, powerschoolId: e.target.value })}
              />
              <ThemeInput
                placeholder="Birthdate"
                type="date"
                value={editForm.birthdate}
                onChange={(e) => setEditForm({ ...editForm, birthdate: e.target.value })}
              />
              <ThemeSelect
                value={editForm.gender}
                onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
              >
                <option value="">Select Gender</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="O">Other</option>
              </ThemeSelect>
              <div className="col-span-2 flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={updateStudentMutation.isPending}
                >
                  {updateStudentMutation.isPending ? 'Updating...' : 'Update Student'}
                </button>
                <MotionButton
                  variant="secondary"
                  onClick={() => setEditingStudent(null)}
                >
                  Cancel
                </MotionButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Search and Sort Controls */}
      <div className="flex gap-4 mb-6">
        <ThemeInput
          placeholder="Search students..."
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
          <option value={SortType.Grade}>Grade</option>
          <option value={SortType.PowerschoolId}>PowerSchool ID</option>
        </ThemeSelect>
        <ThemeSelect
          value={sortDirection}
          onChange={(e) => setSortDirection(e.target.value as SortDirection)}
        >
          <option value={SortDirection.Ascending}>Ascending</option>
          <option value={SortDirection.Descending}>Descending</option>
        </ThemeSelect>
      </div>

      {/* Students Table */}
      <LoadingState
        isLoading={isLoading}
        error={error}
        data={students}
        errorFallback={(err) => <div>Error loading students: {err.message}</div>}
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
                      Grade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                      PowerSchool ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                      Groups
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredAndSortedStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {student.lastName}, {student.firstName}
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          {student.birthdate && new Date(student.birthdate).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                        {student.grade}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                        {student.powerschoolId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                        <div className="flex flex-wrap gap-1">
                          {student.groupIds && student.groupIds.length > 0 ? (
                            student.groupIds.map((groupId) => {
                              const group = groups?.find(g => g.id === groupId);
                              return (
                                <span
                                  key={groupId}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                >
                                  {group ? group.name : `Group #${groupId}`}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-slate-400 text-xs">No groups</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <MotionButton
                            onClick={() => startEditing(student)}
                            variant="secondary"
                            size="sm"
                          >
                            Edit
                          </MotionButton>
                          <button
                            onClick={() => handleDeleteStudent(student.id, `${student.firstName} ${student.lastName}`)}
                            className="px-3 py-2 bg-red-600 text-white rounded-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={deleteStudentMutation.isPending}
                          >
                            Delete
                          </button>
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
        Showing {filteredAndSortedStudents.length} of {students?.length || 0} students
      </div>
    </div>
  );
} 