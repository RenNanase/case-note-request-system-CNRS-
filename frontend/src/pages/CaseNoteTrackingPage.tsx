import { useState, useRef, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useReactToPrint } from 'react-to-print';
import {
  FileText,
  Filter,
  Loader2,
  Calendar,
  Building2,
  UserCheck,
  Download,
  BarChart3,
  RefreshCw,
  Search
} from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { useQuery } from '@tanstack/react-query';
import { requestsApi, resourcesApi } from '@/api/requests';

type CaseNoteType = 'in' | 'out' | 'filling';
interface CaseNoteRecord {
  [key: string]: any; // Allow any other properties
  is_returned?: boolean;
  returned_at?: string;
  returned_by?: string;
}

interface Department {
  id: number;
  name: string;
  code: string;
}

interface Doctor {
  id: number;
  name: string;
  // No department_id dependency - doctors are independent
}

export default function CaseNoteTrackingPage() {
  const [caseNoteType, setCaseNoteType] = useState<CaseNoteType>('in');
  const [startDate, setStartDate] = useState<Date | undefined>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());

  // Guarded setters ensure a valid range so clicks always apply
  const onStartDateChange = (d?: Date) => {
    if (!d) { setStartDate(undefined); return; }
    if (endDate && d > endDate) {
      setStartDate(d);
      setEndDate(d);
    } else {
      setStartDate(d);
    }
  };

  const onEndDateChange = (d?: Date) => {
    if (!d) { setEndDate(undefined); return; }
    if (startDate && d < startDate) {
      setEndDate(d);
      setStartDate(d);
    } else {
      setEndDate(d);
    }
  };

  // Filter states - independent filters
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | undefined>(undefined);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | undefined>(undefined);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  const printRef = useRef<HTMLDivElement>(null);

  // Load departments and doctors on component mount - independent
  useEffect(() => {
    const loadResources = async () => {
      try {
        const [departmentsRes, doctorsRes] = await Promise.all([
          resourcesApi.getDepartments(),
          resourcesApi.getDoctors(),
        ]);

        if (departmentsRes.success) {
          setDepartments(departmentsRes.departments);
        }

        if (doctorsRes.success) {
          setDoctors(doctorsRes.doctors);
        }
      } catch (error) {
        console.error('Failed to load resources:', error);
      }
    };

    loadResources();
  }, []);

  // Load all doctors independently - no department filtering
  // Doctors and departments are independent filters

  // Create stable, serializable query keys from the start and end dates
  const fromDate = startDate ? format(startDate, 'yyyy-MM-dd') : null;
  const toDate = endDate ? format(endDate, 'yyyy-MM-dd') : null;

  const { data, isLoading, error } = useQuery({
    // Use the formatted date strings in the queryKey for stability
    queryKey: ['caseNoteTracking', caseNoteType, fromDate, toDate, selectedDepartmentId, selectedDoctorId],
    queryFn: async () => {
      // The query is disabled if dates are missing, so we can safely assert they exist here
      if (!fromDate || !toDate) return [];

      try {
        const response = await requestsApi.getCaseNoteTracking({
          type: caseNoteType,
          start_date: fromDate,
          end_date: toDate,
          department_id: selectedDepartmentId,
          doctor_id: selectedDoctorId,
        });
        return (response.data || []) as CaseNoteRecord[];
      } catch (err) {
        console.error('Failed to fetch case note tracking data:', err);
        throw new Error('Failed to fetch tracking data. Please try again.');
      }
    },
    // The query will only run if both fromDate and toDate are set
    enabled: !!fromDate && !!toDate,
  });

  const handleExport = async () => {
    if (!fromDate || !toDate) return;

    try {
      const blob = await requestsApi.exportCaseNoteTracking({
        type: caseNoteType,
        start_date: fromDate,
        end_date: toDate,
        department_id: selectedDepartmentId,
        doctor_id: selectedDoctorId,
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');

      // Get current date for filename
      const currentDate = format(new Date(), 'yyyy-MM-dd');
      const fileName = `case-note-tracking-${caseNoteType}-${currentDate}.xlsx`;

      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  const handleGeneratePdf = async () => {
    if (!fromDate || !toDate) return;

    try {
      const blob = await requestsApi.generateCaseNoteTrackingPdf({
        type: caseNoteType,
        start_date: fromDate,
        end_date: toDate,
        department_id: selectedDepartmentId,
        doctor_id: selectedDoctorId,
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');

      // Get current date for filename
      const currentDate = format(new Date(), 'yyyy-MM-dd');
      const fileName = `case-note-tracking-${caseNoteType}-${currentDate}.pdf`;

      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Case Note Tracking</h1>
          <p className="text-gray-600 mt-1">
            Track case note {caseNoteType === 'in' ? 'returns' : 'requests'} activity
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isLoading}
            className="flex items-center space-x-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Export</span>
          </Button>

          <Button
            size="sm"
            onClick={handleGeneratePdf}
            disabled={isLoading}
            className="flex items-center space-x-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">PDF</span>
          </Button>
        </div>
      </div>
      {/* Filters Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>
            Filter case note tracking by type, date range, department, and doctor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Filters Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Case Note Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Type</label>
                <Select value={caseNoteType} onValueChange={(value: CaseNoteType) => setCaseNoteType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">Case Note Returns</SelectItem>
                    <SelectItem value="out">Case Note Requests</SelectItem>
                    <SelectItem value="filling">Request Filling</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Start Date */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Start Date</label>
                <DatePicker
                  date={startDate}
                  onDateChange={onStartDateChange}
                  placeholder="Select start date"
                />
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">End Date</label>
                <DatePicker
                  date={endDate}
                  onDateChange={onEndDateChange}
                  placeholder="Select end date"
                />
              </div>

              {/* Department Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Department</label>
                <Select
                  value={selectedDepartmentId?.toString() || "all"}
                  onValueChange={(value) => setSelectedDepartmentId(value === "all" ? undefined : parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Doctor Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Doctor</label>
                <Select
                  value={selectedDoctorId?.toString() || "all"}
                  onValueChange={(value) => setSelectedDoctorId(value === "all" ? undefined : parseInt(value))}
                  disabled={caseNoteType === 'in'}
                >
                  <SelectTrigger disabled={caseNoteType === 'in'}>
                    <SelectValue placeholder="All doctors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Doctors</SelectItem>
                    {doctors.map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.id.toString()}>
                        {doctor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {caseNoteType === 'in' && (
                  <p className="text-xs text-amber-600">
                    Doctor filter not available for returns
                  </p>
                )}
              </div>
            </div>

            {/* Active Filters Summary */}
            {(selectedDepartmentId || selectedDoctorId) && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-700">Active filters:</span>
                  {selectedDepartmentId && (
                    <Badge variant="secondary">
                      <Building2 className="h-3 w-3 mr-1" />
                      {departments.find(d => d.id === selectedDepartmentId)?.name}
                    </Badge>
                  )}
                  {selectedDoctorId && (
                    <Badge variant="secondary">
                      <UserCheck className="h-3 w-3 mr-1" />
                      {doctors.find(d => d.id === selectedDoctorId)?.name}
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedDepartmentId(undefined);
                    setSelectedDoctorId(undefined);
                  }}
                >
                  Clear filters
                </Button>
              </div>
            )}

            {/* Results Summary */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  Showing {caseNoteType === 'in' ? 'case note returns' : 'case note requests'}
                  {data && data.length > 0 && (
                    <span className="font-medium ml-1">({data.length} {data.length === 1 ? 'record' : 'records'})</span>
                  )}
                </div>
                {fromDate && toDate && (
                  <div className="text-sm text-gray-500">
                    {format(new Date(fromDate), 'MMM d')} - {format(new Date(toDate), 'MMM d, yyyy')}
                  </div>
                )}
              </div>

              {isLoading && (
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading data...</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <div ref={printRef}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  {caseNoteType === 'filling' ? (
                    <>
                      <TableHead>Filling Number</TableHead>
                      <TableHead>CA Who Submitted</TableHead>
                      <TableHead>Patient Name</TableHead>
                      <TableHead>Patient MRN</TableHead>
                      <TableHead>Case Note Description</TableHead>
                      <TableHead>Date Created</TableHead>
                      <TableHead>Approved Date</TableHead>
                      <TableHead>Approved By</TableHead>
                      <TableHead>Approval Notes</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead>Date</TableHead>
                      <TableHead>Request No.</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Department</TableHead>
                      {caseNoteType === 'out' && <TableHead>Doctor</TableHead>}
                      <TableHead>{caseNoteType === 'in' ? 'Returned By' : 'Requested By'}</TableHead>
                      {caseNoteType === 'out' && <TableHead>Date Returned</TableHead>}
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={caseNoteType === 'filling' ? 10 : caseNoteType === 'out' ? 8 : 6} className="text-center py-12">
                      <div className="flex flex-col items-center space-y-2">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                        <p className="text-sm text-gray-600">Loading case notes...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={caseNoteType === 'filling' ? 10 : caseNoteType === 'out' ? 8 : 6} className="text-center py-12">
                      <Alert className="max-w-md mx-auto">
                        <AlertDescription>
                          Error loading case notes. Please try again.
                        </AlertDescription>
                      </Alert>
                    </TableCell>
                  </TableRow>
                ) : data && data.length > 0 ? (
                  data.map((record, index) => {
                    // Check if this is a case note request that hasn't been returned
                    const isNotReturned = caseNoteType === 'out' && !record.is_returned;

                    return (
                      <TableRow
                        key={record.id}
                        className={isNotReturned ? "bg-red-50 hover:bg-red-100" : ""}
                      >
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        {caseNoteType === 'filling' ? (
                          <>
                            <TableCell className="font-mono text-sm">{record.filling_number || record.request_number}</TableCell>
                            <TableCell>{record.submitted_by || record.requested_by}</TableCell>
                            <TableCell className="font-medium">{record.patient_name}</TableCell>
                            <TableCell className="text-sm text-gray-500">{record.mrn}</TableCell>
                            <TableCell>{record.description || record.purpose || 'N/A'}</TableCell>
                            <TableCell>{format(new Date(record.created_at || record.requested_at), 'MMM d, yyyy')}</TableCell>
                            <TableCell>
                              {record.approved_at ? format(new Date(record.approved_at), 'MMM d, yyyy') : 'N/A'}
                            </TableCell>
                            <TableCell>{record.approved_by || 'N/A'}</TableCell>
                            <TableCell>{record.approval_notes || 'N/A'}</TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell>{format(new Date(record.requested_at), 'MMM d, yyyy')}</TableCell>
                            <TableCell className="font-mono text-sm">{record.request_number}</TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{record.patient_name}</div>
                                <div className="text-sm text-gray-500">{record.mrn}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{record.department_name}</Badge>
                            </TableCell>
                            {caseNoteType === 'out' && (
                              <TableCell>{record.doctor_name || 'N/A'}</TableCell>
                            )}
                            <TableCell>{record.requested_by}</TableCell>
                            {caseNoteType === 'out' && (
                              <TableCell>
                                {record.returned_at ? (
                                  <div>
                                    <div className="text-sm">{format(new Date(record.returned_at), 'MMM d, yyyy')}</div>
                                    {record.returned_by && (
                                      <div className="text-xs text-gray-500">by {record.returned_by}</div>
                                    )}
                                  </div>
                                ) : (
                                  <Badge variant="destructive" className="text-xs">
                                    Not Returned
                                  </Badge>
                                )}
                              </TableCell>
                            )}
                          </>
                        )}
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={caseNoteType === 'filling' ? 10 : caseNoteType === 'out' ? 8 : 6} className="text-center py-12">
                      <div className="flex flex-col items-center space-y-2">
                        <FileText className="h-6 w-6 text-gray-400" />
                        <p className="text-sm text-gray-600">No case notes found</p>
                        <p className="text-xs text-gray-500">Try adjusting your filters or date range</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
