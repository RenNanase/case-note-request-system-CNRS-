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
                    'value' => $dept->id,
                    'label' => $dept->full_name,
                    'code' => $dept->code,
                ];
            });

        return response()->json([
            'success' => true,
            'departments' => $departments,
        ]);
    }

    /**
     * Get doctors filtered by department
     */
    public function doctors(Request $request): JsonResponse
    {
        $query = Doctor::active()->with('department');

        if ($request->filled('department_id')) {
            $query->byDepartment($request->department_id);
        }

        $doctors = $query->orderBy('name')
            ->get()
            ->map(function($doctor) {
                return $doctor->toSelectOption();
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
        $query = Location::active();

        if ($request->filled('type')) {
            $query->byType($request->type);
        }

        if ($request->filled('building')) {
            $query->byBuilding($request->building);
        }

        $locations = $query->orderBy('name')
            ->get()
            ->map(function($location) {
                return $location->toSelectOption();
            });

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
