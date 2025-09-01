import { useState, useEffect, useRef } from 'react';
import { Search, User, AlertCircle, Clock, CheckCircle2, XCircle, CheckCircle } from 'lucide-react';
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

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

      {/* Search Results Dropdown */}
      {isOpen && (
        <Card className="absolute z-50 w-full mt-1 max-h-80 overflow-y-auto shadow-lg border">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 space-y-3">
                {[...Array(3)].map((_, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="p-4 text-center">
                <AlertCircle className="h-6 w-6 text-red-500 mx-auto mb-2" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            ) : results.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <Search className="h-6 w-6 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No patients found</p>
                <p className="text-xs text-gray-400 mt-1">
                  Try searching with MRN, NRIC, or patient name
                </p>
              </div>
            ) : (
              <div className="py-2">
                {results.map((patient, index) => (
                  <div key={patient.id} className="relative">
                    <button
                      type="button"
                      onClick={() => handlePatientSelect(patient)}
                      disabled={patient.has_existing_requests && !patient.is_available}
                      className={cn(
                        "w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors",
                        focusedIndex === index && "bg-blue-50",
                        patient.has_existing_requests && !patient.is_available && "cursor-not-allowed hover:bg-gray-100",
                        patient.has_existing_requests && !patient.is_available && "bg-pink-50 border-l-4 border-l-red-300"
                      )}
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-gray-100">
                            <User className="h-5 w-5 text-gray-500" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium text-gray-900 truncate">
                              {patient.name}
                            </h3>
                            {patient.has_medical_alerts && (
                              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                            )}
                            {/* Availability indicators */}
                            {patient.has_existing_requests && (
                              patient.handover_status === 'requested' ? (
                                <Badge variant="outline" className="text-xs text-orange-600 border-orange-200">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Handover Requested
                                </Badge>
                              ) : !patient.is_available ? (
                                <Badge variant="destructive" className="text-xs">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Unavailable
                                </Badge>
                              ) : (
                                <Badge variant="default" className="text-xs bg-green-100 text-green-700 border-green-200">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Available
                                </Badge>
                              )
                            )}
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>MRN: {patient.mrn}</span>
                            {patient.nric && patient.nric !== 'N/A' && (
                              <span>NRIC: {patient.nric}</span>
                            )}
                            {patient.nationality_id && (
                              <span>IC: {patient.nationality_id}</span>
                            )}
                          </div>
                          {patient.phone && (
                            <p className="text-xs text-gray-400 mt-1">
                              📞 {patient.phone}
                            </p>
                          )}
                          {/* Status information for patients with existing requests */}
                          {patient.has_existing_requests && (() => {
                            console.log('🔍 Patient availability check:', {
                              name: patient.name,
                              has_existing_requests: patient.has_existing_requests,
                              is_available: patient.is_available,
                              handover_status: patient.handover_status,
                              current_holder: patient.current_holder
                            });
                            return (
                              <div className="mt-2 space-y-1">
                                {patient.handover_status === 'requested' && (
                                  <p className="text-xs text-orange-600">
                                    ⚠️ Handover request pending for this patient
                                  </p>
                                )}
                                {!patient.is_available && patient.current_holder && (
                                  <p className="text-xs text-red-600">
                                    🔒 Currently held by: {patient.current_holder.name}
                                  </p>
                                )}
                                {patient.is_available && patient.has_existing_requests && (
                                  <p className="text-xs text-green-600">
                                    ✅ Available for new request
                                  </p>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </button>

                    {/* Handover request button - positioned outside the main button */}
                    {!patient.is_available && patient.has_existing_requests && onRequestHandover && (
                      <div className="absolute top-2 right-2 z-10">
                        <button
                          type="button"
                          onClick={(e) => {
                            console.log('🔵 Handover button clicked!');
                            e.stopPropagation();
                            console.log('🔵 Request Handover clicked for patient:', patient.name);
                            if (onRequestHandover) {
                              onRequestHandover(patient);
                            } else {
                              console.error('❌ onRequestHandover function is not available');
                            }
                          }}
                          className="text-xs bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors font-medium shadow-sm border border-blue-500"
                        >
                          📋 Request
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
