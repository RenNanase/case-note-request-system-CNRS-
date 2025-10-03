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
            'type' => 'required|in:in,out,filling',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'department_id' => 'nullable|integer',
            'doctor_id' => 'nullable|integer',
        ]);

        $type = $request->input('type');
        $startDate = Carbon::parse($request->input('start_date'))->startOfDay();
        $endDate = Carbon::parse($request->input('end_date'))->endOfDay();
        $departmentId = $request->input('department_id');
        $doctorId = $request->input('doctor_id');

        if ($type === 'in') {
            // Case Note In - filter by returned date (returned_at or return event occurred_at)
            $query = CaseNoteRequest::with(['patient', 'requestedBy', 'department'])
                ->where(function ($q) use ($startDate, $endDate) {
                    $q->whereBetween('returned_at', [$startDate, $endDate])
                      ->orWhereHas('events', function ($e) use ($startDate, $endDate) {
                          $e->where('type', 'returned')
                            ->whereBetween('occurred_at', [$startDate, $endDate]);
                      });
                });

            // Apply department filter for case note in
            if ($departmentId) {
                $query->where('department_id', $departmentId);
            }

            $query->orderByRaw('COALESCE(returned_at, created_at) desc');
        } elseif ($type === 'filling') {
            // Request Filling - Filing requests that have been approved
            $query = \App\Models\FilingRequest::with(['submittedBy', 'approvedBy'])
                ->whereBetween('created_at', [$startDate, $endDate])
                ->where('status', 'approved');

            $query->orderBy('created_at', 'desc');
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
            if ($departmentId) {
                $query->where('department_id', $departmentId);
            }

            // Apply doctor filter for case note out
            if ($doctorId) {
                $query->where('doctor_id', $doctorId);
            }

            $query->orderBy('created_at', 'desc');
        }

        $caseNotes = $query->get()->map(function ($item) use ($type) {
            if ($type === 'filling') {
                // Handle FilingRequest data
                $filingRequest = $item;

                // Get patients for this filing request
                $patients = $filingRequest->getPatients();
                $patientNames = $patients->pluck('name')->join(', ');
                $patientMrns = $patients->pluck('mrn')->join(', ');

                return [
                    'id' => $filingRequest->id,
                    'filling_number' => $filingRequest->filing_number,
                    'submitted_by' => $filingRequest->submittedBy ? $filingRequest->submittedBy->name : 'N/A',
                    'patient_name' => $patientNames ?: 'N/A',
                    'mrn' => $patientMrns ?: 'N/A',
                    'description' => $filingRequest->case_note_description ?: 'N/A',
                    'created_at' => $filingRequest->created_at->toDateTimeString(),
                    'approved_at' => $filingRequest->approved_at ? $filingRequest->approved_at->toDateTimeString() : null,
                    'approved_by' => $filingRequest->approvedBy ? $filingRequest->approvedBy->name : null,
                    'approval_notes' => $filingRequest->approval_notes ?: null,
                    'status' => $filingRequest->status,
                    'type' => $type,
                ];
            }

            // Handle CaseNoteRequest data for 'in' and 'out' types
            $caseNote = $item;
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

            $result = [
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

            // Add doctor name for case note out
            if ($type === 'out') {
                $result['doctor_name'] = $caseNote->doctor ? $caseNote->doctor->name : 'N/A';

                // Check if case note has been returned (either through is_returned flag or return event)
                $returnEvent = $caseNote->events()
                    ->where('type', 'returned')
                    ->latest()
                    ->first();

                $isReturned = $caseNote->is_returned || $returnEvent || $caseNote->status === 'completed';

                $result['is_returned'] = $isReturned;

                if ($isReturned) {
                    // Use returned_at if available, otherwise use return event date, otherwise use completed_at
                    if ($caseNote->returned_at) {
                        $result['returned_at'] = $caseNote->returned_at->toDateTimeString();
                        $result['returned_by'] = $caseNote->returnedBy ? $caseNote->returnedBy->name : null;
                    } elseif ($returnEvent) {
                        $result['returned_at'] = $returnEvent->occurred_at->toDateTimeString();
                        $result['returned_by'] = $returnEvent->actor ? $returnEvent->actor->name : null;
                    } elseif ($caseNote->status === 'completed' && $caseNote->completed_at) {
                        $result['returned_at'] = $caseNote->completed_at->toDateTimeString();
                        $result['returned_by'] = $caseNote->completedBy ? $caseNote->completedBy->name : 'MR Staff';
                    } else {
                        $result['returned_at'] = null;
                        $result['returned_by'] = null;
                    }
                } else {
                    $result['returned_at'] = null;
                    $result['returned_by'] = null;
                }
            }

            return $result;
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
            'type' => 'required|in:in,out,filling',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'department_id' => 'nullable|integer',
            'doctor_id' => 'nullable|integer',
        ]);

        $type = $request->input('type');
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        $departmentId = $request->input('department_id');
        $doctorId = $request->input('doctor_id');

        $fileName = 'case-note-tracking-' . $type . '-' . now()->format('YmdHis') . '.xlsx';

        return Excel::download(
            new CaseNoteTrackingExport($type, $startDate, $endDate, $departmentId, $doctorId),
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
            'type' => 'required|in:in,out,filling',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'department_id' => 'nullable|integer',
            'doctor_id' => 'nullable|integer',
        ]);

        $type = $request->input('type');
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        $departmentId = $request->input('department_id');
        $doctorId = $request->input('doctor_id');

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
                });

            // Apply department filter for case note in
            if ($departmentId) {
                $query->where('department_id', $departmentId);
            }

            $query->orderBy('created_at', 'desc');
        } else {
            // Case Note Out - Successfully requested and approved case notes
            // Filter by approval date, not creation date
            $query = CaseNoteRequest::with(['patient', 'requestedBy', 'department', 'doctor', 'returnedBy'])
                ->whereHas('events', function ($q) use ($startDateCarbon, $endDateCarbon) {
                    $q->where('type', 'approved')
                      ->whereBetween('occurred_at', [$startDateCarbon, $endDateCarbon]);
                })
                ->where(function($q) {
                    $q->where('status', 'approved')
                      ->orWhere('status', 'completed');
                });

            // Apply department filter for case note out
            if ($departmentId) {
                $query->where('department_id', $departmentId);
            }

            // Apply doctor filter for case note out
            if ($doctorId) {
                $query->where('doctor_id', $doctorId);
            }

            $query->orderBy('created_at', 'desc');
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

            $result = [
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

            // Add doctor name for case note out
            if ($type === 'out') {
                $result['doctor_name'] = $caseNote->doctor ? $caseNote->doctor->name : 'N/A';

                // Check if case note has been returned (either through is_returned flag or return event)
                $returnEvent = $caseNote->events()
                    ->where('type', 'returned')
                    ->latest()
                    ->first();

                $isReturned = $caseNote->is_returned || $returnEvent || $caseNote->status === 'completed';

                $result['is_returned'] = $isReturned;

                if ($isReturned) {
                    // Use returned_at if available, otherwise use return event date, otherwise use completed_at
                    if ($caseNote->returned_at) {
                        $result['returned_at'] = $caseNote->returned_at->toDateTimeString();
                        $result['returned_by'] = $caseNote->returnedBy ? $caseNote->returnedBy->name : null;
                    } elseif ($returnEvent) {
                        $result['returned_at'] = $returnEvent->occurred_at->toDateTimeString();
                        $result['returned_by'] = $returnEvent->actor ? $returnEvent->actor->name : null;
                    } elseif ($caseNote->status === 'completed' && $caseNote->completed_at) {
                        $result['returned_at'] = $caseNote->completed_at->toDateTimeString();
                        $result['returned_by'] = $caseNote->completedBy ? $caseNote->completedBy->name : 'MR Staff';
                    } else {
                        $result['returned_at'] = null;
                        $result['returned_by'] = null;
                    }
                } else {
                    $result['returned_at'] = null;
                    $result['returned_by'] = null;
                }
            }

            return $result;
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
