<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Department;

class DepartmentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $departments = [
            [
                'name' => 'Cardiology',
                'code' => 'CARD',
                'description' => 'Heart and cardiovascular system care',
                'is_active' => true,
            ],
            [
                'name' => 'Emergency Department',
                'code' => 'ED',
                'description' => 'Emergency and urgent care services',
                'is_active' => true,
            ],
            [
                'name' => 'Internal Medicine',
                'code' => 'IM',
                'description' => 'General internal medicine and adult care',
                'is_active' => true,
            ],
            [
                'name' => 'Pediatrics',
                'code' => 'PEDS',
                'description' => 'Children and adolescent healthcare',
                'is_active' => true,
            ],
            [
                'name' => 'Surgery',
                'code' => 'SURG',
                'description' => 'General and specialized surgical services',
                'is_active' => true,
            ],
            [
                'name' => 'Obstetrics & Gynecology',
                'code' => 'OBGYN',
                'description' => 'Women\'s health, pregnancy, and childbirth',
                'is_active' => true,
            ],
            [
                'name' => 'Orthopedics',
                'code' => 'ORTHO',
                'description' => 'Bone, joint, and musculoskeletal care',
                'is_active' => true,
            ],
            [
                'name' => 'Radiology',
                'code' => 'RAD',
                'description' => 'Medical imaging and diagnostic services',
                'is_active' => true,
            ],
            [
                'name' => 'Psychiatry',
                'code' => 'PSYCH',
                'description' => 'Mental health and psychiatric services',
                'is_active' => true,
            ],
            [
                'name' => 'Medical Records',
                'code' => 'MR',
                'description' => 'Medical records management and administration',
                'is_active' => true,
            ],
        ];

        foreach ($departments as $department) {
            Department::create($department);
        }

        $this->command->info('Created ' . count($departments) . ' departments.');
    }
}
