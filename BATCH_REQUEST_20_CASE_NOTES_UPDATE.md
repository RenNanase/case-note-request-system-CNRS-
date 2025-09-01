# Batch Request System Update: Support for Up to 20 Case Notes

## Overview
Updated the batch request system to allow CAs to request up to 20 case notes in a single transaction (previously limited to 10).

## Changes Made

### Backend Changes

#### 1. BatchRequestController.php
- **File**: `app/Http/Controllers/Api/BatchRequestController.php`
- **Change**: Updated validation rule from `max:10` to `max:20`
- **Line**: 120
- **Before**: `'case_notes' => 'required|array|min:1|max:10'`
- **After**: `'case_notes' => 'required|array|min:1|max:20'`

### Frontend Changes

#### 1. BatchRequestForm.tsx
- **File**: `frontend/src/components/forms/BatchRequestForm.tsx`
- **Changes**:
  - Updated Zod validation schema from `max(10)` to `max(20)`
  - Updated step description from "up to 10" to "up to 20"
  - Updated page description from "up to 10 case notes" to "up to 20 case notes"
  - Updated form description from "up to 10 case notes" to "up to 20 case notes"
  - Updated add button counter from "({fields.length}/10)" to "({fields.length}/20)"
  - Updated add button logic from `fields.length < 10` to `fields.length < 20`
  - Updated conditional rendering from `fields.length < 10` to `fields.length < 20`

## Testing

### Test Command
Created `app/Console/Commands/TestBatchRequestLimit.php` to verify:
- ✅ 19 case notes validation passes
- ✅ 20 case notes validation passes  
- ✅ 21 case notes validation correctly fails

### Running Tests
```bash
php artisan test:batch-request-limit
```

### Test Results
✅ **Backend Validation Tests PASSED**
- 19 case notes: PASSED
- 20 case notes: PASSED  
- 21 case notes: CORRECTLY FAILED

The backend now correctly validates up to 20 case notes and rejects requests with more than 20.

## Expected Outcome

1. **CA Efficiency**: CAs can now save more time by requesting up to 20 case notes in one transaction
2. **Unique Tracking**: Each case note still gets its own unique request number
3. **Common Details**: All case notes in a batch share department, location, doctor, and comment
4. **Individual Processing**: After submission, each case note is treated individually for approval/rejection
5. **Workflow Consistency**: The approval, rejection, and verification process remains unchanged

## Technical Details

- **Validation**: Both frontend (Zod) and backend (Laravel Validator) updated
- **UI Elements**: All user-facing text and counters updated
- **Logic**: Add/remove button logic updated to respect new limits
- **Backward Compatibility**: Existing functionality for 1-10 case notes remains unchanged

## Files Modified

1. `app/Http/Controllers/Api/BatchRequestController.php`
2. `frontend/src/components/forms/BatchRequestForm.tsx`
3. `app/Console/Commands/TestBatchRequestLimit.php` (new)

## Verification Steps

1. **Frontend**: Navigate to batch request form, verify it shows "up to 20 case notes"
2. **Validation**: Try adding 20 case notes - should work
3. **Validation**: Try adding 21 case notes - should fail with validation error
4. **Backend**: Run test command to verify backend validation
5. **API**: Test API endpoint with 20 case notes - should accept

## Notes

- The system maintains all existing functionality and workflow
- Each case note still gets individual tracking and processing
- No changes to the approval/rejection/verification process
- Performance impact is minimal as the change only affects validation limits
