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
                'title' => 'Dr.',
                'specialization' => 'Interventional Cardiology',
                'license_number' => 'MC12345',
                'phone' => '+60123456789',
                'email' => 'sarah.johnson@hospital.com',
                'department_id' => $departments['CARD'] ?? 1,
                'is_active' => true,
            ],
            [
                'name' => 'Michael Chen',
                'title' => 'Prof.',
                'specialization' => 'Emergency Medicine',
                'license_number' => 'MC23456',
                'phone' => '+60123456790',
                'email' => 'michael.chen@hospital.com',
                'department_id' => $departments['ED'] ?? 2,
                'is_active' => true,
            ],
            [
                'name' => 'Emily Rodriguez',
                'title' => 'Dr.',
                'specialization' => 'Internal Medicine',
                'license_number' => 'MC34567',
                'phone' => '+60123456791',
                'email' => 'emily.rodriguez@hospital.com',
                'department_id' => $departments['IM'] ?? 3,
                'is_active' => true,
            ],
            [
                'name' => 'David Lee',
                'title' => 'Dr.',
                'specialization' => 'Pediatric Medicine',
                'license_number' => 'MC45678',
                'phone' => '+60123456792',
                'email' => 'david.lee@hospital.com',
                'department_id' => $departments['PEDS'] ?? 4,
                'is_active' => true,
            ],
            [
                'name' => 'Maria Gonzales',
                'title' => 'Dr.',
                'specialization' => 'General Surgery',
                'license_number' => 'MC56789',
                'phone' => '+60123456793',
                'email' => 'maria.gonzales@hospital.com',
                'department_id' => $departments['SURG'] ?? 5,
                'is_active' => true,
            ],
            [
                'name' => 'James Wilson',
                'title' => 'Prof.',
                'specialization' => 'Obstetrics & Gynecology',
                'license_number' => 'MC67890',
                'phone' => '+60123456794',
                'email' => 'james.wilson@hospital.com',
                'department_id' => $departments['OBGYN'] ?? 6,
                'is_active' => true,
            ],
            [
                'name' => 'Lisa Anderson',
                'title' => 'Dr.',
                'specialization' => 'Orthopedic Surgery',
                'license_number' => 'MC78901',
                'phone' => '+60123456795',
                'email' => 'lisa.anderson@hospital.com',
                'department_id' => $departments['ORTHO'] ?? 7,
                'is_active' => true,
            ],
            [
                'name' => 'Robert Kim',
                'title' => 'Dr.',
                'specialization' => 'Diagnostic Radiology',
                'license_number' => 'MC89012',
                'phone' => '+60123456796',
                'email' => 'robert.kim@hospital.com',
                'department_id' => $departments['RAD'] ?? 8,
                'is_active' => true,
            ],
            [
                'name' => 'Jennifer Taylor',
                'title' => 'Dr.',
                'specialization' => 'Psychiatry',
                'license_number' => 'MC90123',
                'phone' => '+60123456797',
                'email' => 'jennifer.taylor@hospital.com',
                'department_id' => $departments['PSYCH'] ?? 9,
                'is_active' => true,
            ],
            [
                'name' => 'Kevin Wong',
                'title' => 'Dr.',
                'specialization' => 'Pediatric Surgery',
                'license_number' => 'MC01234',
                'phone' => '+60123456798',
                'email' => 'kevin.wong@hospital.com',
                'department_id' => $departments['PEDS'] ?? 4,
                'is_active' => true,
            ],
            [
                'name' => 'Amanda Brown',
                'title' => 'Dr.',
                'specialization' => 'Cardiothoracic Surgery',
                'license_number' => 'MC12340',
                'phone' => '+60123456799',
                'email' => 'amanda.brown@hospital.com',
                'department_id' => $departments['CARD'] ?? 1,
                'is_active' => true,
            ],
            [
                'name' => 'Thomas Miller',
                'title' => 'Dr.',
                'specialization' => 'Neurology',
                'license_number' => 'MC23401',
                'phone' => '+60123456800',
                'email' => 'thomas.miller@hospital.com',
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
