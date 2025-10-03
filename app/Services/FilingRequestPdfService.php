<?php

namespace App\Services;

use App\Models\FilingRequest;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Collection;

class FilingRequestPdfService
{
    /**
     * Generate PDF for filing requests from a specific CA
     *
     * @param int $caId
     * @param array<int> $filingRequestIds
     * @return \Barryvdh\DomPDF\PDF
     * @throws \Exception
     */
    public function generateFilingRequestListPdf(int $caId, array $filingRequestIds = []): \Barryvdh\DomPDF\PDF
    {
        $ca = User::find($caId);
        if (!$ca) {
            throw new \Exception('CA not found');
        }

        $query = FilingRequest::with(['submittedBy', 'approvedBy'])
            ->where('submitted_by_user_id', $caId)
            ->where('status', 'pending')
            ->orderBy('created_at', 'desc');

        if (!empty($filingRequestIds)) {
            $query->whereIn('id', $filingRequestIds);
        }

        /** @var Collection<int, FilingRequest> $filingRequests */
        $filingRequests = $query->get();

        if ($filingRequests->isEmpty()) {
            throw new \Exception('No pending filing requests found for this CA');
        }

        // Load related data and compute derived fields
        $filingRequests->each(function (FilingRequest $fr) {
            if ($fr->isPatientBased()) {
                $fr->patients = $fr->getPatients();
                $fr->case_notes = null;
            } else {
                $caseNotes = $fr->getCaseNoteRequests();
                $caseNotes->load(['patient', 'doctor', 'department', 'requestedBy']);
                $fr->case_notes = $caseNotes;
                $fr->patients = null;
            }
            $fr->is_patient_based = $fr->isPatientBased();
        });

        $data = [
            'ca_name' => $ca->name,
            'ca_email' => $ca->email,
            'generation_date' => now()->format('F j, Y'),
            'generation_time' => now()->format('g:i A'),
            'filing_requests' => $filingRequests,
            'total_count' => $filingRequests->count(),
        ];

        $pdf = Pdf::loadView('pdf.filing-request-list', $data);
        $pdf->setPaper('A4', 'portrait');
        $pdf->setOptions([
            'isHtml5ParserEnabled' => true,
            'isRemoteEnabled' => true,
            'defaultFont' => 'Arial',
        ]);

        return $pdf;
    }

    public function generateFilename(int $caId, string $caName): string
    {
        $safeName = preg_replace('/[^a-zA-Z0-9_-]/', '_', $caName);
        $date = now()->format('Y-m-d');
        return "Filing_Requests_{$safeName}_{$date}.pdf";
    }
}


