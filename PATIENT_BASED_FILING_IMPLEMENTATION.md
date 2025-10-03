# Patient-Based Filing Request System - Implementation Guide

## 🎯 Overview

The CNRS Filing Request system has been updated to support **patient-based filing requests** instead of being limited to existing case notes. This allows CA staff to request case notes for any patients in the database, not just those with completed case note requests.

## 🔄 Key Changes

### Before (Case Note-Based)
- CA could only see completed case notes that were approved and received
- CA selected from a limited pool of available case notes
- Filing was restricted to existing case note requests

### After (Patient-Based)
- CA can search **all patients** in the database
- CA can select **multiple patients** with no maximum limit
- CA describes what type of case notes they need
- MR staff approves based on patient selection and description

## 🚀 New API Endpoints

### For CA (Clinic Assistants)

#### 1. Search Patients for Filing
`
GET /api/filing-requests/patients/search?search={term}&limit={number}
`
**Purpose:** Search all patients in the database for filing requests
**Parameters:**
- search: Search term (name, MRN, NRIC)
- limit: Maximum results (default: 50, max: 100)

**Response:**
`json
{
  "success": true,
  "patients": [
    {
      "id": 1,
      "mrn": "MRN123456",
      "name": "John Doe",
      "nric": "S1234567A",
      "nationality_id": "S1234567A"
    }
  ],
  "total_found": 25,
  "search_term": "john"
}
`

#### 2. Submit Patient-Based Filing Request
`
POST /api/filing-requests/patients/submit
`
**Body:**
`json
{
  "patient_ids": [1, 2, 3],
  "case_note_description": "Latest consultation notes from 2024",
  "expected_case_note_count": 5,
  "submission_notes": "Urgent request for insurance claim"
}
`

**Response:**
`json
{
  "success": true,
  "message": "Patient filing request submitted successfully",
  "filing_request": {
    "id": 123,
    "filing_number": "FIL-20250926-001",
    "status": "pending",
    "patient_count": 3,
    "is_patient_based": true
  }
}
`

### For MR Staff

#### 1. View Filing Requests
`
GET /api/filing-requests/mr
`
**Purpose:** Get all filing requests for MR staff review
**Response includes both patient-based and legacy case note-based requests**

#### 2. Approve/Reject Filing Requests
`
POST /api/filing-requests/{id}/approve
POST /api/filing-requests/{id}/reject
`
**Body:**
`json
{
  "approval_notes": "Approved for medical review"
}
`

## 🗃️ Database Changes

### New Columns in iling_requests table:
- patient_ids (JSON): Array of patient IDs for patient-based filing
- case_note_description (TEXT): Description of what case notes are needed
- expected_case_note_count (INT): Optional expected number of case notes
- case_note_ids (JSON): Made nullable for backward compatibility

## 💻 Frontend Usage Example

### 1. Patient Search
`javascript
// Search for patients
const response = await axios.get('/api/filing-requests/patients/search', {
  params: { search: 'john doe', limit: 20 }
});

const patients = response.data.patients;
`

### 2. Submit Filing Request
`javascript
// Submit patient-based filing request
const selectedPatientIds = [1, 2, 3];
const response = await axios.post('/api/filing-requests/patients/submit', {
  patient_ids: selectedPatientIds,
  case_note_description: 'All consultation notes from January 2024',
  expected_case_note_count: 10,
  submission_notes: 'Required for medical board review'
});
`

## 🔧 Testing the New System

### 1. Demo Page
Visit: http://10.2.10.178/CNRS/public/filing-demo.html

This interactive demo allows you to:
- Login as a CA user
- Search for patients
- Select multiple patients
- Submit patient-based filing requests

### 2. API Testing
Use the following test credentials and endpoints to verify functionality:

`ash
# Login
curl -X POST http://10.2.10.178/CNRS/public/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"ca_user","password":"password"}'

# Search patients (use token from login)
curl -X GET "http://10.2.10.178/CNRS/public/api/filing-requests/patients/search?search=john" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Submit filing request
curl -X POST http://10.2.10.178/CNRS/public/api/filing-requests/patients/submit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_ids": [1, 2],
    "case_note_description": "Latest consultation notes",
    "submission_notes": "Urgent request"
  }'
`

## 🔄 Backward Compatibility

The system maintains backward compatibility with existing case note-based filing:

### Legacy Endpoints (Still Supported)
- GET /api/filing-requests/available-case-notes - Returns existing case notes
- POST /api/filing-requests/submit - Submits case note-based filing requests

### Migration Strategy
1. **Phase 1**: Both systems work in parallel
2. **Phase 2**: Train CA staff on new patient-based system
3. **Phase 3**: Gradually deprecate legacy case note-based endpoints

## 🎛️ Configuration

### Environment Variables
No new environment variables required. The system uses existing database connections and authentication.

### Permissions
- **CA Role**: Can search patients and submit patient-based filing requests
- **MR_STAFF Role**: Can view, approve, and reject all filing requests
- **ADMIN Role**: Full access to all filing request functionality

## 📊 Data Model

### FilingRequest Model Properties
`php
// New patient-based properties
->patient_ids;           // Array of patient IDs
->case_note_description; // Description of needed case notes
->expected_case_note_count; // Expected number of case notes

// Helper methods
->isPatientBased();      // Returns true for patient-based
->getPatients();         // Returns Patient collection
->patient_count;         // Number of selected patients

// Legacy support
->isCaseNoteBased();     // Returns true for legacy
->getCaseNoteRequests(); // Returns Request collection
`

## 🚨 Important Notes

1. **No Maximum Limit**: CAs can select unlimited number of patients
2. **Required Description**: Case note description is mandatory for patient-based requests
3. **MR Approval**: All requests still require MR staff approval
4. **Audit Trail**: All actions are logged for compliance
5. **Legacy Support**: Existing case note-based requests continue to work

## 🔍 Troubleshooting

### Common Issues

1. **500 Error on Patient Search**
   - Check authentication token is valid
   - Verify CA role permissions
   - Check Laravel logs: storage/logs/laravel.log

2. **Empty Patient Search Results**
   - Verify patients exist in database
   - Check search term (minimum 2 characters)
   - Test with different search terms

3. **Filing Request Submission Fails**
   - Verify patient IDs exist in database
   - Check case_note_description is provided
   - Ensure user has CA role

### Debug Commands
`ash
# Check filing requests table structure
php artisan migrate:status

# View recent logs
tail -f storage/logs/laravel.log

# Test API endpoints
php artisan route:list | grep filing
`

## 📞 Support

For technical support or questions about the patient-based filing system:
1. Check the demo page: http://10.2.10.178/CNRS/public/filing-demo.html
2. Review Laravel logs for specific error messages
3. Test with the provided API endpoints and examples
4. Contact the development team with specific error details

---

**Last Updated:** 2025-09-26 10:50:50
**Version:** 2.0 (Patient-Based Filing System)
