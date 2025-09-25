<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Case Note Request List</title>
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

        .patient-name {
            font-weight: bold;
            color: #000000;
        }

        .mrn {
            font-family: 'Courier New', monospace;
            font-weight: bold;
            color: #000203;
        }

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
            body {
                margin: 0;
                padding: 10px;
            }
        }
    </style>
</head>
<body>
    <!-- Header Section -->
    <div class="header">
        <h1>Case Note Request List</h1>
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
                    <span class="label">Doctor:</span>
                    <span class="value">{{ $doctor_name }}</span>
                </div>
                <div class="info-cell">
                    <span class="label">Department:</span>
                    <span class="value">{{ $department_name }}</span>
                </div>
            </div>
        </div>
    </div>

    <!-- Summary Section -->
    <div class="summary">
        <h3>Request Summary</h3>
        <p><strong>Total Case Notes:</strong> {{ $total_count }}</p>
        <p><strong>Generated:</strong> {{ $generation_date }} at {{ $generation_time }}</p>
        <p><strong>CA Email:</strong> {{ $ca_email }}</p>
    </div>

    <!-- Table Section -->
    <div class="table-container">
        @if($requests->count() > 0)
            <table>
                <thead>
                    <tr>
                        <th style="width: 60%;">Patient Name</th>
                        <th style="width: 40%;">MRN</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($requests as $request)
                        <tr>
                            <td class="patient-name">
                                {{ $request->patient->name }}
                            </td>
                            <td class="mrn">
                                {{ $request->patient->mrn }}
                            </td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @else
            <div class="no-data">
                <p>No case note requests found for this CA.</p>
            </div>
        @endif
    </div>

    <!-- Footer -->
    <div class="footer">
        <p>Generated by CNRS (Case Note Request System) on {{ $generation_date }} at {{ $generation_time }}</p>
        <p>This document contains {{ $total_count }} case note request(s) for {{ $ca_name }}</p>
    </div>
</body>
</html>
