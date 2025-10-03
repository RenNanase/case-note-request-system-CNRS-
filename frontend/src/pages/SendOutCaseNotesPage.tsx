import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/contexts/ToastContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Send,
  Inbox,
  History,
  FileText,
  CheckCircle,
  Clock,
  Loader2
} from 'lucide-react';
import { resourcesApi, requestsApi } from '@/api/requests';
import { sendOutApi } from '@/api/sendOut';

interface User {
  id: number;
  name: string;
  email: string;
}

interface Department {
  id: number;
  name: string;
  code: string;
}

interface Doctor {
  id: number;
  name: string;
  // Doctors are now independent of departments
  is_active?: boolean;
}

interface CaseNoteRequest {
  id: number;
  request_number: string;
  patient: {
    id: number;
    name: string;
    mrn: string;
  };
  doctor: {
    id: number;
    name: string;
  };
  department: {
    id: number;
    name: string;
  };
  status: string;
  created_at: string;
  approved_at: string;
}

interface SendOutCaseNote {
  id: number;
  send_out_number: string;
  sent_by_user_id: number;
  sent_to_user_id: number;
  case_note_count: number;
  status: string;
  sent_at: string;
  Acknowledge_at?: string;
  sentBy?: User;
  sentTo?: User;
  department?: Department;
  doctor?: Doctor;
}

const SendOutCaseNotesPage: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('send-out');

  // Send Out State
  const [availableCaseNotes, setAvailableCaseNotes] = useState<CaseNoteRequest[]>([]);
  const [caUsers, setCaUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedCaseNotes, setSelectedCaseNotes] = useState<Set<number>>(new Set());
  const [selectedCAUserId, setSelectedCAUserId] = useState<string>('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Receive State
  const [receivedCaseNotes, setReceivedCaseNotes] = useState<any[]>([]);
  const [selectedSenderId, setSelectedSenderId] = useState<number | null>(null);
  const [senderCaseNotes, setSenderCaseNotes] = useState<CaseNoteRequest[]>([]);
  const [selectedReceivedCaseNotes, setSelectedReceivedCaseNotes] = useState<Set<number>>(new Set());
  const [acknowledgmentNotes, setAcknowledgmentNotes] = useState('');
  const [receiveLoading, setReceiveLoading] = useState(false);
  const [acknowledging, setAcknowledging] = useState(false);

  // History State
  const [sendOutHistory, setSendOutHistory] = useState<SendOutCaseNote[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Modal State
  const [selectedSendOut, setSelectedSendOut] = useState<SendOutCaseNote | null>(null);
  const [sendOutDetails, setSendOutDetails] = useState<CaseNoteRequest[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadAvailableCaseNotes(),
        loadCAUsers(),
        loadDepartments(),
        loadDoctors(),
        loadReceivedCaseNotes(),
        loadSendOutHistory()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
      toast({ title: 'Failed to load data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableCaseNotes = async () => {
    try {
      const response = await sendOutApi.getAvailableCaseNotes();
      if (response.success) {
        setAvailableCaseNotes((response as any).case_notes || []);
      } else {
        console.error('Failed to load available case notes:', response);
        setAvailableCaseNotes([]);
      }
    } catch (error) {
      console.error('Error loading available case notes:', error);
      setAvailableCaseNotes([]);
    }
  };

  const loadCAUsers = async () => {
    try {
      const response = await sendOutApi.getCAUsers();
      if (response.success) {
        setCaUsers((response as any).users || []);
      } else {
        console.error('Failed to load CA users:', response);
        setCaUsers([]);
      }
    } catch (error) {
      console.error('Error loading CA users:', error);
      setCaUsers([]);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await resourcesApi.getDepartments();
      console.log('Departments response:', response);
      if (response.success) {
        setDepartments(response.departments || []);
      } else {
        console.error('Failed to load departments:', response);
      }
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  const loadDoctors = async () => {
    try {
      const response = await resourcesApi.getDoctors();
      console.log('Doctors response:', response);
      if (response.success) {
        setDoctors(response.doctors || []);
      } else {
        console.error('Failed to load doctors:', response);
      }
    } catch (error) {
      console.error('Error loading doctors:', error);
    }
  };

  const loadReceivedCaseNotes = async () => {
    setReceiveLoading(true);
    try {
      const response = await sendOutApi.getReceivedCaseNotes();
      if (response.success) {
        setReceivedCaseNotes((response as any).received_case_notes || []);
      }
    } catch (error) {
      console.error('Error loading received case notes:', error);
    } finally {
      setReceiveLoading(false);
    }
  };

  const loadSendOutHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await sendOutApi.getSendOutHistory('sent');
      if (response.success) {
        setSendOutHistory((response as any).send_outs || []);
      }
    } catch (error) {
      console.error('Error loading send out history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Load send out details for modal
  const loadSendOutDetails = async (sendOutId: number) => {
    setDetailsLoading(true);
    try {
      const response = await sendOutApi.getSendOutDetails(sendOutId);
      if (response.success) {
        setSendOutDetails((response as any).case_notes || []);
      }
    } catch (error) {
      console.error('Error loading send out details:', error);
      toast({ title: 'Failed to load details', variant: 'destructive' });
    } finally {
      setDetailsLoading(false);
    }
  };

  // Handle click on history item
  const handleHistoryItemClick = async (sendOut: SendOutCaseNote) => {
    setSelectedSendOut(sendOut);
    setDetailsModalOpen(true);
    await loadSendOutDetails(sendOut.id);
  };

  const handleDepartmentChange = (departmentId: string) => {
    setSelectedDepartmentId(departmentId);
    setSelectedDoctorId('');
  };

  const handleCaseNoteSelection = (caseNoteId: number, checked: boolean) => {
    const newSelection = new Set(selectedCaseNotes);
    if (checked) {
      if (newSelection.size >= 20) {
        toast({ title: 'Maximum 20 case notes can be selected', variant: 'destructive' });
        return;
      }
      newSelection.add(caseNoteId);
    } else {
      newSelection.delete(caseNoteId);
    }
    setSelectedCaseNotes(newSelection);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const maxSelect = Math.min(20, availableCaseNotes.length);
      const newSelection = new Set(availableCaseNotes.slice(0, maxSelect).map(cn => cn.id));
      setSelectedCaseNotes(newSelection);
    } else {
      setSelectedCaseNotes(new Set());
    }
  };

  const handleSendOut = async () => {
    if (!selectedCAUserId || !selectedDepartmentId || !selectedDoctorId || selectedCaseNotes.size === 0) {
      toast({ title: 'Please fill in all required fields and select case notes', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const response = await sendOutApi.sendOutCaseNotes({
        sent_to_user_id: parseInt(selectedCAUserId),
        department_id: parseInt(selectedDepartmentId),
        doctor_id: parseInt(selectedDoctorId),
        case_note_ids: Array.from(selectedCaseNotes),
        notes: notes.trim() || undefined
      });

      if (response.success) {
        toast({ title: 'Case notes sent out successfully', variant: 'success' });
        // Reset form
        setSelectedCaseNotes(new Set());
        setSelectedCAUserId('');
        setSelectedDepartmentId('');
        setSelectedDoctorId('');
        setNotes('');
        setDoctors([]);
        // Reload data
        await loadAvailableCaseNotes();
        await loadSendOutHistory();
      } else {
        toast({ title: response.message || 'Failed to send out case notes', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error sending out case notes:', error);
      toast({ title: 'Failed to send out case notes', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSenderSelection = async (senderId: number) => {
    setSelectedSenderId(senderId);
    try {
      const response = await sendOutApi.getCaseNotesFromSender(senderId);
      if (response.success) {
        setSenderCaseNotes((response as any).case_notes || []);
      }
    } catch (error) {
      console.error('Error loading case notes from sender:', error);
    }
  };

  const handleReceivedCaseNoteSelection = (caseNoteId: number, checked: boolean) => {
    const newSelection = new Set(selectedReceivedCaseNotes);
    if (checked) {
      newSelection.add(caseNoteId);
    } else {
      newSelection.delete(caseNoteId);
    }
    setSelectedReceivedCaseNotes(newSelection);
  };

  const handleAcknowledge = async () => {
    if (selectedReceivedCaseNotes.size === 0) {
      toast({ title: 'Please select case notes to acknowledge', variant: 'destructive' });
      return;
    }

    setAcknowledging(true);
    try {
      const response = await sendOutApi.acknowledgeCaseNotes({
        case_note_ids: Array.from(selectedReceivedCaseNotes),
        acknowledgment_notes: acknowledgmentNotes.trim() || undefined
      });

      if (response.success) {
        toast({ title: 'Case notes Acknowledge successfully', variant: 'success' });
        // Reset form
        setSelectedReceivedCaseNotes(new Set());
        setAcknowledgmentNotes('');
        setSelectedSenderId(null);
        setSenderCaseNotes([]);
        // Reload data
        await loadReceivedCaseNotes();
      } else {
        toast({ title: response.message || 'Failed to acknowledge case notes', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error acknowledging case notes:', error);
      toast({ title: 'Failed to acknowledge case notes', variant: 'destructive' });
    } finally {
      setAcknowledging(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pending</Badge>;
      case 'Acknowledge':
        return <Badge variant="outline" className="text-green-600 border-green-600">Acknowledge</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="text-red-600 border-red-600">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Send Out Case Notes</h1>
          <p className="text-gray-600 mt-2">
            Manage case note transfers between CA users
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="send-out" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Send Out
          </TabsTrigger>
          <TabsTrigger value="receive" className="flex items-center gap-2">
            <Inbox className="h-4 w-4" />
            Receive
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Send Out Tab */}
        <TabsContent value="send-out" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Send Out Case Notes
              </CardTitle>
              <CardDescription>
                Select case notes to send to another CA user. Maximum 20 case notes per send out.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1: Select Target CA */}
              <div className="space-y-2">
                <Label htmlFor="ca-user">Select CA User *</Label>
                <Select value={selectedCAUserId} onValueChange={setSelectedCAUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a CA user to send case notes to" />
                  </SelectTrigger>
                  <SelectContent>
                    {caUsers.map((user, index) => (
                      <SelectItem key={user.id || `user-${index}`} value={user.id ? user.id.toString() : `user-${index}`}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Step 2: Select Department */}
              <div className="space-y-2">
                <Label htmlFor="department">Select Department *</Label>
                <Select value={selectedDepartmentId} onValueChange={handleDepartmentChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept, index) => (
                      <SelectItem key={dept.id || `dept-${index}`} value={dept.id ? dept.id.toString() : `dept-${index}`}>
                        {dept.name} ({dept.code || 'N/A'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Step 3: Select Doctor */}
              <div className="space-y-2">
                <Label htmlFor="doctor">Select Doctor *</Label>
                <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map((doctor, index) => (
                      <SelectItem key={doctor.id || `doctor-${index}`} value={doctor.id ? doctor.id.toString() : `doctor-${index}`}>
                        {doctor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Step 4: Select Case Notes */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Select Case Notes *</Label>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="select-all"
                      checked={selectedCaseNotes.size === Math.min(20, availableCaseNotes.length) && availableCaseNotes.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                    <Label htmlFor="select-all" className="text-sm">Select All (Max 20)</Label>
                  </div>
                </div>

                <div className="grid gap-3 max-h-96 overflow-y-auto">
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))
                  ) : !Array.isArray(availableCaseNotes) || availableCaseNotes.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No case notes available for sending out</p>
                      <p className="text-sm">Case notes must be approved and not yet returned to MR</p>
                    </div>
                  ) : (
                    Array.isArray(availableCaseNotes) ? availableCaseNotes.map((caseNote) => (
                      <div
                        key={caseNote.id}
                        className={`p-4 border rounded-lg transition-colors ${
                          selectedCaseNotes.has(caseNote.id)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedCaseNotes.has(caseNote.id)}
                            onCheckedChange={(checked) => handleCaseNoteSelection(caseNote.id, checked as boolean)}
                            disabled={!selectedCaseNotes.has(caseNote.id) && selectedCaseNotes.size >= 20}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-gray-900">{caseNote.patient.name}</h4>
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                {caseNote.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">MRN: {caseNote.patient.mrn}</p>
                            <p className="text-sm text-gray-600">
                              {caseNote.department.name} - {caseNote.doctor.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              Request: {caseNote.request_number} | Approved: {new Date(caseNote.approved_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    )) : null
                  )}
                </div>

                {selectedCaseNotes.size > 0 && (
                  <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
                    {selectedCaseNotes.size} case note(s) selected
                  </div>
                )}
              </div>

              {/* Step 5: Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any notes about this send out..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Send Out Button */}
              <Button
                onClick={handleSendOut}
                disabled={submitting || !selectedCAUserId || !selectedDepartmentId || !selectedDoctorId || selectedCaseNotes.size === 0}
                className="w-full"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending Out...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Out {selectedCaseNotes.size} Case Note(s)
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Receive Tab */}
        <TabsContent value="receive" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Inbox className="h-5 w-5" />
                Receive Case Notes
              </CardTitle>
              <CardDescription>
                Acknowledge case notes received from other CA users.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {receiveLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : receivedCaseNotes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Inbox className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No case notes received</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {receivedCaseNotes.map((sender) => (
                    <div
                      key={sender.sender_id}
                      className="p-4 border rounded-lg cursor-pointer hover:border-blue-300 transition-colors"
                      onClick={() => handleSenderSelection(sender.sender_id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{sender.sender_name}</h4>
                          <p className="text-sm text-gray-600">{sender.sender_email}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{sender.pending_case_notes} pending</p>
                          <p className="text-xs text-gray-500">
                            {sender.send_out_count} send out(s)
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Case Notes from Selected Sender */}
              {selectedSenderId && senderCaseNotes.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Case Notes from Sender</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 max-h-96 overflow-y-auto">
                      {senderCaseNotes.map((caseNote) => (
                        <div
                          key={caseNote.id}
                          className={`p-4 border rounded-lg transition-colors ${
                            selectedReceivedCaseNotes.has(caseNote.id)
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          } ${(caseNote as any).is_acknowledged ? 'opacity-50' : ''}`}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={selectedReceivedCaseNotes.has(caseNote.id)}
                              onCheckedChange={(checked) => handleReceivedCaseNoteSelection(caseNote.id, checked as boolean)}
                              disabled={(caseNote as any).is_acknowledged}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium text-gray-900">{caseNote.patient?.name || 'Unknown Patient'}</h4>
                                <div className="flex items-center gap-2">
                                  {(caseNote as any).is_acknowledged ? (
                                    <Badge variant="outline" className="text-green-600 border-green-600">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Acknowledge
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                                      <Clock className="h-3 w-3 mr-1" />
                                      Pending
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <p className="text-sm text-gray-600">MRN: {caseNote.patient?.mrn || 'N/A'}</p>
                              <p className="text-sm text-gray-600">
                                {caseNote.department?.name || 'N/A'} - {caseNote.doctor?.name || 'N/A'}
                              </p>
                              <p className="text-xs text-gray-500">
                                Sent: {new Date(caseNote.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {selectedReceivedCaseNotes.size > 0 && (
                      <div className="space-y-4">
                        <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
                          {selectedReceivedCaseNotes.size} case note(s) selected for acknowledgment
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="acknowledgment-notes">Acknowledgment Notes (Optional)</Label>
                          <Textarea
                            id="acknowledgment-notes"
                            placeholder="Add any notes about the received case notes..."
                            value={acknowledgmentNotes}
                            onChange={(e) => setAcknowledgmentNotes(e.target.value)}
                            rows={3}
                          />
                        </div>

                        <Button
                          onClick={handleAcknowledge}
                          disabled={acknowledging}
                          className="w-full bg-green-600 hover:bg-green-700"
                        >
                          {acknowledging ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Acknowledging...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Acknowledge {selectedReceivedCaseNotes.size} Case Note(s)
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Send Out History
              </CardTitle>
              <CardDescription>
                View history of all case notes you have sent out.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : sendOutHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No send out history found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sendOutHistory.map((sendOut) => (
                    <div
                      key={sendOut.id}
                      className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => handleHistoryItemClick(sendOut)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{sendOut.send_out_number}</h4>
                          <p className="text-sm text-gray-600">
                            Sent to: {sendOut.sentTo?.name || 'Unknown CA'}
                          </p>
                          <p className="text-sm text-gray-600">
                            {sendOut.department?.name} - {sendOut.doctor?.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {sendOut.case_note_count} case note(s) | Sent: {new Date(sendOut.sent_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          {getStatusBadge(sendOut.status)}
                          {sendOut.Acknowledge_at && (
                            <p className="text-xs text-gray-500 mt-1">
                              Acknowledge: {new Date(sendOut.Acknowledge_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Send Out Details Modal */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Send Out Details - {selectedSendOut?.send_out_number}
            </DialogTitle>
            <DialogDescription>
              Case notes sent to {selectedSendOut?.sentTo?.name || 'Unknown CA'} on {selectedSendOut?.sent_at ? new Date(selectedSendOut.sent_at).toLocaleDateString() : 'Unknown date'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {detailsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : sendOutDetails.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No case notes found for this send out</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sendOutDetails.map((caseNote) => (
                  <div key={caseNote.id} className="p-4 border rounded-lg bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">
                          {caseNote.patient?.name || 'Unknown Patient'}
                        </h4>
                        <p className="text-sm text-gray-600">
                          MRN: {caseNote.patient?.mrn || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-600">
                          Request #: {caseNote.request_number}
                        </p>
                        <p className="text-sm text-gray-600">
                          Department: {caseNote.department?.name || 'N/A'}
                        </p>
                        {caseNote.doctor && (
                          <p className="text-sm text-gray-600">
                            Doctor: {caseNote.doctor.name}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Sent
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SendOutCaseNotesPage;
