import { useState, useRef, useCallback } from 'react';
import { adminPatientsApi } from '@/api/requests';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  Info
} from 'lucide-react';

interface ImportResult {
  success: boolean;
  message: string;
  statistics?: {
    imported: number;
    skipped: number;
    duplicates: number;
    total_processed: number;
  };
  failures?: Array<{
    row: number;
    errors: string[];
    values: Record<string, any>;
  }>;
  errors?: string[];
}

interface PatientImportComponentProps {
  onImportComplete: () => void;
}

export default function PatientImportComponent({ onImportComplete }: PatientImportComponentProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (isValidFileType(droppedFile)) {
        setFile(droppedFile);
        setResult(null);
      }
    }
  }, []);

  const isValidFileType = (file: File): boolean => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];
    return validTypes.includes(file.type) ||
           file.name.endsWith('.xlsx') ||
           file.name.endsWith('.xls') ||
           file.name.endsWith('.csv');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (isValidFileType(selectedFile)) {
        setFile(selectedFile);
        setResult(null);
      } else {
        alert('Please select a valid Excel or CSV file (.xlsx, .xls, .csv)');
      }
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setResult(null);

    try {
      // Create FormData and append the file with the correct field name
      const formData = new FormData();
      formData.append('excel_file', file);

      const response = await adminPatientsApi.importExcel(formData);
      if (response.success) {
        setResult({
          success: true,
          message: response.message || 'Import completed successfully',
          statistics: response.statistics,
          failures: response.failures,
          errors: response.errors
        });
        onImportComplete();
      } else {
        setResult({
          success: false,
          message: response.message || 'Import failed',
          errors: response.errors ? Object.values(response.errors).flat() : []
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Import failed: ' + (error instanceof Error ? error.message : 'Unknown error'),
      });
    } finally {
      setImporting(false);
    }
  };



  const resetImport = () => {
    setFile(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">


      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Upload className="h-5 w-5 mr-2" />
            Upload Patient Data
          </CardTitle>
          <CardDescription>
            Upload an Excel or CSV file with patient information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drag and Drop Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-purple-500 bg-purple-50'
                : file
                ? 'border-green-500 bg-green-50'
                : 'border-gray-300 bg-gray-50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {file ? (
              <div className="space-y-2">
                <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
                <div className="space-y-1">
                  <p className="text-lg font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-600">
                    {(file.size / 1024 / 1024).toFixed(2)} MB • Ready to import
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetImport}
                  className="mt-2"
                >
                  <X className="h-4 w-4 mr-2" />
                  Remove File
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                <div className="space-y-1">
                  <p className="text-lg font-medium text-gray-900">
                    Drop your Excel file here, or click to browse
                  </p>
                                     <p className="text-sm text-gray-600">
                     Supports .xlsx, .xls, and .csv files (max 100MB)
                   </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Browse Files
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            )}
          </div>

          {/* Import Button */}
          {file && (
            <div className="flex justify-end">
              <Button
                onClick={handleImport}
                disabled={importing}
                className="min-w-32"
              >
                {importing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Patients
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Progress */}
      {importing && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Processing Import...</h4>
                <Badge variant="secondary">In Progress</Badge>
              </div>
              <Progress className="w-full" />
              <p className="text-sm text-gray-600">
                Validating and importing patient data. This may take a few moments.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              {result.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 mr-2" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              )}
              Import Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className={result.success ? '' : 'border-red-200'}>
              <AlertDescription>
                {result.message}
              </AlertDescription>
            </Alert>

            {result.statistics && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{result.statistics.imported}</p>
                  <p className="text-sm text-gray-600">Imported</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">{result.statistics.duplicates}</p>
                  <p className="text-sm text-gray-600">Duplicates</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{result.statistics.skipped}</p>
                  <p className="text-sm text-gray-600">Skipped</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{result.statistics.total_processed}</p>
                  <p className="text-sm text-gray-600">Total Processed</p>
                </div>
              </div>
            )}

            {result.failures && result.failures.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-red-600">Import Failures:</h4>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {result.failures.map((failure, index) => (
                    <div key={index} className="p-3 bg-red-50 rounded border border-red-200">
                      <p className="text-sm font-medium text-red-800">Row {failure.row}:</p>
                      <ul className="text-sm text-red-700 list-disc list-inside">
                        {failure.errors.map((error, errorIndex) => (
                          <li key={errorIndex}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.errors && result.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-red-600">Import Errors:</h4>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {result.errors.map((error, index) => (
                    <div key={index} className="p-3 bg-red-50 rounded border border-red-200">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Import Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Info className="h-5 w-5 mr-2" />
            Import Guidelines
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-600">
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">Required Columns:</h4>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Name:</strong> Patient full name (required)</li>
              <li><strong>MRN:</strong> Medical Record Number - must be unique (required)</li>
              <li><strong>Nationality_ID:</strong> Patient nric/passport number</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">Notes:</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Duplicate MRNs will be skipped and not imported</li>
              <li>Missing required fields will cause rows to be skipped</li>
              <li>Default values will be set for missing optional fields</li>
              <li>Maximum file size: 100MB</li>
              <li>Import patient data using queries from the database in SQLYog</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
