import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Search } from 'lucide-react';

export default function PatientListComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Users className="h-5 w-5 mr-2" />
          Patient List
        </CardTitle>
        <CardDescription>
          View and manage all patient records
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12">
          <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Patient List</h3>
          <p className="text-gray-600 mb-4">
            This feature allows you to view and manage all patient records with search and filtering capabilities.
          </p>
          <Button variant="outline">
            <Search className="h-4 w-4 mr-2" />
            Search Patients
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
