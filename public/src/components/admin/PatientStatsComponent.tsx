import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, Users, Activity } from 'lucide-react';

interface PatientStats {
  total_patients: number;
  active_patients: number;
  inactive_patients: number;
  patients_with_nationality_id: number;
  recent_imports: number;
}

interface PatientStatsComponentProps {
  stats: PatientStats | null;
}

export default function PatientStatsComponent({ stats }: PatientStatsComponentProps) {
  if (!stats) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Statistics Available</h3>
            <p className="text-gray-600">Statistics will be displayed here once data is loaded.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const activePercentage = stats.total_patients > 0 
    ? Math.round((stats.active_patients / stats.total_patients) * 100)
    : 0;

  const nationalityIdPercentage = stats.total_patients > 0
    ? Math.round((stats.patients_with_nationality_id / stats.total_patients) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Patient Statistics Overview
          </CardTitle>
          <CardDescription>
            Detailed breakdown of patient data and trends
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-600">{stats.total_patients.toLocaleString()}</p>
              <p className="text-sm text-gray-600">Total Patients</p>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">{activePercentage}%</p>
              <p className="text-sm text-gray-600">Active Rate</p>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Activity className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-600">{stats.recent_imports}</p>
              <p className="text-sm text-gray-600">Recent Imports</p>
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Patient Breakdown</h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="font-medium">Active Patients</span>
                <span className="text-green-600 font-semibold">
                  {stats.active_patients.toLocaleString()} ({activePercentage}%)
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="font-medium">Inactive Patients</span>
                <span className="text-red-600 font-semibold">
                  {stats.inactive_patients.toLocaleString()} ({100 - activePercentage}%)
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="font-medium">With Nationality ID</span>
                <span className="text-purple-600 font-semibold">
                  {stats.patients_with_nationality_id.toLocaleString()} ({nationalityIdPercentage}%)
                </span>
              </div>
            </div>
          </div>

          {/* Import Activity */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Import Activity</h4>
            <div className="p-4 bg-orange-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Recent Imports (30 days)</p>
                  <p className="text-sm text-gray-600">New patients added through Excel imports</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-orange-600">{stats.recent_imports}</p>
                  <p className="text-xs text-gray-500">patients</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
