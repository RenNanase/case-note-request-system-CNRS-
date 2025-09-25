<?php

namespace App\Services;

use App\Models\Request;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Collection;

class CaseNotePdfService
{
    /**
     * Generate PDF for case note requests from a specific CA
     */
    public function generateCaseNoteListPdf(int $caId, array $requestIds = []): \Barryvdh\DomPDF\PDF
    {
        // Get CA information
        $ca = User::find($caId);
        if (!$ca) {
            throw new \Exception('CA not found');
        }

        // Get case note requests
        $query = Request::with(['patient', 'doctor', 'department'])
            ->where('requested_by_user_id', $caId)
            ->where('status', 'pending');

        if (!empty($requestIds)) {
            $query->whereIn('id', $requestIds);
        }

        $requests = $query->orderBy('created_at', 'desc')->get();

        if ($requests->isEmpty()) {
            throw new \Exception('No pending case note requests found for this CA');
        }

        // Prepare data for PDF
        $data = [
            'ca_name' => $ca->name,
            'ca_email' => $ca->email,
            'generation_date' => now()->format('F j, Y'),
            'generation_time' => now()->format('g:i A'),
            'requests' => $requests,
            'total_count' => $requests->count(),
            'doctor_name' => $this->getDoctorName($requests),
            'department_name' => $this->getDepartmentName($requests),
        ];

        // Generate PDF
        $pdf = Pdf::loadView('pdf.case-note-list', $data);

        // Set PDF options
        $pdf->setPaper('A4', 'portrait');
        $pdf->setOptions([
            'isHtml5ParserEnabled' => true,
            'isRemoteEnabled' => true,
            'defaultFont' => 'Arial',
        ]);

        return $pdf;
    }

    /**
     * Get the primary doctor name from requests
     */
    private function getDoctorName(Collection $requests): string
    {
        $doctors = $requests->pluck('doctor.name')->filter()->unique();

        if ($doctors->count() === 1) {
            return $doctors->first();
        } elseif ($doctors->count() > 1) {
            return 'Multiple Doctors';
        }

        return 'No Doctor Specified';
    }

    /**
     * Get the primary department name from requests
     */
    private function getDepartmentName(Collection $requests): string
    {
        $departments = $requests->pluck('department.name')->filter()->unique();

        if ($departments->count() === 1) {
            return $departments->first();
        } elseif ($departments->count() > 1) {
            return 'Multiple Departments';
        }

        return 'No Department Specified';
    }

    /**
     * Generate PDF for case note tracking audit report
     */
    public function generateCaseNoteTrackingPdf(array $caseNotes, string $caseType, string $startDate, string $endDate, string $generatedBy): \Barryvdh\DomPDF\PDF
    {
        // Prepare data for PDF
        $data = [
            'caseNotes' => $caseNotes,
            'caseType' => $caseType,
            'startDate' => $startDate,
            'endDate' => $endDate,
            'generatedBy' => $generatedBy,
            'generatedDate' => now()->format('F j, Y'),
            'generatedTime' => now()->format('g:i A'),
        ];

        // Generate PDF
        $pdf = Pdf::loadView('pdf.case-note-tracking', $data);

        // Set PDF options for professional output
        $pdf->setPaper('A4', 'portrait');
        $pdf->setOptions([
            'isHtml5ParserEnabled' => true,
            'isRemoteEnabled' => true,
            'defaultFont' => 'Helvetica',
            'isPhpEnabled' => true,
            'isJavascriptEnabled' => false,
            'isRemoteEnabled' => true,
        ]);

        return $pdf;
    }

    /**
     * Generate filename for the case note list PDF
     */
    public function generateFilename(int $caId, string $caName): string
    {
        $safeName = preg_replace('/[^a-zA-Z0-9_-]/', '_', $caName);
        $date = now()->format('Y-m-d');
        $timestamp = now()->format('His');

        return "Case_Notes_{$safeName}_{$date}_{$timestamp}.pdf";
    }

    /**
     * Generate filename for the case note tracking PDF
     */
    public function generateTrackingFilename(string $caseType, string $startDate, string $endDate): string
    {
        $typeLabel = $caseType === 'in' ? 'In' : 'Out';
        $start = \Carbon\Carbon::parse($startDate)->format('Ymd');
        $end = \Carbon\Carbon::parse($endDate)->format('Ymd');
        $timestamp = now()->format('Ymd_His');

        return "Case_Note_Tracking_{$typeLabel}_{$start}_to_{$end}_{$timestamp}.pdf";
    }
}
