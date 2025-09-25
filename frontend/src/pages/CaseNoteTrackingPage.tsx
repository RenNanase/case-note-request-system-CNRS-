import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { Download, Loader2, Printer, FileText } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { DatePicker } from '@/components/ui/date-picker';
import { requestsApi } from '@/api/requests';

type CaseNoteType = 'in' | 'out';
interface CaseNoteRecord {
  [key: string]: any; // Allow any other properties
}

export default function CaseNoteTrackingPage() {
  const [caseNoteType, setCaseNoteType] = useState<CaseNoteType>('in');
  const [startDate, setStartDate] = useState<Date | undefined>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());

  const printRef = useRef<HTMLDivElement>(null);

  // Create stable, serializable query keys from the start and end dates
  const fromDate = startDate ? format(startDate, 'yyyy-MM-dd') : null;
  const toDate = endDate ? format(endDate, 'yyyy-MM-dd') : null;

  const { data, isLoading, error } = useQuery({
    // Use the formatted date strings in the queryKey for stability
    queryKey: ['caseNoteTracking', caseNoteType, fromDate, toDate],
    queryFn: async () => {
      // The query is disabled if dates are missing, so we can safely assert they exist here
      if (!fromDate || !toDate) return [];

      try {
        const response = await requestsApi.getCaseNoteTracking({
          type: caseNoteType,
          start_date: fromDate,
          end_date: toDate,
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

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    pageStyle: `
      @page { size: auto; margin: 15mm; }
      @media print {
        body { -webkit-print-color-adjust: exact; }
        .no-print { display: none !important; }
        .print-table { width: 100%; border-collapse: collapse; }
        .print-table th, .print-table td { border: 1px solid #e2e8f0; padding: 8px 12px; }
        .print-table th { background-color: #f1f5f9; }
      }
    `,
  });

  const handleExport = async () => {
    if (!fromDate || !toDate) return;

    try {
      const blob = await requestsApi.exportCaseNoteTracking({
        type: caseNoteType,
        start_date: fromDate,
        end_date: toDate
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const fileName = `case-note-tracking-${caseNoteType}-${format(new Date(), 'yyyyMMdd')}.xlsx`;

      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
      // You might want to show a toast notification here
    }
  };

  const handleGeneratePdf = async () => {
    if (!fromDate || !toDate) return;

    try {
      const blob = await requestsApi.generateCaseNoteTrackingPdf({
        type: caseNoteType,
        start_date: fromDate,
        end_date: toDate
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const typeLabel = caseNoteType === 'in' ? 'In' : 'Out';
      const fileName = `Case_Note_Tracking_${typeLabel}_${format(new Date(fromDate), 'yyyyMMdd')}_to_${format(new Date(toDate), 'yyyyMMdd')}_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;

      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
      // You might want to show a toast notification here
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Case Note Tracking</h2>
          <p className="text-sm text-muted-foreground">
            Track all case note {caseNoteType === 'in' ? 'in' : 'out'} activities within the selected date range.
          </p>
        </div>
        <div className="flex items-center space-x-2">

          <Button variant="outline" onClick={handleGeneratePdf} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
            Generate PDF
          </Button>
          
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Case Note Tracking</CardTitle>
              <CardDescription>
                View and track case note {caseNoteType === 'in' ? 'returns' : 'requests'} within the selected date range.
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <Select value={caseNoteType} onValueChange={(value: CaseNoteType) => setCaseNoteType(value)}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Select case note type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">Case Note In (Returns)</SelectItem>
                  <SelectItem value="out">Case Note Out (Requests)</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                <DatePicker
                  date={startDate}
                  onDateChange={setStartDate}
                  label="Start Date"
                  placeholder="Select start date"
                />
                <DatePicker
                  date={endDate}
                  onDateChange={setEndDate}
                  label="End Date"
                  placeholder="Select end date"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border" ref={printRef}>
            <div className="p-4 print:hidden">
              <h3 className="text-lg font-medium">
                Case Note {caseNoteType === 'in' ? 'In (Returns)' : 'Out (Requests)'}
              </h3>
              {fromDate && toDate && (
                <p className="text-sm text-muted-foreground">
                  {format(new Date(fromDate), 'MMM d, yyyy')} - {format(new Date(toDate), 'MMM d, yyyy')}
                </p>
              )}
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Request No.</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>{caseNoteType === 'in' ? 'Returned By' : 'Requested By'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">Loading case notes...</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : error ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-destructive">
                        Error loading case notes. Please try again.
                      </TableCell>
                    </TableRow>
                  ) : data && data.length > 0 ? (
                    data.map((record, index) => (
                      <TableRow key={record.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{format(new Date(record.requested_at), 'MMM d, yyyy')}</TableCell>
                        <TableCell>{record.request_number}</TableCell>
                        <TableCell className="font-medium">{record.patient_name} ({record.mrn})</TableCell>
                        <TableCell>{record.department_name}</TableCell>
                        <TableCell>{record.requested_by}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No case notes found for the selected criteria.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                <TableCaption>
                  A list of case notes {caseNoteType === 'in' ? 'returned to' : 'requested from'} the medical records department.
                </TableCaption>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
