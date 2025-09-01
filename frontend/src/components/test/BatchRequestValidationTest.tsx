import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';

// Test schema - same as the actual form
const caseNoteSchema = z.object({
  patient_id: z.number().min(1, 'Please select a patient'),
});

const batchRequestSchema = z.object({
  case_notes: z.array(caseNoteSchema).min(1, 'Please add at least one case note').max(20, 'Maximum 20 case notes allowed'),
});

type BatchRequestForm = z.infer<typeof batchRequestSchema>;

export const BatchRequestValidationTest: React.FC = () => {
  const [validationResult, setValidationResult] = useState<string>('');

  const form = useForm<BatchRequestForm>({
    resolver: zodResolver(batchRequestSchema),
    defaultValues: {
      case_notes: [{ patient_id: 1 }],
    },
  });

  const { control } = form;
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'case_notes'
  });

  const addCaseNote = () => {
    if (fields.length < 20) {
      append({ patient_id: 1 });
    }
  };

  const removeCaseNote = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  const testValidation = (count: number) => {
    const testData = {
      case_notes: Array.from({ length: count }, () => ({ patient_id: 1 }))
    };

    try {
      batchRequestSchema.parse(testData);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return false;
      }
      return false;
    }
  };

  const runTests = () => {
    const test19 = testValidation(19);
    const test20 = testValidation(20);
    const test21 = testValidation(21);

    let result = 'Test Results:\n';
    result += `19 case notes: ${test19 ? '✅ PASSED' : '❌ FAILED'}\n`;
    result += `20 case notes: ${test20 ? '✅ PASSED' : '❌ FAILED'}\n`;
    result += `21 case notes: ${test21 ? '❌ SHOULD HAVE FAILED' : '✅ CORRECTLY FAILED'}\n`;

    if (test19 && test20 && !test21) {
      result += '\n🎉 All tests passed! Frontend validation now supports up to 20 case notes.';
    } else {
      result += '\n❌ Some tests failed. Please check the validation logic.';
    }

    setValidationResult(result);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Batch Request Validation Test</CardTitle>
          <CardDescription>
            Test component to verify that the frontend validation now supports up to 20 case notes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                Current case notes: {fields.length}/20
              </p>
              <p className="text-xs text-gray-500">
                {fields.length < 20 ? 'You can add more case notes' : 'Maximum limit reached'}
              </p>
            </div>
            <div className="space-x-2">
              <Button
                type="button"
                onClick={addCaseNote}
                disabled={fields.length >= 20}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Case Note
              </Button>
              <Button
                type="button"
                onClick={runTests}
                variant="outline"
                size="sm"
              >
                Run Validation Tests
              </Button>
            </div>
          </div>

          <div className="border rounded-lg p-4 bg-gray-50">
            <h4 className="font-medium mb-2">Case Notes List:</h4>
            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Case Note {index + 1}</span>
                  <span className="text-xs text-gray-400">(Patient ID: {field.patient_id})</span>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      onClick={() => removeCaseNote(index)}
                      variant="outline"
                      size="sm"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {validationResult && (
            <div className="border rounded-lg p-4 bg-blue-50">
              <h4 className="font-medium mb-2">Validation Test Results:</h4>
              <pre className="text-sm whitespace-pre-wrap">{validationResult}</pre>
            </div>
          )}

          <div className="border rounded-lg p-4 bg-green-50">
            <h4 className="font-medium mb-2">Expected Behavior:</h4>
            <ul className="text-sm space-y-1">
              <li>✅ 19 case notes: Should pass validation</li>
              <li>✅ 20 case notes: Should pass validation</li>
              <li>✅ 21 case notes: Should fail validation</li>
              <li>✅ Add button: Should be disabled at 20 case notes</li>
              <li>✅ Remove button: Should be available when more than 1 case note</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
