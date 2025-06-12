import React, { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, addDays, differenceInDays } from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Star, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';

export function OccupancyCalendar() {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDateRange, setSelectedDateRange] = useState<{ from: Date | null; to: Date | null }>({
    from: null,
    to: null
  });
  const [selectedApartments, setSelectedApartments] = useState<string[]>([]);
  const { apartments, bookings } = useAppStore();
  
  // Navigate to next/previous month
  const handlePreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  
  // Get days in current month
  const daysInMonth = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth)
    });
  }, [currentMonth]);

  // Calculate apartment availability for each day
  const apartmentAvailability = useMemo(() => {
    const availability: Record<string, Record<string, boolean>> = {};
    
    apartments.forEach(apartment => {
      availability[apartment.id] = {};
      
      daysInMonth.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        
        // Check if apartment is booked on this day
        const isBooked = bookings.some(booking => {
          if (booking.apartmentId !== apartment.id) return false;
          
          const bookingStart = new Date(booking.checkIn);
          const bookingEnd = new Date(booking.checkOut);
          
          return day >= bookingStart && day < bookingEnd; // Exclude checkout day
        });
        
        availability[apartment.id][dateStr] = !isBooked;
      });
    });
    
    return availability;
  }, [apartments, bookings, daysInMonth]);

  // Find available apartments for selected date range
  const availableApartmentsForRange = useMemo(() => {
    if (!selectedDateRange.from || !selectedDateRange.to) return [];
    
    const daysInRange = eachDayOfInterval({
      start: selectedDateRange.from,
      end: selectedDateRange.to
    });
    
    return apartments.filter(apartment => {
      return daysInRange.every(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        return apartmentAvailability[apartment.id]?.[dateStr] !== false;
      });
    });
  }, [selectedDateRange, apartments, apartmentAvailability]);

  // Get bookings for a specific day and apartment
  const getBookingForDay = (apartmentId: string, day: Date) => {
    return bookings.find(booking => {
      if (booking.apartmentId !== apartmentId) return false;
      
      const bookingStart = new Date(booking.checkIn);
      const bookingEnd = new Date(booking.checkOut);
      
      return day >= bookingStart && day < bookingEnd;
    });
  };

  // Render apartment row
  const renderApartmentRow = (apartment: any) => {
    const isSelected = selectedApartments.includes(apartment.id);
    
    return (
      <div key={apartment.id} className={`border-b ${isSelected ? 'bg-blue-50' : ''}`}>
        <div className={`grid gap-0`} style={{ gridTemplateColumns: `minmax(120px, 200px) repeat(${daysInMonth.length}, 1fr)` }}>
          {/* Apartment name column */}
          <div 
            className={`p-2 sm:p-3 border-r bg-gray-50 cursor-pointer hover:bg-gray-100 ${isSelected ? 'bg-blue-100' : ''}`}
            onClick={() => {
              setSelectedApartments(prev => 
                prev.includes(apartment.id)
                  ? prev.filter(id => id !== apartment.id)
                  : [...prev, apartment.id]
              );
            }}
          >
            <div className="flex items-center gap-1 sm:gap-2">
              {apartment.isFavorite && <Star className="h-3 w-3 sm:h-4 sm:w-4 fill-yellow-400 text-yellow-400 flex-shrink-0" />}
              <span className="font-medium text-xs sm:text-sm truncate">{apartment.name}</span>
              {isSelected && <Check className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 flex-shrink-0" />}
            </div>
          </div>
          
          {/* Days grid */}
          {daysInMonth.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const isAvailable = apartmentAvailability[apartment.id]?.[dateStr] !== false;
            const booking = getBookingForDay(apartment.id, day);
            const isInSelectedRange = selectedDateRange.from && selectedDateRange.to &&
              day >= selectedDateRange.from && day <= selectedDateRange.to;
            
            return (
              <div
                key={dateStr}
                className={`h-8 sm:h-10 border border-gray-200 flex items-center justify-center text-xs ${
                  isAvailable 
                    ? isInSelectedRange 
                      ? 'bg-green-200' 
                      : 'bg-green-50 hover:bg-green-100'
                    : 'bg-red-100'
                }`}
                title={
                  isAvailable 
                    ? 'Available' 
                    : booking 
                      ? `Booked by ${booking.guestName}`
                      : 'Unavailable'
                }
              >
                {isAvailable ? (
                  <Check className="h-2 w-2 sm:h-3 sm:w-3 text-green-600" />
                ) : (
                  <X className="h-2 w-2 sm:h-3 sm:w-3 text-red-600" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Handle date range selection
  const handleDateRangeChange = (from: Date | null, to: Date | null) => {
    setSelectedDateRange({ from, to });
  };

  const clearSelection = () => {
    setSelectedDateRange({ from: null, to: null });
    setSelectedApartments([]);
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="grid" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="grid" className="text-xs sm:text-sm">Availability Grid</TabsTrigger>
          <TabsTrigger value="finder" className="text-xs sm:text-sm">Date Range Finder</TabsTrigger>
        </TabsList>
        
        <TabsContent value="grid" className="space-y-4">
          {/* Month navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              <h3 className="font-medium text-sm sm:text-base">{format(currentMonth, 'MMMM yyyy')}</h3>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2">
              <Button variant="outline" size="sm" onClick={handlePreviousMonth}>
                <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="sr-only sm:not-sr-only sm:ml-1 text-xs">Prev</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleNextMonth}>
                <span className="sr-only sm:not-sr-only sm:mr-1 text-xs">Next</span>
                <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>

          {/* Calendar grid container */}
          <div className="overflow-x-auto">
            <div className="min-w-max">
              {/* Days header */}
              <div className={`grid gap-0 border-b-2`} style={{ gridTemplateColumns: `minmax(120px, 200px) repeat(${daysInMonth.length}, 1fr)` }}>
                <div className="p-2 sm:p-3 font-medium bg-gray-100 border-r text-xs sm:text-sm">Apartment</div>
                {daysInMonth.map((day, index) => (
                  <div key={index} className="p-1 sm:p-2 text-center font-medium bg-gray-100 border border-gray-200 min-w-[30px] sm:min-w-[40px]">
                    <div className="text-xs">{format(day, 'E')}</div>
                    <div className="text-xs sm:text-sm font-bold">{format(day, 'd')}</div>
                  </div>
                ))}
              </div>

              {/* Apartment rows */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                {apartments.map(renderApartmentRow)}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-50 border border-green-200 rounded flex items-center justify-center">
                <Check className="h-1.5 w-1.5 sm:h-2 sm:w-2 text-green-600" />
              </div>
              <span>Available</span>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-100 border border-red-200 rounded flex items-center justify-center">
                <X className="h-1.5 w-1.5 sm:h-2 sm:w-2 text-red-600" />
              </div>
              <span>Booked</span>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2">
              <Star className="h-3 w-3 sm:h-4 sm:w-4 fill-yellow-400 text-yellow-400" />
              <span>Favorite</span>
            </div>
          </div>

          {selectedApartments.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-medium">
                    {selectedApartments.length} apartment{selectedApartments.length > 1 ? 's' : ''} selected
                  </span>
                  <Button variant="outline" size="sm" onClick={clearSelection} className="text-xs">
                    Clear
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="finder" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Find Available Apartments</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Select a date range to see which apartments are available for the entire period
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs sm:text-sm">Check-in Date</Label>
                  <DatePicker
                    selected={selectedDateRange.from}
                    onSelect={(date) => handleDateRangeChange(date, selectedDateRange.to)}
                    placeholder="Select check-in date"
                  />
                </div>
                <div>
                  <Label className="text-xs sm:text-sm">Check-out Date</Label>
                  <DatePicker
                    selected={selectedDateRange.to}
                    onSelect={(date) => handleDateRangeChange(selectedDateRange.from, date)}
                    placeholder="Select check-out date"
                    disabled={!selectedDateRange.from}
                    minDate={selectedDateRange.from ? addDays(selectedDateRange.from, 1) : undefined}
                  />
                </div>
              </div>

              {selectedDateRange.from && selectedDateRange.to && (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <span className="font-medium text-xs sm:text-sm">
                      Available for {format(selectedDateRange.from, 'MMM d')} - {format(selectedDateRange.to, 'MMM d, yyyy')}
                      ({differenceInDays(selectedDateRange.to, selectedDateRange.from)} nights)
                    </span>
                    <Badge variant={availableApartmentsForRange.length > 0 ? "default" : "destructive"} className="text-xs w-fit">
                      {availableApartmentsForRange.length} available
                    </Badge>
                  </div>

                  {availableApartmentsForRange.length > 0 ? (
                    <div className="grid gap-2">
                      {availableApartmentsForRange.map(apartment => (
                        <div key={apartment.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-2">
                            {apartment.isFavorite && <Star className="h-3 w-3 sm:h-4 sm:w-4 fill-yellow-400 text-yellow-400" />}
                            <span className="font-medium text-xs sm:text-sm">{apartment.name}</span>
                          </div>
                          <Check className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <X className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-red-500" />
                      <p className="text-xs sm:text-sm">No apartments available for the selected dates</p>
                      <p className="text-xs">Try selecting different dates or a shorter stay</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
