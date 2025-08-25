<?php

namespace App\Imports;

use App\Models\Patient;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;
use Maatwebsite\Excel\Concerns\Importable;
use Maatwebsite\Excel\Concerns\SkipsErrors;
use Maatwebsite\Excel\Concerns\SkipsOnError;
use Maatwebsite\Excel\Concerns\SkipsFailures;
use Maatwebsite\Excel\Concerns\SkipsOnFailure;
use Maatwebsite\Excel\Concerns\WithBatchInserts;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use Illuminate\Validation\Rule;
use Throwable;

class PatientsImport implements 
    ToModel, 
    WithHeadingRow, 
    WithValidation, 
    SkipsOnError, 
    SkipsOnFailure,
    WithBatchInserts,
    WithChunkReading
{
    use Importable, SkipsErrors, SkipsFailures;

    private $importedCount = 0;
    private $skippedCount = 0;
    private $duplicateCount = 0;

    /**
     * @param array $row
     * @return \Illuminate\Database\Eloquent\Model|null
     */
    public function model(array $row)
    {
        // Handle different possible column names (case insensitive)
        $name = $this->getValue($row, ['name', 'patient_name', 'full_name']);
        $mrn = $this->getValue($row, ['mrn', 'medical_record_number']);
        $nationalityId = $this->getValue($row, ['nationality_id', 'nationalityid', 'nationality']);

        // Skip if essential data is missing
        if (empty($name) || empty($mrn)) {
            $this->skippedCount++;
            return null;
        }

        // Check if patient already exists by MRN
        $existingPatient = Patient::where('mrn', strtoupper($mrn))->first();
        if ($existingPatient) {
            // Update nationality_id if provided and not already set
            if ($nationalityId && !$existingPatient->nationality_id) {
                $existingPatient->update(['nationality_id' => $nationalityId]);
            }
            $this->duplicateCount++;
            return null;
        }

        $this->importedCount++;

        return new Patient([
            'name' => $name,
            'mrn' => $mrn,
            'nationality_id' => $nationalityId,
            'is_active' => true,
            // Set default values for required fields
            'date_of_birth' => now()->subYears(30), // Default age
            'sex' => 'O', // Other/Unknown
        ]);
    }

    /**
     * Get value from row with multiple possible column names
     */
    private function getValue(array $row, array $possibleKeys): ?string
    {
        foreach ($possibleKeys as $key) {
            $value = $row[strtolower($key)] ?? $row[$key] ?? null;
            if (!empty($value)) {
                return trim($value);
            }
        }
        return null;
    }

    /**
     * Validation rules for each row
     */
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'mrn' => [
                'required',
                'string',
                'max:20',
                Rule::unique('patients', 'mrn')
            ],
            'nationality_id' => 'nullable|string|max:20',
        ];
    }

    /**
     * Custom validation messages
     */
    public function customValidationMessages()
    {
        return [
            'name.required' => 'Patient name is required',
            'mrn.required' => 'MRN is required',
            'mrn.unique' => 'Patient with this MRN already exists',
        ];
    }

    /**
     * Handle import errors
     */
    public function onError(Throwable $error)
    {
        $this->skippedCount++;
    }

    /**
     * Get import statistics
     */
    public function getImportStats(): array
    {
        return [
            'imported' => $this->importedCount,
            'skipped' => $this->skippedCount,
            'duplicates' => $this->duplicateCount,
            'total_processed' => $this->importedCount + $this->skippedCount + $this->duplicateCount,
        ];
    }

    /**
     * Batch size for bulk inserts
     */
    public function batchSize(): int
    {
        return 100;
    }

    /**
     * Chunk size for reading large files
     */
    public function chunkSize(): int
    {
        return 100;
    }
}
