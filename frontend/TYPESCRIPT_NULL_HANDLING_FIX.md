# TypeScript Null Handling Fix

## Problem
The TypeScript build was failing with the error:
```
src/pages/PatientSearchPage.tsx:102:31 - error TS2769: No overload matches this call.
Argument of type 'string | null | undefined' is not assignable to parameter of type 'string | number | Date'.
```

This occurred because `selectedPatient.date_of_birth` could be `null` or `undefined`, but was being passed directly to the `Date` constructor without null checks.

## Root Cause
The issue stemmed from the updated Patient interface that made several fields optional/nullable to accommodate the simplified database structure:

```typescript
export interface Patient {
  id: number;
  mrn: string;
  name: string;
  nric?: string | null;
  nationality_id?: string | null;
  date_of_birth?: string | null;  // ← This can be null/undefined
  age?: number | null;
  sex?: string | null;
  phone?: string | null;
  has_medical_alerts?: boolean;
}
```

## Solution Applied

### 1. **Immediate Fix** - Null Checking
Changed from:
```typescript
// ❌ BROKEN - Can cause runtime errors
{new Date(selectedPatient.date_of_birth).toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
})}
```

To:
```typescript
// ✅ WORKS - But basic approach
{selectedPatient.date_of_birth 
  ? new Date(selectedPatient.date_of_birth).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  : '-'
}
```

### 2. **Best Practice Solution** - Utility Functions
Created dedicated utility functions for robust null handling:

```typescript
// Utility functions for handling null/undefined patient data
const formatDateOfBirth = (dateOfBirth: string | null | undefined): string => {
  if (!dateOfBirth) return '-';
  
  try {
    const date = new Date(dateOfBirth);
    // Check if the date is valid
    if (isNaN(date.getTime())) return '-';
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    return '-';
  }
};

const formatAge = (age: number | null | undefined): string => {
  return age && age > 0 ? `${age} years old` : 'Age unknown';
};

const formatSex = (sex: string | null | undefined): string => {
  if (sex === 'M') return 'Male';
  if (sex === 'F') return 'Female';
  return sex || '-';
};

const formatNRIC = (nric: string | null | undefined, nationalityId: string | null | undefined): string => {
  return nric || nationalityId || '-';
};
```

### 3. **Clean Usage**
Instead of inline null checks, use the utility functions:
```typescript
// ✅ BEST PRACTICE - Clean and reusable
<p className="text-gray-900">{formatDateOfBirth(selectedPatient.date_of_birth)}</p>
<p className="text-gray-900">{formatAge(selectedPatient.age)}</p>
<p className="text-gray-900">{formatSex(selectedPatient.sex)}</p>
<p className="text-gray-900">{formatNRIC(selectedPatient.nric, selectedPatient.nationality_id)}</p>
```

## TypeScript Best Practices for Null Handling

### 1. **Type Guards**
```typescript
const isValidDate = (date: string | null | undefined): date is string => {
  return date !== null && date !== undefined && date.trim() !== '';
};

// Usage
if (isValidDate(patient.date_of_birth)) {
  // TypeScript now knows date_of_birth is a string
  const formatted = new Date(patient.date_of_birth).toLocaleDateString();
}
```

### 2. **Optional Chaining** (when appropriate)
```typescript
// For object properties
const patientName = patient?.profile?.name ?? 'Unknown';

// For array access
const firstPhone = patient?.phoneNumbers?.[0] ?? 'N/A';
```

### 3. **Nullish Coalescing Operator**
```typescript
// Use ?? for null/undefined, || for falsy values
const age = patient.age ?? 0;  // Only null/undefined → 0
const name = patient.name || 'Unknown';  // Any falsy value → 'Unknown'
```

### 4. **Discriminated Unions** (for complex scenarios)
```typescript
type PatientData = 
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; patient: Patient };

// TypeScript enforces checking the status before accessing patient
if (patientData.status === 'success') {
  // Can safely access patientData.patient here
}
```

### 5. **Utility Type for Non-Null Fields**
```typescript
// Create a type that requires certain fields to be non-null
type PatientWithRequiredFields = Patient & {
  date_of_birth: string;
  age: number;
};

const formatFullPatientInfo = (patient: PatientWithRequiredFields) => {
  // TypeScript guarantees these fields are not null
  return {
    age: patient.age,
    birthDate: new Date(patient.date_of_birth)
  };
};
```

## Validation Strategies

### 1. **Runtime Validation**
```typescript
const validatePatientData = (patient: Patient): string[] => {
  const errors: string[] = [];
  
  if (!patient.name?.trim()) {
    errors.push('Patient name is required');
  }
  
  if (!patient.mrn?.trim()) {
    errors.push('MRN is required');
  }
  
  if (patient.date_of_birth && isNaN(new Date(patient.date_of_birth).getTime())) {
    errors.push('Invalid date of birth format');
  }
  
  return errors;
};
```

### 2. **Schema Validation Libraries**
Consider using libraries like Zod for runtime type safety:
```typescript
import { z } from 'zod';

const PatientSchema = z.object({
  id: z.number(),
  name: z.string().min(1),
  mrn: z.string().min(1),
  date_of_birth: z.string().nullable().optional(),
  age: z.number().positive().nullable().optional(),
});

type ValidatedPatient = z.infer<typeof PatientSchema>;
```

## Error Prevention Checklist

✅ **Always handle null/undefined for optional fields**  
✅ **Use type guards for complex validation**  
✅ **Provide meaningful fallback values**  
✅ **Handle edge cases (invalid dates, negative numbers)**  
✅ **Use utility functions for consistency**  
✅ **Test with null/undefined data**  
✅ **Enable strict null checks in tsconfig.json**  

## Key Takeaways

1. **Never pass nullable values directly to constructors** that expect non-null values
2. **Create utility functions** for consistent null handling across components
3. **Use TypeScript's type system** to catch these issues at compile time
4. **Provide meaningful fallbacks** rather than showing "undefined" or errors
5. **Consider the user experience** - what should users see when data is missing?

The fix ensures that:
- ✅ TypeScript compilation passes
- ✅ Runtime errors are prevented  
- ✅ Users see meaningful fallback values ("-", "Age unknown", etc.)
- ✅ Code is maintainable and reusable
- ✅ Future developers understand the null handling strategy
