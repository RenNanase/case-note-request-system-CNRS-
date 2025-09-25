import { useState, useEffect, useRef } from 'react';
import { Search, User, AlertCircle, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { patientsApi } from '@/api/requests';
import type { Patient } from '@/types/requests';
import { cn } from '@/lib/utils';

interface PatientSearchProps {
  onPatientSelect: (patient: Patient) => void;
  selectedPatient?: Patient;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onRequestHandover?: (patient: Patient) => void; // New prop for handover requests
}

export default function PatientSearch({
  onPatientSelect,
  selectedPatient,
  placeholder = "Search by MRN, NRIC, or patient name...",
  disabled = false,
  className,
  onRequestHandover
}: PatientSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Search patients with debouncing
  const searchPatients = async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    setError(null);

    console.log('🔍 Starting patient search for:', searchQuery);
    console.log('🔑 Auth token exists:', !!localStorage.getItem('cnrs_token'));

        try {
      const response = await patientsApi.searchPatients(searchQuery);
      console.log('✅ Patient search response:', response);
      console.log('✅ Response type:', typeof response);
      console.log('✅ Response keys:', Object.keys(response));
      console.log('✅ Response.success:', response.success);
      console.log('✅ Response.patients:', response.patients);
      console.log('✅ Response.patients length:', response.patients?.length);

      if (response.success) {
        console.log('✅ Patient data with availability:', response.patients);
        setResults(response.patients);
        setIsOpen(true);
        setFocusedIndex(-1);
      } else {
        console.error('❌ Patient search failed:', response);
        setError('Failed to search patients');
        setResults([]);
      }
    } catch (error: any) {
      console.error('💥 Patient search error:', error);
      console.error('💥 Error response:', error.response);
      console.error('💥 Error status:', error.response?.status);
      console.error('💥 Error data:', error.response?.data);

      const errorMessage = error.response?.data?.message || error.message || 'Unknown error occurred';
      setError(`Error searching patients: ${errorMessage}`);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle input change with debouncing
  const handleInputChange = (value: string) => {
    setQuery(value);

    // Clear existing timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Set new timeout for debounced search
    debounceRef.current = setTimeout(() => {
      searchPatients(value);
    }, 300);
  };

  // Handle patient selection
  const handlePatientSelect = (patient: Patient) => {
    setQuery(patient.name);
    setResults([]);
    setIsOpen(false);
    setFocusedIndex(-1);
    onPatientSelect(patient);
  };

  // Clear selection
  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setFocusedIndex(-1);
    inputRef.current?.focus();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev =>
          prev < results.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev =>
          prev > 0 ? prev - 1 : results.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < results.length) {
          handlePatientSelect(results[focusedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setFocusedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };



  return (
    <div ref={searchRef} className={cn("relative", className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          disabled={disabled}
          className="pl-10 pr-12"
        />
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={disabled}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100"
          >
            ×
          </Button>
        )}
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Clock className="h-4 w-4 text-gray-400 animate-spin" />
          </div>
        )}
      </div>

      {/* Selected Patient Display */}
      {selectedPatient && (
        <Card className="mt-2 border-pink-200 bg-pink-50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-pink-100 text-pink-700">
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-medium text-pink-900">{selectedPatient.name}</h3>
                    <CheckCircle2 className="h-4 w-4 text-pink-600" />
                  </div>
                    <div className="flex items-center space-x-4 text-sm text-pink-700">
                        <span>MRN: {selectedPatient.mrn}</span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-pink-700">
                        <span>NRIC/PASSPORT: {selectedPatient.nric}</span>
                    </div>
                  {selectedPatient.has_medical_alerts && (
                    <Badge variant="destructive" className="mt-1">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Medical Alerts
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                disabled={disabled}
                className="text-pink-600 hover:text-pink-800"
              >
                Change
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Results Dropdown - Inline */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50">
          <Card className="shadow-lg border bg-white rounded-md overflow-hidden max-h-64 overflow-y-auto border-gray-200">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-3 space-y-2">
                  {[...Array(3)].map((_, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="space-y-1 flex-1">
                        <Skeleton className="h-3 w-3/4" />
                        <Skeleton className="h-2 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="p-4 text-center">
                  <AlertCircle className="h-5 w-5 text-red-500 mx-auto mb-2" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              ) : results.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <Search className="h-5 w-5 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No patients found</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Try searching with MRN, NRIC, or patient name
                  </p>
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  {results.map((patient, index) => (
                    <div
                      key={patient.id}
                      className={cn(
                        "relative border-b border-gray-100 last:border-b-0 transition-colors",
                        focusedIndex === index && "bg-purple-50",
                        patient.has_existing_requests && !patient.is_available ? "bg-red-50" : "hover:bg-gray-50"
                      )}
                    >
                      <div className="flex items-start p-3 space-x-3">
                        {/* Patient Avatar */}
                        <div className="flex-shrink-0">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium",
                            patient.has_existing_requests && !patient.is_available
                              ? "bg-red-100 text-red-700"
                              : "bg-purple-100 text-purple-700"
                          )}>
                            {patient.name.charAt(0).toUpperCase()}
                          </div>
                        </div>

                        {/* Patient Info - Clickable Area */}
                        <button
                          type="button"
                          onClick={() => {
                            if (!(patient.has_existing_requests && !patient.is_available)) {
                              handlePatientSelect(patient);
                            }
                          }}
                          disabled={patient.has_existing_requests && !patient.is_available}
                          className={cn(
                            "flex-1 text-left focus:outline-none",
                            patient.has_existing_requests && !patient.is_available
                              ? "cursor-not-allowed"
                              : "cursor-pointer"
                          )}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className={cn(
                                "font-medium text-sm truncate",
                                patient.has_existing_requests && !patient.is_available
                                  ? "text-gray-500"
                                  : "text-gray-900"
                              )}>
                                {patient.name}
                              </span>
                              {patient.has_medical_alerts && (
                                <span className="text-red-500 text-xs" title="Medical Alert">⚠️</span>
                              )}
                            </div>
                            <div className={cn(
                              "text-xs space-x-3",
                              patient.has_existing_requests && !patient.is_available
                                ? "text-gray-400"
                                : "text-gray-600"
                            )}>
                              <span>MRN: {patient.mrn}</span>
                              {patient.nationality_id && (
                                <span>ID: {patient.nationality_id}</span>
                              )}
                            </div>
                            {/* Status Indicators */}
                            <div className="flex items-center space-x-2 mt-2">
                              {patient.has_existing_requests && (
                                patient.handover_status === "requested" ? (
                                  <Badge variant="outline" className="text-xs px-2 py-0.5 bg-orange-50 text-orange-700 border-orange-200">
                                    <Clock className="w-3 h-3 mr-1" />
                                    Handover Pending
                                  </Badge>
                                ) : patient.handover_status === "mr_staff_opened" ? (
                                  <Badge variant="outline" className="text-xs px-2 py-0.5 bg-green-50 text-green-700 border-green-200">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    MR Staff Opened
                                  </Badge>
                                ) : patient.is_available ? (
                                  <Badge variant="outline" className="text-xs px-2 py-0.5 bg-green-50 text-green-700 border-green-200">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Available
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs px-2 py-0.5 bg-red-50 text-red-700 border-red-200">
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Unavailable
                                  </Badge>
                                )
                              )}
                            </div>

                            {/* MR Staff Restriction Banner */}
                            {patient.handover_status === "mr_staff_opened" && patient.restriction_details && (
                              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                                <div className="flex items-start space-x-2">
                                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                  <div className="text-xs text-green-800">
                                    <p className="font-medium">Active - Case Note Opened by MR Staff</p>
                                    <p className="mt-1">
                                      <strong>Department:</strong> {patient.restriction_details.department_name}<br/>
                                      <strong>Location:</strong> {patient.restriction_details.location_name}<br/>
                                      <strong>Doctor:</strong> {patient.restriction_details.doctor_name}<br/>
                                      <strong>User:</strong> {patient.restriction_details.user_type_label}<br/>
                                      <strong>Opened by:</strong> {patient.restriction_details.opened_by_name}<br/>
                                      <strong>Opened at:</strong> {new Date(patient.restriction_details.opened_at).toLocaleString()}
                                    </p>
                                    <p className="mt-1 text-green-700">
                                      <strong>Note:</strong> CA cannot request handover or request this case note.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </button>

                        {/* Handover Request Button - Separate from clickable area */}
                        {!patient.is_available && patient.has_existing_requests && patient.handover_status !== "requested" && patient.handover_status !== "mr_staff_opened" && onRequestHandover && (
                          <div className="flex-shrink-0">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('🔵 Handover request button clicked for:', patient.name);
                                onRequestHandover(patient);
                              }}
                              className="text-xs h-7 px-3 bg-purple-600 hover:bg-purple-700 text-white border-purple-600 hover:border-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-1"
                            >
                              <User className="w-3 h-3 mr-1" />
                              Request Handover
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
