<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Request as CaseNoteRequest;
use App\Models\RequestEvent;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\CaseNoteTrackingExport;
use App\Services\CaseNotePdfService;

class CaseNoteTrackingController extends Controller
{
    /**
     * Get case note tracking data
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Request $request)
    {
        $request->validate([
            'type' => 'required|in:in,out',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
        ]);

        $type = $request->input('type');
        $startDate = Carbon::parse($request->input('start_date'))->startOfDay();
        $endDate = Carbon::parse($request->input('end_date'))->endOfDay();

        if ($type === 'in') {
            // Case Note In - Successfully returned case notes
            $query = CaseNoteRequest::with(['patient', 'requestedBy', 'department'])
                ->whereBetween('created_at', [$startDate, $endDate])
                ->whereHas('events', function ($q) {
                    $q->where('type', 'returned')
                      ->where('reason', 'like', '%returned%');
                })
                ->orderBy('created_at', 'desc');
        } else {
            // Case Note Out - Successfully requested and approved case notes
            // Filter by approval date, not creation date
            $query = CaseNoteRequest::with(['patient', 'requestedBy', 'department'])
                ->whereHas('events', function ($q) use ($startDate, $endDate) {
                    $q->where('type', 'approved')
                      ->whereBetween('occurred_at', [$startDate, $endDate]);
                })
                ->where(function($q) {
                    $q->where('status', 'approved')
                      ->orWhere('status', 'completed');
                })
                ->orderBy('created_at', 'desc');
        }

        $caseNotes = $query->get()->map(function ($caseNote) use ($type) {
            $event = null;

            if ($type === 'in') {
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

            return [
                'id' => $caseNote->id,
                'requested_at' => $activityDate->toDateTimeString(),
                'patient_name' => $caseNote->patient ? $caseNote->patient->name : 'N/A',
                'mrn' => $caseNote->patient ? $caseNote->patient->mrn : 'N/A',
                'request_number' => $caseNote->request_number,
                'department_name' => $caseNote->department ? $caseNote->department->name : 'N/A',
                'requested_by' => $userName,
                'status' => $caseNote->status,
                'type' => $type,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $caseNotes,
            'message' => 'Case note tracking data retrieved successfully'
        ]);
    }

    /**
     * Export case note tracking data to Excel
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Symfony\Component\HttpFoundation\BinaryFileResponse
     */
    public function export(Request $request)
    {
        $request->validate([
            'type' => 'required|in:in,out',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
        ]);

        $type = $request->input('type');
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        $fileName = 'case-note-tracking-' . $type . '-' . now()->format('YmdHis') . '.xlsx';

        return Excel::download(
            new CaseNoteTrackingExport($type, $startDate, $endDate),
            $fileName
        );
    }

    /**
     * Generate PDF for case note tracking audit report
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function generatePdf(Request $request)
    {
        $request->validate([
            'type' => 'required|in:in,out',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
        ]);

        $type = $request->input('type');
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        // Get the same data as the index method
        $startDateCarbon = Carbon::parse($startDate)->startOfDay();
        $endDateCarbon = Carbon::parse($endDate)->endOfDay();

        if ($type === 'in') {
            // Case Note In - Successfully returned case notes
            $query = CaseNoteRequest::with(['patient', 'requestedBy', 'department'])
                ->whereBetween('created_at', [$startDateCarbon, $endDateCarbon])
                ->whereHas('events', function ($q) {
                    $q->where('type', 'returned')
                      ->where('reason', 'like', '%returned%');
                })
                ->orderBy('created_at', 'desc');
        } else {
            // Case Note Out - Successfully requested and approved case notes
            // Filter by approval date, not creation date
            $query = CaseNoteRequest::with(['patient', 'requestedBy', 'department'])
                ->whereHas('events', function ($q) use ($startDateCarbon, $endDateCarbon) {
                    $q->where('type', 'approved')
                      ->whereBetween('occurred_at', [$startDateCarbon, $endDateCarbon]);
                })
                ->where(function($q) {
                    $q->where('status', 'approved')
                      ->orWhere('status', 'completed');
                })
                ->orderBy('created_at', 'desc');
        }

        $caseNotes = $query->get()->map(function ($caseNote) use ($type) {
            $event = null;

            if ($type === 'in') {
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

            return [
                'id' => $caseNote->id,
                'requested_at' => $activityDate->toDateTimeString(),
                'patient_name' => $caseNote->patient ? $caseNote->patient->name : 'N/A',
                'mrn' => $caseNote->patient ? $caseNote->patient->mrn : 'N/A',
                'request_number' => $caseNote->request_number,
                'department_name' => $caseNote->department ? $caseNote->department->name : 'N/A',
                'requested_by' => $userName,
                'status' => $caseNote->status,
                'type' => $type,
            ];
        })->toArray();

        // Get current user name for the report
        $generatedBy = $request->user() ? $request->user()->name : 'System';

        // Generate PDF
        $pdfService = new CaseNotePdfService();
        $pdf = $pdfService->generateCaseNoteTrackingPdf(
            $caseNotes,
            $type,
            $startDate,
            $endDate,
            $generatedBy
        );

        // Generate filename
        $filename = $pdfService->generateTrackingFilename($type, $startDate, $endDate);

        return $pdf->download($filename);
    }
}
