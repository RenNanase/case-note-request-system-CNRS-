# PDF Generation for Case Note Lists

## Overview
This implementation adds PDF generation functionality for case note lists requested from Clinic Assistants (CAs). The PDF provides a clean, professional layout with proper formatting for download and printing.

## Features

### 📄 PDF Content
- **Header Section**: CA name, generation date, doctor name, department
- **Summary Section**: Total case notes count, generation timestamp, CA email
- **Table Section**: Patient Name and MRN columns with professional formatting
- **Footer Section**: System information and generation details

### 🎨 Professional Layout
- Clean, professional design with proper alignment
- Table borders and alternating row colors
- Responsive font sizes and spacing
- Print-ready formatting
- A4 portrait orientation

## Implementation Details

### 1. Backend Components

#### PDF Service (`app/Services/CaseNotePdfService.php`)
```php
class CaseNotePdfService
{
    public function generateCaseNoteListPdf(int $caId, array $requestIds = []): PDF
    {
        // Get CA information and case note requests
        // Prepare data for PDF template
        // Generate PDF with professional formatting
    }
}
```

#### PDF Template (`resources/views/pdf/case-note-list.blade.php`)
- Professional HTML/CSS layout
- Responsive table design
- Print-optimized styling
- Clean typography and spacing

#### API Endpoint (`app/Http/Controllers/Api/RequestController.php`)
```php
public function generateCaseNoteListPdf(HttpRequest $request, $caId)
{
    // Permission checking (MR_STAFF, ADMIN only)
    // Generate PDF using service
    // Return PDF as download
}
```

#### API Route (`routes/api.php`)
```php
Route::get('requests/ca/{caId}/pdf', [RequestController::class, 'generateCaseNoteListPdf']);
```

### 2. Frontend Components

#### API Method (`frontend/src/api/requests.ts`)
```typescript
generateCaseNoteListPdf: async (caId: number, requestIds?: number[]): Promise<Blob> => {
    // Call PDF generation endpoint
    // Return PDF blob for download
}
```

#### UI Integration (`frontend/src/pages/MRStaffCaseNoteRequestsPage.tsx`)
- PDF download button in CA detail dialog
- Loading state during PDF generation
- Automatic filename generation
- Success/error toast notifications

## Usage

### For MR Staff Users

1. **Navigate to "Request of The Day" page**
2. **Click "Verify" on any CA with pending requests**
3. **Click "Download PDF" button**
4. **PDF automatically downloads with filename**: `Case_Notes_[CA_Name]_[Date].pdf`

### PDF Content Examples

#### Header Section:
```
Case Note Request List

Requested CA: John Doe                    Date: January 19, 2025
Doctor: Dr. Smith                         Department: Cardiology
```

#### Summary Section:
```
Request Summary
Total Case Notes: 5
Generated: January 19, 2025 at 2:30 PM
CA Email: john.doe@cnrs.test
```

#### Table Section:
```
| Patient Name        | MRN        |
|---------------------|------------|
| Alice Johnson       | MRN001234  |
| Bob Smith           | MRN002345  |
| Carol Davis         | MRN003456  |
```

## API Usage

### Generate PDF for All Pending Requests
```http
GET /api/requests/ca/{caId}/pdf
Authorization: Bearer {token}
```

### Generate PDF for Specific Requests
```http
GET /api/requests/ca/{caId}/pdf?request_ids=1,2,3
Authorization: Bearer {token}
```

### Response
- **Success**: PDF file download
- **Error**: JSON error response

## Technical Details

### Dependencies
- **Laravel DomPDF**: `barryvdh/laravel-dompdf` v3.1.1
- **DomPDF Engine**: `dompdf/dompdf` v3.1.0

### File Structure
```
app/
├── Services/
│   └── CaseNotePdfService.php
├── Http/Controllers/Api/
│   └── RequestController.php (updated)
resources/views/pdf/
└── case-note-list.blade.php
frontend/src/
├── api/requests.ts (updated)
└── pages/MRStaffCaseNoteRequestsPage.tsx (updated)
```

### Security
- **Permission Required**: MR_STAFF or ADMIN roles only
- **Authentication**: Bearer token required
- **Input Validation**: CA ID and request IDs validated
- **Error Handling**: Comprehensive error logging and user feedback

## Configuration

### PDF Settings
- **Paper Size**: A4
- **Orientation**: Portrait
- **Font**: Arial (fallback to system fonts)
- **Margins**: 0.5 inches
- **Encoding**: UTF-8

### File Naming
- **Format**: `Case_Notes_[CA_Name]_[Date].pdf`
- **Date Format**: YYYY-MM-DD
- **Name Sanitization**: Special characters replaced with underscores

## Error Handling

### Common Error Scenarios
1. **CA Not Found**: Returns 404 with error message
2. **No Pending Requests**: Returns error with explanation
3. **Permission Denied**: Returns 403 for unauthorized users
4. **PDF Generation Failure**: Returns 500 with error details

### Logging
- **Success**: Logs PDF generation with user, CA, and request details
- **Errors**: Logs detailed error information for debugging
- **Audit Trail**: Tracks who generated PDFs and when

## Testing

### Manual Testing Steps
1. Login as MR Staff user
2. Navigate to "Request of The Day" page
3. Click "Verify" on CA with pending requests
4. Click "Download PDF" button
5. Verify PDF downloads with correct content

### Automated Testing
Use the provided `test-pdf-generation.php` script to test:
- PDF generation for all pending requests
- PDF generation for specific requests
- Error handling scenarios

## Future Enhancements

### Potential Improvements
1. **Custom Templates**: Multiple PDF templates for different use cases
2. **Batch PDF Generation**: Generate PDFs for multiple CAs at once
3. **PDF Customization**: Allow users to customize PDF content
4. **Email Integration**: Send PDFs via email
5. **PDF Preview**: Preview PDF before download
6. **Print Optimization**: Enhanced print-specific formatting

### Performance Considerations
- **Caching**: Cache PDF templates for better performance
- **Queue Processing**: Use queues for large PDF generation
- **Compression**: Optimize PDF file sizes
- **CDN Integration**: Serve PDFs from CDN for faster downloads

## Troubleshooting

### Common Issues
1. **PDF Not Downloading**: Check browser popup blockers
2. **Empty PDF**: Verify CA has pending requests
3. **Permission Errors**: Ensure user has MR_STAFF or ADMIN role
4. **Font Issues**: Ensure Arial font is available on server

### Debug Information
- Check Laravel logs for detailed error information
- Verify PDF service is properly configured
- Test API endpoint directly with tools like Postman
- Check browser console for frontend errors
