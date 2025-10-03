<?php

namespace App\Services;

use App\Models\Request as CaseNoteRequest;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;

class ReturnedCaseNotesPdfService
{
    /**
     * Generate PDF of returned case notes grouped for a specific CA (returned_by_user_id)
     *
     * @param int $caId
     * @param array<int> $caseNoteIds
     * @return \Barryvdh\DomPDF\PDF
     * @throws \Exception
     */
    public function generateReturnedCaseNotesPdf(int $caId, array $caseNoteIds = []): \Barryvdh\DomPDF\PDF
    {
        $ca = User::find($caId);
        if (!$ca) {
            throw new \Exception('CA not found');
        }

        $query = CaseNoteRequest::with(['patient', 'department', 'doctor', 'returnedBy'])
            ->where('returned_by_user_id', $caId)
            ->where(function($q) {
                $q->where('status', CaseNoteRequest::STATUS_PENDING_RETURN_VERIFICATION)
                  ->orWhere('status', CaseNoteRequest::STATUS_APPROVED)
                  ->orWhere('status', CaseNoteRequest::STATUS_IN_PROGRESS);
            })
            ->where(function($q) {
                $q->where('is_returned', true)
                  ->orWhereHas('events', function($e) { $e->where('type', 'returned'); });
            })
            ->where('status', '!=', CaseNoteRequest::STATUS_COMPLETED)
            ->orderBy('returned_at', 'desc');

        if (!empty($caseNoteIds)) {
            $query->whereIn('id', $caseNoteIds);
        }

        $caseNotes = $query->get();

        if ($caseNotes->isEmpty()) {
            throw new \Exception('No returned case notes found for this CA');
        }

        $data = [
            'ca_name' => $ca->name,
            'ca_email' => $ca->email,
            'generation_date' => now()->format('F j, Y'),
            'generation_time' => now()->format('g:i A'),
            'case_notes' => $caseNotes,
            'total_count' => $caseNotes->count(),
        ];

        $pdf = Pdf::loadView('pdf.returned-case-notes', $data);
        $pdf->setPaper('A4', 'portrait');
        $pdf->setOptions([
            'isHtml5ParserEnabled' => true,
            'isRemoteEnabled' => true,
            'defaultFont' => 'Arial',
        ]);

        return $pdf;
    }

    public function generateFilename(string $caName): string
    {
        $safeName = preg_replace('/[^a-zA-Z0-9_-]/', '_', $caName);
        $date = now()->format('Y-m-d');
        return "Returned_Case_Notes_{$safeName}_{$date}.pdf";
    }
}


