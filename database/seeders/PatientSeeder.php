<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Patient;

class PatientSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $patients = [
            [
                'mrn' => 'MRN001234',
                'name' => 'Ahmad Bin Abdullah',
                'nationality_id' => 'MYS001',
            ],
            [
                'mrn' => 'MRN002345',
                'name' => 'Siti Nurhaliza Binti Hassan',
                'nationality_id' => 'MYS002',
            ],
            [
                'mrn' => 'MRN003456',
                'name' => 'Tan Wei Ming',
                'nationality_id' => 'MYS003',
            ],
            [
                'mrn' => 'MRN004567',
                'name' => 'Priya Devi A/P Raman',
                'nationality_id' => 'MYS004',
            ],
            [
                'mrn' => 'MRN005678',
                'name' => 'Muhammad Faiz Bin Rahman',
                'nationality_id' => 'MYS005',
            ],
            [
                'mrn' => 'MRN006789',
                'name' => 'Lim Sook Yin',
                'nationality_id' => 'MYS006',
            ],
            [
                'mrn' => 'MRN007890',
                'name' => 'Robert Johnson',
                'nationality_id' => 'USA001',
            ],
            [
                'mrn' => 'MRN008901',
                'name' => 'Aisha Binti Omar',
                'nationality_id' => 'MYS007',
            ],
            [
                'mrn' => 'MRN009012',
                'name' => 'Chen Wei Lun',
                'nationality_id' => 'MYS008',
            ],
            [
                'mrn' => 'MRN010123',
                'name' => 'Kamala Devi A/P Suresh',
                'nationality_id' => 'MYS009',
            ],
            [
                'mrn' => 'MRN011234',
                'name' => 'Arif Danial Bin Zulkifli',
                'nationality_id' => 'MYS010',
            ],
            [
                'mrn' => 'MRN012345',
                'name' => 'Sofia Amelia Binti Rashid',
                'nationality_id' => 'MYS011',
            ],
        ];

        foreach ($patients as $patient) {
            Patient::create($patient);
        }

        $this->command->info('Created ' . count($patients) . ' patients.');
    }
}
