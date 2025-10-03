<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\Department;
use App\Models\Doctor;
use App\Models\Location;

class ResourceController extends Controller
{
    /**
     * Get all departments for select options
     */
    public function departments(Request $request): JsonResponse
    {
        $departments = Department::active()
            ->orderBy('name')
            ->get()
            ->map(function($dept) {
                return [
                    'id' => $dept->id,
                    'name' => $dept->full_name,
                    'code' => $dept->code,
                ];
            });

        return response()->json([
            'success' => true,
            'departments' => $departments,
        ]);
    }

    /**
     * Get all doctors (no department filtering since doctors are independent)
     */
    public function doctors(Request $request): JsonResponse
    {
        $doctors = Doctor::active()
            ->orderBy('name')
            ->get()
            ->map(function($doctor) {
                return [
                    'id' => $doctor->id,
                    'name' => $doctor->name,
                    'is_active' => $doctor->is_active,
                ];
            });

        return response()->json([
            'success' => true,
            'doctors' => $doctors,
        ]);
    }

    /**
     * Get locations filtered by type
     */
    public function locations(Request $request): JsonResponse
    {
        $query = Location::query(); // Temporarily remove active filter for debugging

        if ($request->filled('type')) {
            $query->byType($request->type);
        }

        if ($request->filled('building')) {
            $query->byBuilding($request->building);
        }

        $locations = $query->orderBy('name')
            ->get()
            ->map(function($location) {
                return [
                    'id' => $location->id,
                    'name' => $location->full_name,
                    'type' => $location->type_label,
                ];
            });

        // Debug logging
        \Log::info('Locations API debug:', [
            'total_count' => $locations->count(),
            'locations' => $locations->toArray(),
            'filters' => [
                'type' => $request->type,
                'building' => $request->building,
            ]
        ]);

        return response()->json([
            'success' => true,
            'locations' => $locations,
        ]);
    }

    /**
     * Get priority options for requests
     */
    public function priorities(): JsonResponse
    {
        $priorities = collect(\App\Models\Request::getPriorityOptions())
            ->map(function($label, $value) {
                return [
                    'value' => $value,
                    'label' => $label,
                ];
            })
            ->values();

        return response()->json([
            'success' => true,
            'priorities' => $priorities,
        ]);
    }

    /**
     * Get status options for requests
     */
    public function statuses(): JsonResponse
    {
        $statuses = collect(\App\Models\Request::getStatusOptions())
            ->map(function($label, $value) {
                return [
                    'value' => $value,
                    'label' => $label,
                ];
            })
            ->values();

        return response()->json([
            'success' => true,
            'statuses' => $statuses,
        ]);
    }
}
