import React, { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addDays, isSunday, isSaturday, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, TrendingUp, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store';

export function BestDatesRecommendation() {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [stayDuration, setStayDuration] = useState(3);
  const { apartments, bookings, getAvailableApartments } = useAppStore();

  const handlePreviousMonth = () => setSelectedMonth(subMonths(selectedMonth, 1));
  const handleNextMonth = () => setSelectedMonth(addMonths(selectedMonth, 1));
  const handleDecreaseDuration = () => setStayDuration(Math.max(1, stayDuration - 1));
  const handleIncreaseDuration = () => setStayDuration(Math.min(14, stayDuration + 1));

  const bestDates = useMemo(() => {
    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    // Calculate occupancy for each possible stay period
    const stayPeriods = daysInMonth
      .filter(day => {
        const endDate = addDays(day, stayDuration - 1);
        return endDate <= monthEnd; // Ensure stay doesn't go beyond the month
      })
      .map(startDate => {
        const endDate = addDays(startDate, stayDuration - 1);
        const stayDays = eachDayOfInterval({ start: startDate, end: endDate });
        
        // Get available apartments for this period
        const availableApartments = getAvailableApartments(startDate, endDate);
        const hasFavoriteAvailable = availableApartments.some(apt => apt.isFavorite);
        
        // Calculate total occupancy for this period
        let totalOccupancy = 0;
        let hasSunday = false;
        let hasWeekendStart = false;
        
        stayDays.forEach(day => {
          if (isSunday(day)) hasSunday = true;
          if (isSaturday(startDate)) hasWeekendStart = true;
          
          // Count how many apartments are booked on this day
          const dayBookings = bookings.filter(booking => {
            const bookingStart = new Date(booking.checkIn);
            const bookingEnd = new Date(booking.checkOut);
            return day >= bookingStart && day <= bookingEnd;
          });
          
          totalOccupancy += dayBookings.length;
        });
        
        // Calculate average occupancy per day
        const avgOccupancy = totalOccupancy / stayDays.length;
        const occupancyRate = apartments.length > 0 ? avgOccupancy / apartments.length : 0;
        
        // Apply penalties for undesirable conditions
        let score = 1 - occupancyRate; // Higher score for lower occupancy
        
        // Bonus for having favorite apartments available
        if (hasFavoriteAvailable) score += 0.1;
        
        // Penalty for including Sunday (dental work can't be done)
        if (hasSunday) score -= 0.3;
        
        // Penalty for starting on Saturday (weekend start)
        if (hasWeekendStart) score -= 0.2;
        
        return {
          startDate,
          endDate,
          occupancyRate,
          score,
          hasSunday,
          hasWeekendStart,
          hasFavoriteAvailable,
          formatRange: `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d')}`
        };
      })
      .sort((a, b) => b.score - a.score) // Sort by best score first
      .slice(0, 5); // Take top 5 recommendations
    
    return stayPeriods;
  }, [selectedMonth, stayDuration, apartments, bookings, getAvailableApartments]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Best Booking Dates
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Best</span>
            <div className="flex items-center space-x-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDecreaseDuration}
                disabled={stayDuration <= 1}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <span className="px-3 py-1 border rounded text-sm min-w-[3rem] text-center">
                {stayDuration}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleIncreaseDuration}
                disabled={stayDuration >= 14}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
            <span className="text-sm font-medium">days to book in</span>
            <div className="flex items-center space-x-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousMonth}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <span className="px-3 py-1 border rounded text-sm min-w-[5rem] text-center">
                {format(selectedMonth, 'MM/yyyy')}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextMonth}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Recommended Date Ranges:</h4>
          {bestDates.length > 0 ? (
            <div className="space-y-2">
              {bestDates.map((period, index) => (
                <div
                  key={period.startDate.toISOString()}
                  className={`flex items-center justify-between p-2 rounded-md border ${
                    index === 0 ? 'bg-green-50 border-green-200' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{period.formatRange}</span>
                    {period.hasFavoriteAvailable && (
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    )}
                    {period.hasSunday && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                        Includes Sunday
                      </span>
                    )}
                    {period.hasWeekendStart && (
                      <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                        Weekend Start
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {Math.round((1 - period.occupancyRate) * 100)}% available
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No suitable date ranges found for {stayDuration} days in {format(selectedMonth, 'MMMM yyyy')}.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
