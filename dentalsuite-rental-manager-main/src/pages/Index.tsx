import React, { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { OccupancyCalendar } from '@/components/OccupancyCalendar';
import { useAppStore } from '@/store';
import { Layout } from '@/components/Layout';

const Index = () => {
  const { 
    loading,
    refreshData
  } = useAppStore();
  
  // Fetch data on component mount
  useEffect(() => {
    const loadData = async () => {
      await refreshData();
    };
    loadData();
  }, []);
  
  // Auto-refresh data every 30 seconds for real-time sync
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        await refreshData();
      } catch (error) {
        console.error('Auto-refresh failed:', error);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [refreshData]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Dashboard Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              Apartment occupancy overview and availability
            </p>
          </div>
        </div>
        
        {/* Main Calendar Card */}
        <Card className="w-full">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg sm:text-xl">Occupancy Overview</CardTitle>
            <CardDescription className="text-sm">
              Monthly apartment availability and booking status
            </CardDescription>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <OccupancyCalendar />
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Index;
