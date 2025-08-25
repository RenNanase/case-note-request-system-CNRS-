# Patient Excel Import Feature

## Overview
This feature allows administrators to bulk import patient data from Excel files into the CNRS system. The implementation includes both backend API endpoints and frontend React components.

## Database Changes

### New Field Added
- Added `nationality_id` field to `patients` table
- Field is nullable and indexed for performance
- Maintains compatibility with existing data

### Migration
```bash
php artisan migrate
```

## Backend Implementation

### Dependencies
- **maatwebsite/excel** package for Excel processing
- Installed with platform requirement override for development

### Files Created/Modified

#### Models
- `app/Models/Patient.php` - Added `nationality_id` to fillable fields and search scopes

#### Controllers
- `app/Http/Controllers/Api/Admin/AdminPatientController.php` - Complete admin controller with:
  - Excel import functionality
  - Patient statistics
  - Patient list management
  - Status management (bulk operations)
  - Template download

#### Import Processing
- `app/Imports/PatientsImport.php` - Handles Excel import with:
  - Data validation
  - Duplicate detection
  - Error handling
  - Batch processing
  - Statistics tracking

#### Routes
- `routes/api.php` - Added protected admin routes under `/api/admin/patients/`

### API Endpoints

```
GET    /api/admin/patients              - List patients with pagination
GET    /api/admin/patients/statistics   - Get patient statistics  
POST   /api/admin/patients/import-excel - Import Excel file
GET    /api/admin/patients/import-template - Download template info
PATCH  /api/admin/patients/{id}/status  - Update patient status
PATCH  /api/admin/patients/bulk-status  - Bulk update patient status
```

## Frontend Implementation

### Components Created
- `src/pages/AdminPatientsPage.tsx` - Main admin page with tabbed interface
- `src/components/admin/PatientImportComponent.tsx` - Excel upload and import handling
- `src/components/admin/PatientListComponent.tsx` - Patient list view (placeholder)
- `src/components/admin/PatientStatsComponent.tsx` - Statistics visualization

### UI Components Added
- `src/components/ui/tabs.tsx` - Tab component using Radix UI
- `src/components/ui/progress.tsx` - Progress bar component

### Routing
- Added `/admin/patients` route to `App.tsx`
- Added navigation item to `AppLayout.tsx` (admin only)

## Features

### Excel Import
✅ **File Support**: .xlsx, .xls, .csv files (max 10MB)
✅ **Drag & Drop**: Modern file upload interface
✅ **Validation**: Required fields validation (Name, MRN)
✅ **Duplicate Handling**: Skips existing MRNs, updates nationality_id if missing
✅ **Error Reporting**: Detailed failure reporting with row-level errors
✅ **Statistics**: Import results with counts (imported, skipped, duplicates)
✅ **Batch Processing**: Efficient bulk operations

### Data Structure
**Required Columns:**
- `Name` - Patient full name
- `MRN` - Medical Record Number (unique)

**Optional Columns:**
- `Nationality_ID` - Patient nationality identification

### Admin Interface
✅ **Statistics Dashboard**: Patient counts and import activity
✅ **Import Interface**: Template download and file upload
✅ **Results Display**: Visual feedback on import success/failures
✅ **Role-Based Access**: Admin-only functionality

## Usage

### For Admins
1. Navigate to **Patient Management** in the sidebar
2. Download the Excel template (optional)
3. Prepare Excel file with required columns
4. Upload file using drag & drop or file browser
5. Review import results and statistics

### Excel File Format
```
| Name        | MRN        | Nationality_ID |
|-------------|------------|----------------|
| John Doe    | JMC0159353 | 820403125160   |
| Jane Smith  | JMC0159354 | 700912125496   |
```

## Default Values for Imports
- `is_active`: true
- `date_of_birth`: 30 years ago (placeholder)
- `sex`: 'O' (Other/Unknown)

## Security & Permissions
- All admin routes protected with `role:admin` middleware
- File validation and size limits
- Error handling prevents data corruption
- Activity logging through existing system

## Future Enhancements
- [ ] Actual Excel template file generation
- [ ] Advanced patient list with search/filtering
- [ ] Import history tracking
- [ ] Data mapping configuration
- [ ] Validation rule customization

## Development Notes
- Uses Laravel's validation system
- Implements proper error handling
- Follows existing code patterns
- Compatible with current authentication system
- Responsive design for mobile/desktop
