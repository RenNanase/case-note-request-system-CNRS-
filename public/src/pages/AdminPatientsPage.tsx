import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload,
  Users,
  UserCheck,
  FileSpreadsheet,
  AlertCircle,
  Activity
} from 'lucide-react';
import PatientImportComponent from '@/components/admin/PatientImportComponent';
import PatientListComponent from '@/components/admin/PatientListComponent';
import PatientStatsComponent from '@/components/admin/PatientStatsComponent';
import ImportProgressComponent from '@/components/admin/ImportProgressComponent';

interface PatientStats {
  total_patients: number;
  active_patients: number;
  inactive_patients: number;
  patients_with_nationality_id: number;
  recent_imports: number;
}

export default function AdminPatientsPage() {
  const { hasRole } = useAuth();
  const [stats, setStats] = useState<PatientStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not admin
  if (!hasRole('ADMIN')) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/patients/statistics', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('cnrs_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch statistics');
      }

      const data = await response.json();
      setStats(data.statistics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleImportComplete = () => {
    // Refresh stats after import
    fetchStats();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Patient Management</h1>
            <p className="text-gray-600">Import and manage patient data</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchStats} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patient Management</h1>
          <p className="text-gray-600">Import and manage patient data</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={fetchStats}>
            <Activity className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Patients</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total_patients.toLocaleString()}</p>
                </div>
                <Users className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Patients</p>
                  <p className="text-3xl font-bold text-green-600">{stats.active_patients.toLocaleString()}</p>
                </div>
                <UserCheck className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">With Nationality ID</p>
                  <p className="text-3xl font-bold text-purple-600">{stats.patients_with_nationality_id.toLocaleString()}</p>
                </div>
                <FileSpreadsheet className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Recent Imports</p>
                  <p className="text-3xl font-bold text-orange-600">{stats.recent_imports.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Last 30 days</p>
                </div>
                <Upload className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="import" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="import" className="flex items-center">
            <Upload className="h-4 w-4 mr-2" />
            Import Patients
          </TabsTrigger>
          <TabsTrigger value="progress" className="flex items-center">
            <Activity className="h-4 w-4 mr-2" />
            Import Progress
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center">
            <Users className="h-4 w-4 mr-2" />
            Patient List
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center">
            <Activity className="h-4 w-4 mr-2" />
            Statistics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="import">
          <PatientImportComponent onImportComplete={handleImportComplete} />
        </TabsContent>

        <TabsContent value="progress">
          <ImportProgressComponent onRefresh={handleImportComplete} />
        </TabsContent>

        <TabsContent value="list">
          <PatientListComponent />
        </TabsContent>

        <TabsContent value="stats">
          <PatientStatsComponent stats={stats} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
