<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Doctor;
use App\Models\Department;

class DoctorSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get department IDs for reference
        $departments = Department::pluck('id', 'code');

        $doctors = [
            [
                'name' => 'Sarah Johnson',
                'department_id' => $departments['CARD'] ?? 1,
                'is_active' => true,
            ],
            [
                'name' => 'Michael Chen',
                'department_id' => $departments['ED'] ?? 2,
                'is_active' => true,
            ],
            [
                'name' => 'Emily Rodriguez',
                'department_id' => $departments['IM'] ?? 3,
                'is_active' => true,
            ],
            [
                'name' => 'David Lee',
                'department_id' => $departments['PEDS'] ?? 4,
                'is_active' => true,
            ],
            [
                'name' => 'Maria Gonzales',
                'department_id' => $departments['SURG'] ?? 5,
                'is_active' => true,
            ],
            [
                'name' => 'James Wilson',
                'department_id' => $departments['OBGYN'] ?? 6,
                'is_active' => true,
            ],
            [
                'name' => 'Lisa Anderson',
                'department_id' => $departments['ORTHO'] ?? 7,
                'is_active' => true,
            ],
            [
                'name' => 'Robert Kim',
                'department_id' => $departments['RAD'] ?? 8,
                'is_active' => true,
            ],
            [
                'name' => 'Jennifer Taylor',
                'department_id' => $departments['PSYCH'] ?? 9,
                'is_active' => true,
            ],
            [
                'name' => 'Kevin Wong',
                'department_id' => $departments['PEDS'] ?? 4,
                'is_active' => true,
            ],
            [
                'name' => 'Amanda Brown',
                'department_id' => $departments['CARD'] ?? 1,
                'is_active' => true,
            ],
            [
                'name' => 'Thomas Miller',
                'department_id' => $departments['IM'] ?? 3,
                'is_active' => true,
            ],
        ];

        foreach ($doctors as $doctor) {
            Doctor::create($doctor);
        }

        $this->command->info('Created ' . count($doctors) . ' doctors.');
    }
}
