<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Filing Request List</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #333;
            margin: 0;
            padding: 20px;
        }

        .header {
            border-bottom: 2px solid #333;
            padding-bottom: 15px;
            margin-bottom: 20px;
        }

        .header h1 {
            font-size: 18px;
            font-weight: bold;
            margin: 0 0 10px 0;
            color: #2c3e50;
        }

        .header-info {
            display: table;
            width: 100%;
        }

        .header-info .info-row {
            display: table-row;
        }

        .header-info .info-cell {
            display: table-cell;
            padding: 3px 0;
            width: 50%;
        }

        .header-info .label {
            font-weight: bold;
            color: #555;
        }

        .header-info .value {
            color: #333;
        }

        .summary {
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 4px;
            padding: 10px;
            margin-bottom: 20px;
        }

        .summary h3 {
            font-size: 14px;
            font-weight: bold;
            margin: 0 0 8px 0;
            color: #495057;
        }

        .summary p {
            margin: 2px 0;
            font-size: 11px;
            color: #6c757d;
        }

        .table-container {
            margin-top: 20px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }

        th {
            background-color: #751c81;
            color: white;
            font-weight: bold;
            padding: 8px 6px;
            text-align: left;
            border: 1px solid #343a40;
            font-size: 11px;
        }

        td {
            padding: 6px;
            border: 1px solid #dee2e6;
            font-size: 10px;
            vertical-align: top;
        }

        tr:nth-child(even) {
            background-color: #f8f9fa;
        }

        tr:hover {
            background-color: #e9ecef;
        }

        .patient-name { font-weight: bold; color: #000000; }
        .mrn { font-family: 'Courier New', monospace; font-weight: bold; color: #000203; }

        .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #dee2e6;
            font-size: 10px;
            color: #6c757d;
            text-align: center;
        }

        .no-data {
            text-align: center;
            padding: 40px;
            color: #6c757d;
            font-style: italic;
        }

        @page {
            margin: 0.5in;
        }

        @media print {
            body { margin: 0; padding: 10px; }
        }
    </style>
</head>
<body>
    <!-- Header Section -->
    <div class="header">
        <h1>Filing Request List</h1>
        <div class="header-info">
            <div class="info-row">
                <div class="info-cell">
                    <span class="label">Requested CA:</span>
                    <span class="value">{{ $ca_name }}</span>
                </div>
                <div class="info-cell">
                    <span class="label">Date:</span>
                    <span class="value">{{ $generation_date }}</span>
                </div>
            </div>
            <div class="info-row">
                <div class="info-cell">
                    <span class="label">CA Email:</span>
                    <span class="value">{{ $ca_email }}</span>
                </div>
                <div class="info-cell">
                    <span class="label">Total Pending Requests:</span>
                    <span class="value">{{ $total_count }}</span>
                </div>
            </div>
        </div>
    </div>

    <!-- Summary Section -->
    <div class="summary">
        <h3>Filing Summary</h3>
        <p><strong>Total Filing Requests:</strong> {{ $total_count }}</p>
        <p><strong>Generated:</strong> {{ $generation_date }} at {{ $generation_time }}</p>
        <p><strong>Requested CA:</strong> {{ $ca_name }} ({{ $ca_email }})</p>
    </div>

    <!-- List Section (each filing request with its details) -->
    <div class="table-container">
        @if($filing_requests->count() > 0)
            @foreach($filing_requests as $fr)
                <table>
                    <thead>
                        <tr>
                            <th colspan="4">Filing Number: {{ $fr->filing_number }} | Submitted: {{ \Carbon\Carbon::parse($fr->created_at)->format('M d, Y g:i A') }} | Status: {{ ucfirst($fr->status) }}</th>
                        </tr>
                        @if($fr->is_patient_based)
                            <tr>
                                <th style="width: 40%;">Patient Name</th>
                                <th style="width: 30%;">MRN</th>
                                <th style="width: 30%;" colspan="2">Notes</th>
                            </tr>
                        @else
                            <tr>
                                <th style="width: 34%;">Patient Name</th>
                                <th style="width: 22%;">MRN</th>
                                <th style="width: 22%;">Doctor</th>
                                <th style="width: 22%;">Department</th>
                            </tr>
                        @endif
                    </thead>
                    <tbody>
                        @if($fr->is_patient_based)
                            @forelse(($fr->patients ?? []) as $patient)
                                <tr>
                                    <td class="patient-name">{{ $patient->name ?? '-' }}</td>
                                    <td class="mrn">{{ $patient->mrn ?? '-' }}</td>
                                    <td colspan="2">{{ $fr->case_note_description ?? '-' }}</td>
                                </tr>
                            @empty
                                <tr><td colspan="4" class="no-data">No patients listed.</td></tr>
                            @endforelse
                        @else
                            @forelse(($fr->case_notes ?? []) as $cn)
                                <tr>
                                    <td class="patient-name">{{ $cn->patient->name ?? '-' }}</td>
                                    <td class="mrn">{{ $cn->patient->mrn ?? '-' }}</td>
                                    <td>{{ $cn->doctor->name ?? '-' }}</td>
                                    <td>{{ $cn->department->name ?? '-' }}</td>
                                </tr>
                            @empty
                                <tr><td colspan="4" class="no-data">No case notes listed.</td></tr>
                            @endforelse
                            @if(!empty($fr->submission_notes))
                                <tr>
                                    <td colspan="4"><strong>Submission Notes:</strong> {{ $fr->submission_notes }}</td>
                                </tr>
                            @endif
                        @endif

                        @if(!empty($fr->approval_notes))
                            <tr>
                                <td colspan="4"><strong>Approval Notes:</strong> {{ $fr->approval_notes }}</td>
                            </tr>
                        @endif
                    </tbody>
                </table>
                <div style="height: 12px;"></div>
            @endforeach
        @else
            <div class="no-data">
                <p>No filing requests found for this CA.</p>
            </div>
        @endif
    </div>

    <!-- Footer -->
    <div class="footer">
        <p>Generated by CNRS on {{ $generation_date }} at {{ $generation_time }}</p>
        <p>This document contains {{ $total_count }} filing request(s) for {{ $ca_name }}</p>
    </div>
</body>
</html>


