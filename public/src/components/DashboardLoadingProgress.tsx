import { Card, CardContent } from '@/components/ui/card';
import { Activity, Zap } from 'lucide-react';

interface DashboardLoadingProgressProps {
  progress: number;
  executionTime?: number;
  cached?: boolean;
}

export function DashboardLoadingProgress({ progress, executionTime, cached }: DashboardLoadingProgressProps) {
  // Don't show progress component if data is cached or if progress is 0
  if (progress === 0 || cached) return null;

  // Only show progress for fresh data loading
  if (progress < 100) {
    return (
      <Card className="mb-6 border-blue-200 bg-blue-50 animate-in fade-in duration-300">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Activity className="h-5 w-5 text-blue-600 animate-pulse" />
              <div>
                <h3 className="text-sm font-medium text-blue-900">
                  Loading dashboard...
                </h3>
                <p className="text-xs text-blue-700">
                  Please wait while we gather your information
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Progress bar */}
              <div className="w-24 bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Performance metrics - only show for fresh loads */}
              {executionTime && (
                <div className="flex items-center space-x-1 text-xs text-blue-700">
                  <Zap className="h-3 w-3" />
                  <span>{executionTime}ms</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Don't show anything when complete
  return null;
}
