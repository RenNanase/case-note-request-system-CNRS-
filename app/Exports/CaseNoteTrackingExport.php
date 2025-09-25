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

    public function __construct($type, $startDate, $endDate)
    {
        $this->type = $type;
        $this->startDate = $startDate;
        $this->endDate = $endDate;
    }

    public function collection()
    {
        $startDate = Carbon::parse($this->startDate)->startOfDay();
        $endDate = Carbon::parse($this->endDate)->endOfDay();

        $query = CaseNoteRequest::with(['patient', 'requestedBy', 'histories'])
            ->whereBetween('created_at', [$startDate, $endDate]);

        if ($this->type === 'in') {
            $query->whereHas('histories', function ($q) {
                $q->where('status', 'returned')
                  ->where('action', 'completed');
            });
        } else {
            $query->where(function($q) {
                $q->where('status', 'approved')
                  ->orWhere('status', 'completed');
            });
        }

        return $query->orderBy('created_at', 'desc')->get();
    }

    public function headings(): array
    {
        $typeLabel = $this->type === 'in' ? 'In (Returns)' : 'Out (Requests)';
        
        return [
            ['Case Note ' . $typeLabel . ' - ' . $this->startDate . ' to ' . $this->endDate],
            [], // Empty row for spacing
            [
                '#',
                'Patient Name',
                'MRN',
                'Request Number',
                'Requested By',
                $this->type === 'in' ? 'Date Returned' : 'Date Requested',
                'Status'
            ]
        ];
    }

    public function map($caseNote): array
    {
        static $rowNumber = 0;
        $rowNumber++;

        if ($this->type === 'in') {
            $history = $caseNote->histories
                ->where('status', 'returned')
                ->where('action', 'completed')
                ->sortByDesc('created_at')
                ->first();
            
            $requestedAt = $history ? $history->created_at : $caseNote->created_at;
            $requestedBy = $history ? $history->user : $caseNote->requestedBy;
        } else {
            $requestedAt = $caseNote->created_at;
            $requestedBy = $caseNote->requestedBy;
            
            $approvalHistory = $caseNote->histories
                ->where('status', 'approved')
                ->sortByDesc('created_at')
                ->first();
            
            if ($approvalHistory) {
                $requestedAt = $approvalHistory->created_at;
            }
        }

        return [
            $rowNumber,
            $caseNote->patient ? $caseNote->patient->name : 'N/A',
            $caseNote->patient ? $caseNote->patient->mrn : 'N/A',
            $caseNote->request_number,
            $requestedBy ? $requestedBy->name : 'System',
            $requestedAt->format('M d, Y h:i A'),
            ucfirst($caseNote->status)
        ];
    }

    public function styles(Worksheet $sheet)
    {
        $lastRow = $sheet->getHighestRow();
        
        // Title row
        $sheet->mergeCells('A1:G1');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);
        $sheet->getStyle('A1')->getAlignment()->setHorizontal('center');
        
        // Header row
        $sheet->getStyle('A3:G3')->applyFromArray([
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
            $dataRange = 'A4:G' . $lastRow;
            $sheet->getStyle($dataRange)->applyFromArray([
                'borders' => [
                    'allBorders' => [
                        'borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN,
                    ],
                ],
            ]);
            
            // Auto-size all columns
            foreach (range('A', 'G') as $col) {
                $sheet->getColumnDimension($col)->setAutoSize(true);
            }
            
            // Set wrap text for longer content
            $sheet->getStyle($dataRange)->getAlignment()->setWrapText(true);
        }
        
        // Set print settings
        $sheet->getPageSetup()->setOrientation(\PhpOffice\PhpSpreadsheet\Worksheet\PageSetup::ORIENTATION_LANDSCAPE);
        $sheet->getPageSetup()->setFitToWidth(1);
        $sheet->getPageSetup()->setFitToHeight(0);
        
        // Set print area
        $sheet->getPageSetup()->setPrintArea('A1:G' . $lastRow);
        
        // Repeat header row on each page
        $sheet->getPageSetup()->setRowsToRepeatAtTopByStartAndEnd(1, 3);
    }
}
