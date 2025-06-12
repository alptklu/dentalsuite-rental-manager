import React, { useState, useEffect, useMemo } from 'react';
import { PlusIcon, CalendarIcon, RefreshCw, Clock, User, MapPin } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from 'date-fns';

import { Button } from '@/components/ui/button';
import { ApartmentForm } from '@/components/ApartmentForm';
import { ApartmentList } from '@/components/ApartmentList';
import { useAppStore } from '@/store';
import { Layout } from '@/components/Layout';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Apartment, Booking } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const ApartmentsPage = () => {
  const { 
    apartments, 
    bookings, 
    loading,
    refreshData,
    addApartment, 
    updateApartment, 
    deleteApartment, 
    toggleApartmentFavorite 
  } = useAppStore();
  
  const [showForm, setShowForm] = useState(false);
  const [editingApartment, setEditingApartment] = useState<Apartment | null>(null);
  const [apartmentToDelete, setApartmentToDelete] = useState<string | null>(null);
  const [selectedApartmentId, setSelectedApartmentId] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const { toast } = useToast();
  
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
  
  const handleAddNew = () => {
    setEditingApartment(null);
    setShowForm(true);
  };
  
  const handleEdit = (apartment: Apartment) => {
    setEditingApartment(apartment);
    setShowForm(true);
  };
  
  const handleDelete = (apartmentId: string) => {
    setApartmentToDelete(apartmentId);
  };
  
  const confirmDelete = async () => {
    if (apartmentToDelete) {
      try {
        await deleteApartment(apartmentToDelete);
        setApartmentToDelete(null);
        // Clear selection if deleted apartment was selected
        if (selectedApartmentId === apartmentToDelete) {
          setSelectedApartmentId(null);
        }
        toast({
          title: "Apartment deleted",
          description: "The apartment has been removed successfully.",
        });
      } catch {
        toast({
          title: "Error",
          description: "Failed to delete apartment. Please try again.",
          variant: "destructive",
        });
      }
    }
  };
  
  const handleFormSubmit = async (data: { name: string; properties: string[] }) => {
    try {
      if (editingApartment) {
        await updateApartment(editingApartment.id, data);
        toast({
          title: "Apartment updated",
          description: "The apartment has been updated successfully.",
        });
      } else {
        await addApartment(data);
        toast({
          title: "Apartment created",
          description: "The new apartment has been added successfully.",
        });
      }
      setShowForm(false);
      setEditingApartment(null);
    } catch {
      toast({
        title: "Error",
        description: `Failed to ${editingApartment ? 'update' : 'create'} apartment. Please try again.`,
        variant: "destructive",
      });
    }
  };

  const handleApartmentSelect = (apartmentId: string) => {
    setSelectedApartmentId(selectedApartmentId === apartmentId ? null : apartmentId);
  };
  
  const handleToggleFavorite = async (apartmentId: string) => {
    try {
      await toggleApartmentFavorite(apartmentId);
      const apartment = apartments.find(a => a.id === apartmentId);
      if (apartment) {
        toast({
          title: apartment.isFavorite ? "Removed from favorites" : "Added to favorites",
          description: `${apartment.name} has been ${apartment.isFavorite ? 'removed from' : 'added to'} favorites.`,
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to update favorite status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRefresh = async () => {
    try {
      await refreshData();
      toast({
        title: "Data refreshed",
        description: "All data has been refreshed from the server.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to refresh data. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Get selected apartment details
  const selectedApartment = selectedApartmentId 
    ? apartments.find(apt => apt.id === selectedApartmentId)
    : null;
  
  // Get bookings for selected apartment
  const selectedApartmentBookings = selectedApartmentId
    ? bookings.filter(booking => booking.apartmentId === selectedApartmentId)
    : [];

  // Get days in current month for calendar view
  const daysInMonth = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth)
    });
  }, [currentMonth]);

  // Calculate availability for selected apartment
  const apartmentAvailability = useMemo(() => {
    if (!selectedApartmentId) return {};
    
    const availability: Record<string, { isAvailable: boolean; booking?: Booking }> = {};
    
    daysInMonth.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      
      // Check if apartment is booked on this day
      const booking = selectedApartmentBookings.find(booking => {
        const bookingStart = new Date(booking.checkIn);
        const bookingEnd = new Date(booking.checkOut);
        return day >= bookingStart && day < bookingEnd;
      });
      
      availability[dateStr] = {
        isAvailable: !booking,
        booking: booking
      };
    });
    
    return availability;
  }, [selectedApartmentId, selectedApartmentBookings, daysInMonth]);

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold">Apartments</h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={loading}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={handleAddNew}>
                <PlusIcon className="mr-2 h-4 w-4" />
                Add New
              </Button>
            </div>
          </div>
          
          {showForm ? (
            <ApartmentForm
              apartment={editingApartment || undefined}
              onSubmit={handleFormSubmit}
              onCancel={() => {
                setShowForm(false);
                setEditingApartment(null);
              }}
            />
          ) : (
            <ApartmentList
              apartments={apartments}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleFavorite={handleToggleFavorite}
              selectedApartmentIds={selectedApartmentId ? [selectedApartmentId] : []}
              onToggleSelect={handleApartmentSelect}
            />
          )}
        </div>
        
        {!showForm && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-bold">Apartment Details</h2>
              {selectedApartment && (
                <div className="text-sm text-muted-foreground">
                  {selectedApartmentBookings.length} booking{selectedApartmentBookings.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
            
            {!selectedApartment ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-muted-foreground">
                    <MapPin className="mx-auto h-12 w-12 opacity-30 mb-4" />
                    <p className="text-lg mb-2">Select an apartment to view details</p>
                    <p className="text-sm">Click on any apartment from the list to see its occupancy and bookings</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Apartment Info Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {selectedApartment.name}
                      {selectedApartment.isFavorite && (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          ⭐ Favorite
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Properties</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedApartment.properties.length > 0 ? (
                            selectedApartment.properties.map((property) => (
                              <Badge key={property} variant="outline">
                                {property}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">No properties defined</span>
                          )}
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Total Bookings:</span>
                          <span className="font-medium">{selectedApartmentBookings.length}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">This Month:</span>
                          <span className="font-medium">
                            {selectedApartmentBookings.filter(booking => {
                              const bookingMonth = new Date(booking.checkIn).getMonth();
                              const currentMonthNum = currentMonth.getMonth();
                              return bookingMonth === currentMonthNum;
                            }).length}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Monthly Calendar */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Monthly Occupancy</CardTitle>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                        >
                          ←
                        </Button>
                        <span className="text-sm font-medium min-w-[120px] text-center">
                          {format(currentMonth, 'MMMM yyyy')}
                        </span>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                        >
                          →
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-7 gap-1 mb-4">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-center text-xs font-medium p-2 text-muted-foreground">
                          {day}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {daysInMonth.map(day => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const dayData = apartmentAvailability[dateStr];
                        const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                        
                        return (
                          <div
                            key={dateStr}
                            className={`
                              relative p-2 text-center text-xs border rounded
                              ${dayData?.isAvailable 
                                ? 'bg-green-50 border-green-200 text-green-800' 
                                : 'bg-red-50 border-red-200 text-red-800'
                              }
                              ${isToday ? 'ring-2 ring-blue-500' : ''}
                            `}
                            title={
                              dayData?.booking 
                                ? `Booked by ${dayData.booking.guestName}`
                                : 'Available'
                            }
                          >
                            <div className="font-medium">{format(day, 'd')}</div>
                            {dayData?.booking && (
                              <div className="text-xs truncate mt-1 leading-tight">
                                {dayData.booking.guestName}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-4 mt-4 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-green-50 border border-green-200 rounded"></div>
                        <span>Available</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-red-50 border border-red-200 rounded"></div>
                        <span>Booked</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Bookings List */}
                {selectedApartmentBookings.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Upcoming Bookings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {selectedApartmentBookings
                          .sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime())
                          .map((booking) => (
                            <div key={booking.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <div className="font-medium">{booking.guestName}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {format(new Date(booking.checkIn), 'MMM d')} - {format(new Date(booking.checkOut), 'MMM d, yyyy')}
                                  </div>
                                </div>
                              </div>
                              {booking.temporaryApartment && (
                                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                                  Temp: {booking.temporaryApartment}
                                </Badge>
                              )}
                            </div>
                          ))
                        }
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <AlertDialog open={!!apartmentToDelete} onOpenChange={() => setApartmentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the apartment
              and all its associated bookings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default ApartmentsPage;
