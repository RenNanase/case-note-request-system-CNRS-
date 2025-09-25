import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  FileText,
  StopCircle,
  Play
} from 'lucide-react';
import { adminPatientsApi } from '@/api/requests';
import { useToast } from '@/contexts/ToastContext';

interface ImportProgress {
  id: number;
  import_type: string;
  file_name: string;
  total_rows: number;
  processed_rows: number;
  imported_count: number;
  skipped_count: number;
  duplicate_count: number;
  error_count: number;
  status: string;
  started_at: string;
  completed_at?: string;
  estimated_completion?: string;
  progress_percentage: number;
  current_batch: number;
  total_batches: number;
  processing_speed: number;
  memory_usage?: string;
  error_log?: any[];
  metadata?: any;
  requested_by_user_id: number;
  created_at: string;
  updated_at: string;
  status_label: string;
  status_color: string;
  is_active: boolean;
  is_completed: boolean;
  remaining_rows: number;
  elapsed_time: string;
  estimated_time_remaining: string;
  progress_bar_color: string;
}

interface ImportProgressComponentProps {
  onRefresh?: () => void;
}

export default function ImportProgressComponent({ onRefresh }: ImportProgressComponentProps) {
  const [activeImports, setActiveImports] = useState<ImportProgress[]>([]);
  const [recentImports, setRecentImports] = useState<ImportProgress[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  const loadImportProgress = async () => {
    try {
      setLoading(true);
      const response = await adminPatientsApi.getImportProgress();
      
      if (response.success) {
        setActiveImports(response.data?.active_imports || []);
        setRecentImports(response.data?.recent_imports || []);
      } else {
        toast({
          title: 'Error',
          description: response.message || 'Failed to load import progress',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error loading import progress:', error);
      toast({
        title: 'Error',
        description: 'Failed to load import progress',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshProgress = async () => {
    setRefreshing(true);
    await loadImportProgress();
    setRefreshing(false);
    onRefresh?.();
  };

  const cancelImport = async (importId: number) => {
    if (!confirm('Are you sure you want to cancel this import? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await adminPatientsApi.cancelImport(importId);
      
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Import cancelled successfully',
        });
        await loadImportProgress();
        onRefresh?.();
      } else {
        toast({
          title: 'Error',
          description: response.message || 'Failed to cancel import',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error cancelling import:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel import',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    loadImportProgress();
    
    // Auto-refresh every 5 seconds for active imports
    const interval = setInterval(() => {
      if (activeImports.length > 0) {
        loadImportProgress();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processing':
        return <Play className="h-4 w-4 text-purple-600" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'cancelled':
        return <StopCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  if (loading && activeImports.length === 0 && recentImports.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Loading import progress...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Imports */}
      {activeImports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Play className="h-5 w-5 mr-2 text-purple-600" />
                Active Imports ({activeImports.length})
              </div>
              <Button
                onClick={refreshProgress}
                disabled={refreshing}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </CardTitle>
            <CardDescription>
              Currently processing patient imports. Progress updates automatically every 5 seconds.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeImports.map((importProgress) => (
              <div key={importProgress.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(importProgress.status)}
                    <div>
                      <h4 className="font-medium">{importProgress.file_name}</h4>
                      <p className="text-sm text-gray-600">
                        Started {importProgress.elapsed_time} ago
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={importProgress.status_color}>
                      {importProgress.status_label}
                    </Badge>
                    <Button
                      onClick={() => cancelImport(importProgress.id)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress: {importProgress.progress_percentage.toFixed(1)}%</span>
                    <span>
                      {importProgress.processed_rows.toLocaleString()} / {importProgress.total_rows.toLocaleString()} rows
                    </span>
                  </div>
                  <Progress 
                    value={importProgress.progress_percentage} 
                    className="h-2"
                  />
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-medium text-green-600">
                      {importProgress.imported_count.toLocaleString()}
                    </div>
                    <div className="text-gray-600">Imported</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-yellow-600">
                      {importProgress.skipped_count.toLocaleString()}
                    </div>
                    <div className="text-gray-600">Skipped</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-purple-600">
                      {importProgress.duplicate_count.toLocaleString()}
                    </div>
                    <div className="text-gray-600">Duplicates</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-red-600">
                      {importProgress.error_count.toLocaleString()}
                    </div>
                    <div className="text-gray-600">Errors</div>
                  </div>
                </div>

                {/* Performance Info */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Speed: </span>
                    <span className="font-medium">
                      {importProgress.processing_speed.toFixed(1)} rows/sec
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">ETA: </span>
                    <span className="font-medium">
                      {importProgress.estimated_time_remaining}
                    </span>
                  </div>
                  {importProgress.memory_usage && (
                    <div>
                      <span className="text-gray-600">Memory: </span>
                      <span className="font-medium">{importProgress.memory_usage}</span>
                    </div>
                  )}
                </div>

                {/* File Info */}
                {importProgress.metadata && (
                  <div className="text-xs text-gray-500">
                    <span>File: {formatFileSize(importProgress.metadata.file_size || 0)} • </span>
                    <span>Type: {importProgress.metadata.file_type} • </span>
                    <span>Uploaded: {new Date(importProgress.metadata.uploaded_at).toLocaleString()}</span>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent Imports */}
      {recentImports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Recent Imports ({recentImports.length})
            </CardTitle>
            <CardDescription>
              Completed and failed imports from the last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentImports.map((importProgress) => (
                <div key={importProgress.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(importProgress.status)}
                    <div>
                      <h4 className="font-medium">{importProgress.file_name}</h4>
                      <p className="text-sm text-gray-600">
                        {importProgress.is_completed ? 'Completed' : 'Failed'} • 
                        {importProgress.total_rows.toLocaleString()} rows • 
                        {importProgress.elapsed_time}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={importProgress.status_color}>
                      {importProgress.status_label}
                    </Badge>
                    <div className="text-sm text-gray-600">
                      {importProgress.imported_count.toLocaleString()} imported
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Imports */}
      {activeImports.length === 0 && recentImports.length === 0 && !loading && (
        <Card>
          <CardContent className="p-6 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Import Activity</h3>
            <p className="text-gray-600">
              No patient imports have been started yet. Use the import form above to begin importing patient data.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {activeImports.some(imp => imp.error_log && imp.error_log.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <AlertCircle className="h-5 w-5 mr-2" />
              Import Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeImports
              .filter(imp => imp.error_log && imp.error_log.length > 0)
              .map((importProgress) => (
                <Alert key={importProgress.id} className="mb-3">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{importProgress.file_name}</strong> - {importProgress.error_log?.length} errors
                    <div className="mt-2 text-sm">
                      {importProgress.error_log?.slice(0, 3).map((error: any, index: number) => (
                        <div key={index} className="text-red-700">
                          Row {error.context?.row}: {error.message}
                        </div>
                      ))}
                      {importProgress.error_log && importProgress.error_log.length > 3 && (
                        <div className="text-gray-600">
                          ... and {importProgress.error_log.length - 3} more errors
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
