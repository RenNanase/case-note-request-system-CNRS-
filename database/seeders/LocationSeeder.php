<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Location;

class LocationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $locations = [
            // Wards
            [
                'name' => 'Ward 3A',
                'type' => 'ward',
                'building' => 'Main Hospital',
                'floor' => '3',
                'description' => 'General medical ward',
                'is_active' => true,
            ],
            [
                'name' => 'Ward 4B',
                'type' => 'ward',
                'building' => 'Main Hospital',
                'floor' => '4',
                'description' => 'Surgical ward',
                'is_active' => true,
            ],
            [
                'name' => 'ICU Ward',
                'type' => 'ward',
                'building' => 'Main Hospital',
                'floor' => '2',
                'description' => 'Intensive Care Unit',
                'is_active' => true,
            ],
            [
                'name' => 'Pediatric Ward',
                'type' => 'ward',
                'building' => 'Children Hospital',
                'floor' => '2',
                'description' => 'Children and infant care',
                'is_active' => true,
            ],

            // Clinics
            [
                'name' => 'Cardiology Clinic',
                'type' => 'clinic',
                'building' => 'Specialist Building',
                'floor' => '1',
                'description' => 'Heart and cardiovascular clinic',
                'is_active' => true,
            ],
            [
                'name' => 'General Practice Clinic',
                'type' => 'clinic',
                'building' => 'Outpatient Building',
                'floor' => '1',
                'description' => 'General medical consultation',
                'is_active' => true,
            ],
            [
                'name' => 'Orthopedic Clinic',
                'type' => 'clinic',
                'building' => 'Specialist Building',
                'floor' => '2',
                'description' => 'Bone and joint specialist clinic',
                'is_active' => true,
            ],

            // Medical Records Rooms
            [
                'name' => 'MR Room 1',
                'type' => 'room',
                'building' => 'Administration Block',
                'floor' => '1',
                'description' => 'Medical Records processing room',
                'is_active' => true,
            ],
            [
                'name' => 'MR Room 2',
                'type' => 'room',
                'building' => 'Administration Block',
                'floor' => '1',
                'description' => 'Medical Records review room',
                'is_active' => true,
            ],

            // Archives
            [
                'name' => 'Archive Storage A',
                'type' => 'archive',
                'building' => 'Storage Building',
                'floor' => 'B1',
                'description' => 'Long-term medical records storage',
                'is_active' => true,
            ],
            [
                'name' => 'Archive Storage B',
                'type' => 'archive',
                'building' => 'Storage Building',
                'floor' => 'B2',
                'description' => 'Inactive records storage',
                'is_active' => true,
            ],

            // Offices
            [
                'name' => 'MR Supervisor Office',
                'type' => 'office',
                'building' => 'Administration Block',
                'floor' => '2',
                'description' => 'Medical Records supervisor office',
                'is_active' => true,
            ],
            [
                'name' => 'Department Head Office',
                'type' => 'office',
                'building' => 'Administration Block',
                'floor' => '3',
                'description' => 'Department head office',
                'is_active' => true,
            ],

            // Emergency Department
            [
                'name' => 'Emergency Room 1',
                'type' => 'room',
                'building' => 'Emergency Building',
                'floor' => '1',
                'description' => 'Emergency treatment room',
                'is_active' => true,
            ],
            [
                'name' => 'Emergency Room 2',
                'type' => 'room',
                'building' => 'Emergency Building',
                'floor' => '1',
                'description' => 'Emergency treatment room',
                'is_active' => true,
            ],
        ];

        foreach ($locations as $location) {
            Location::create($location);
        }

        $this->command->info('Created ' . count($locations) . ' locations.');
    }
}
