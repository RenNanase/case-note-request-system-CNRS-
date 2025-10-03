<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use Carbon\Carbon;
use App\Models\Request as CaseNoteRequest;

class CaseNoteTrackingExport implements FromCollection, WithHeadings, WithMapping, ShouldAutoSize, WithStyles
{
    protected $type;
    protected $startDate;
    protected $endDate;

    protected $departmentId;
    protected $doctorId;

    public function __construct($type, $startDate, $endDate, $departmentId = null, $doctorId = null)
    {
        $this->type = $type;
        $this->startDate = $startDate;
        $this->endDate = $endDate;
        $this->departmentId = $departmentId;
        $this->doctorId = $doctorId;
    }

    public function collection()
    {
        $startDate = Carbon::parse($this->startDate)->startOfDay();
        $endDate = Carbon::parse($this->endDate)->endOfDay();

        if ($this->type === 'in') {
            // Case Note In - filter strictly by returned date range
            $query = CaseNoteRequest::with(['patient', 'requestedBy', 'department'])
                ->where(function ($q) use ($startDate, $endDate) {
                    $q->whereBetween('returned_at', [$startDate, $endDate])
                      ->orWhereHas('events', function ($e) use ($startDate, $endDate) {
                          $e->where('type', 'returned')
                            ->whereBetween('occurred_at', [$startDate, $endDate]);
                      });
                });

            if ($this->departmentId) {
                $query->where('department_id', $this->departmentId);
            }

            $query->orderByRaw('COALESCE(returned_at, created_at) desc');
        } elseif ($this->type === 'filling') {
            // Request Filling - Flatten to one row per patient
            $filingRequests = \App\Models\FilingRequest::with(['submittedBy', 'approvedBy'])
                ->whereBetween('created_at', [$startDate, $endDate])
                ->where('status', 'approved')
                ->orderBy('created_at', 'desc')
                ->get();

            $rows = collect();

            foreach ($filingRequests as $fr) {
                $patients = $fr->getPatients();

                if ($patients->isEmpty()) {
                    // Include a single row with N/A if no patients associated
                    $rows->push([
                        'filing_number' => $fr->filing_number,
                        'submitted_by' => optional($fr->submittedBy)->name ?? 'N/A',
                        'patient_name' => 'N/A',
                        'patient_mrn' => 'N/A',
                        'case_note_description' => $fr->case_note_description ?: 'N/A',
                        'created_at' => $fr->created_at,
                        'approved_at' => $fr->approved_at,
                        'approved_by' => optional($fr->approvedBy)->name ?? 'N/A',
                        'approval_notes' => $fr->approval_notes ?: 'N/A',
                        'status' => ucfirst($fr->status),
                    ]);
                    continue;
                }

                foreach ($patients as $patient) {
                    $rows->push([
                        'filing_number' => $fr->filing_number,
                        'submitted_by' => optional($fr->submittedBy)->name ?? 'N/A',
                        'patient_name' => $patient->name ?? 'N/A',
                        'patient_mrn' => $patient->mrn ?? 'N/A',
                        'case_note_description' => $fr->case_note_description ?: 'N/A',
                        'created_at' => $fr->created_at,
                        'approved_at' => $fr->approved_at,
                        'approved_by' => optional($fr->approvedBy)->name ?? 'N/A',
                        'approval_notes' => $fr->approval_notes ?: 'N/A',
                        'status' => ucfirst($fr->status),
                    ]);
                }
            }

            return $rows;
        } else {
            // Case Note Out - Successfully requested and approved case notes
            // Filter by approval date, not creation date
            $query = CaseNoteRequest::with(['patient', 'requestedBy', 'department', 'doctor', 'returnedBy'])
                ->whereHas('events', function ($q) use ($startDate, $endDate) {
                    $q->where('type', 'approved')
                      ->whereBetween('occurred_at', [$startDate, $endDate]);
                })
                ->where(function($q) {
                    $q->where('status', 'approved')
                      ->orWhere('status', 'completed');
                });

            // Apply department filter for case note out
            if ($this->departmentId) {
                $query->where('department_id', $this->departmentId);
            }

            // Apply doctor filter for case note out
            if ($this->doctorId) {
                $query->where('doctor_id', $this->doctorId);
            }

            $query->orderBy('created_at', 'desc');
        }

        return $query->get();
    }

    public function headings(): array
    {
        if ($this->type === 'filling') {
            $typeLabel = 'Request Filling';
            $headings = [
                '#',
                'Filling Number',
                'CA Who Submitted',
                'Patient Name',
                'Patient MRN',
                'Case Note Description',
                'Date Created',
                'Approved Date',
                'Approved By',
                'Approval Notes',
                'Status'
            ];
        } else {
            $typeLabel = $this->type === 'in' ? 'In (Returns)' : 'Out (Requests)';
            $headings = [
                '#',
                'Patient Name',
                'MRN',
                'Request Number',
                'Department',
                'Requested By',
                $this->type === 'in' ? 'Date Returned' : 'Date Requested',
                'Status'
            ];

            if ($this->type === 'out') {
                $headings[] = 'Doctor';
                $headings[] = 'Date Returned';
                $headings[] = 'Returned By';
            }
        }

        return [
            ['Case Note ' . $typeLabel . ' - ' . $this->startDate . ' to ' . $this->endDate],
            [], // Empty row for spacing
            $headings
        ];
    }

    public function map($item): array
    {
        static $rowNumber = 0;
        $rowNumber++;

        if ($this->type === 'filling') {
            // Handle flattened rows
            if (is_array($item)) {
                return [
                    $rowNumber,
                    $item['filing_number'] ?? 'N/A',
                    $item['submitted_by'] ?? 'N/A',
                    $item['patient_name'] ?? 'N/A',
                    $item['patient_mrn'] ?? 'N/A',
                    $item['case_note_description'] ?? 'N/A',
                    isset($item['created_at']) && $item['created_at'] ? \Carbon\Carbon::parse($item['created_at'])->format('M d, Y h:i A') : 'N/A',
                    isset($item['approved_at']) && $item['approved_at'] ? \Carbon\Carbon::parse($item['approved_at'])->format('M d, Y h:i A') : 'N/A',
                    $item['approved_by'] ?? 'N/A',
                    $item['approval_notes'] ?? 'N/A',
                    $item['status'] ?? 'N/A',
                ];
            }

            // Fallback (should not occur after flattening)
            return [
                $rowNumber,
                'N/A','N/A','N/A','N/A','N/A','N/A','N/A','N/A','N/A','N/A'
            ];
        }

        // Handle CaseNoteRequest data for 'in' and 'out' types
        $caseNote = $item;
        $event = null;

        if ($this->type === 'in') {
            // Get the return event
            $event = $caseNote->events()
                ->where('type', 'returned')
                ->where('reason', 'like', '%returned%')
                ->latest()
                ->first();

            $activityDate = $event ? $event->occurred_at : $caseNote->created_at;
            $userName = $event ? $event->actor->name : $caseNote->requestedBy->name;
        } else {
            // For case note out, use the original request details
            $activityDate = $caseNote->created_at;
            $userName = $caseNote->requestedBy->name;

            // Find the approval event if available
            $approvalEvent = $caseNote->events()
                ->where('type', 'approved')
                ->latest()
                ->first();

            if ($approvalEvent) {
                $activityDate = $approvalEvent->occurred_at;
            }
        }

        $result = [
            $rowNumber,
            $caseNote->patient ? $caseNote->patient->name : 'N/A',
            $caseNote->patient ? $caseNote->patient->mrn : 'N/A',
            $caseNote->request_number,
            $caseNote->department ? $caseNote->department->name : 'N/A',
            $userName,
            $activityDate->format('M d, Y h:i A'),
            ucfirst($caseNote->status)
        ];

        // Add doctor name and return info for case note out
        if ($this->type === 'out') {
            $result[] = $caseNote->doctor ? $caseNote->doctor->name : 'N/A';

            // Check if case note has been returned (either through is_returned flag or return event)
            $returnEvent = $caseNote->events()
                ->where('type', 'returned')
                ->latest()
                ->first();

            $isReturned = $caseNote->is_returned || $returnEvent || $caseNote->status === 'completed';

            if ($isReturned) {
                // Use returned_at if available, otherwise use return event date, otherwise use completed_at
                if ($caseNote->returned_at) {
                    $result[] = $caseNote->returned_at->format('M d, Y h:i A');
                    $result[] = $caseNote->returnedBy ? $caseNote->returnedBy->name : 'N/A';
                } elseif ($returnEvent) {
                    $result[] = $returnEvent->occurred_at->format('M d, Y h:i A');
                    $result[] = $returnEvent->actor ? $returnEvent->actor->name : 'N/A';
                } elseif ($caseNote->status === 'completed' && $caseNote->completed_at) {
                    $result[] = $caseNote->completed_at->format('M d, Y h:i A');
                    $result[] = $caseNote->completedBy ? $caseNote->completedBy->name : 'MR Staff';
                } else {
                    $result[] = 'Not Returned';
                    $result[] = 'N/A';
                }
            } else {
                $result[] = 'Not Returned';
                $result[] = 'N/A';
            }
        }

        return $result;
    }

    public function styles(Worksheet $sheet)
    {
        $lastRow = $sheet->getHighestRow();
        $lastCol = $this->type === 'filling' ? 'K' : ($this->type === 'out' ? 'K' : 'H'); // K for filling (11 columns), K for out (11 columns), H for in (8 columns)

        // Title row
        $sheet->mergeCells('A1:' . $lastCol . '1');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);
        $sheet->getStyle('A1')->getAlignment()->setHorizontal('center');

        // Header row
        $headerRange = 'A3:' . $lastCol . '3';
        $sheet->getStyle($headerRange)->applyFromArray([
            'font' => ['bold' => true],
            'fill' => [
                'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                'startColor' => ['argb' => 'FFD9D9D9'],
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN,
                ],
            ],
        ]);

        // Data rows
        if ($lastRow > 3) {
            $dataRange = 'A4:' . $lastCol . $lastRow;
            $sheet->getStyle($dataRange)->applyFromArray([
                'borders' => [
                    'allBorders' => [
                        'borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN,
                    ],
                ],
            ]);

            // Auto-size all columns
            $colRange = $this->type === 'filling' ? range('A', 'K') : ($this->type === 'out' ? range('A', 'K') : range('A', 'H'));
            foreach ($colRange as $col) {
                $sheet->getColumnDimension($col)->setAutoSize(true);
            }

            // Set wrap text for longer content
            $sheet->getStyle($dataRange)->getAlignment()->setWrapText(true);

            // Add red highlighting for not returned case notes (for type 'out')
            if ($this->type === 'out') {
                for ($row = 4; $row <= $lastRow; $row++) {
                    $returnedDateCell = 'J' . $row; // Column J is "Date Returned"
                    $returnedDateValue = $sheet->getCell($returnedDateCell)->getValue();

                    if ($returnedDateValue === 'Not Returned') {
                        $rowRange = 'A' . $row . ':' . $lastCol . $row;
                        $sheet->getStyle($rowRange)->applyFromArray([
                            'fill' => [
                                'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                                'startColor' => ['argb' => 'FFFFE6E6'], // Light red background
                            ],
                        ]);
                    }
                }
            }
        }

        // Set print settings
        $sheet->getPageSetup()->setOrientation(\PhpOffice\PhpSpreadsheet\Worksheet\PageSetup::ORIENTATION_LANDSCAPE);
        $sheet->getPageSetup()->setFitToWidth(1);
        $sheet->getPageSetup()->setFitToHeight(0);

        // Set print area
        $sheet->getPageSetup()->setPrintArea('A1:' . $lastCol . $lastRow);

        // Repeat header row on each page
        $sheet->getPageSetup()->setRowsToRepeatAtTopByStartAndEnd(1, 3);
    }
}
