
import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, differenceInDays, addDays, parseISO } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { Apartment, Booking } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DayContentProps } from 'react-day-picker';

interface BookingCalendarProps {
  bookings: Booking[];
  apartments: Apartment[];
}

export function BookingCalendar({ bookings, apartments }: BookingCalendarProps) {
  const [month, setMonth] = useState<Date>(new Date());
  
  // Get all dates where there are bookings
  const bookingDates = bookings.reduce((dates, booking) => {
    const daysCount = differenceInDays(booking.checkOut, booking.checkIn);
    const apartment = apartments.find(a => a.id === booking.apartmentId);
    
    // If apartment not found (should not happen), skip
    if (!apartment) return dates;
    
    // Create an entry for each day of the booking
    for (let i = 0; i <= daysCount; i++) {
      const date = addDays(booking.checkIn, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      if (!dates[dateStr]) {
        dates[dateStr] = [];
      }
      
      // Only add once per date
      if (!dates[dateStr].some(b => b.id === booking.id)) {
        dates[dateStr].push({
          ...booking,
          apartmentName: apartment.name,
        });
      }
    }
    
    return dates;
  }, {} as Record<string, (Booking & { apartmentName: string })[]>);
  
  // Create a modifiers object for the calendar
  const modifiers = {
    booked: Object.keys(bookingDates).map(dateStr => new Date(dateStr)),
  };
  
  // Custom day renderer
  const renderDay = (props: DayContentProps) => {
    const day = props.date;
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayBookings = bookingDates[dateStr] || [];
    const isBooked = dayBookings.length > 0;
    
    return (
      <div className={`relative h-full w-full ${isBooked ? 'bg-red-100' : ''}`}>
        <div className="text-center">{format(day, 'd')}</div>
        {isBooked && (
          <div className="absolute bottom-0 left-0 right-0">
            <div className="flex justify-center">
              {dayBookings.length > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="text-xs px-1">
                        {dayBookings.length}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent className="p-2">
                      <div className="text-sm">
                        {dayBookings.map((booking, index) => (
                          <div key={`${booking.id}-${index}`} className="mb-1">
                            <span className="font-semibold">{booking.apartmentName}</span>
                            <span>: {booking.guestName}</span>
                          </div>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div>
      <Calendar
        mode="single"
        selected={new Date()}
        onSelect={() => {}}
        disabled={() => false}
        month={month}
        onMonthChange={setMonth}
        modifiers={modifiers}
        modifiersClassNames={{
          booked: 'bg-red-50',
        }}
        className="bg-white p-3 pointer-events-auto"
        components={{
          DayContent: (props) => renderDay(props),
        }}
      />
      
      <div className="mt-4">
        <h3 className="text-sm font-medium mb-2">Legend:</h3>
        <div className="flex gap-4">
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-red-100 mr-2"></div>
            <span className="text-sm">Booked</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-white border mr-2"></div>
            <span className="text-sm">Available</span>
          </div>
        </div>
      </div>
      
      <div className="mt-6">
        <h3 className="text-sm font-medium mb-2">Upcoming Bookings:</h3>
        {bookings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No bookings for selected apartments.</p>
        ) : (
          <div className="space-y-2">
            {bookings.map(booking => {
              const apartment = apartments.find(a => a.id === booking.apartmentId);
              if (!apartment) return null;
              
              return (
                <Card key={booking.id} className="bg-muted/30">
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{booking.guestName}</div>
                        <div className="text-sm text-muted-foreground">{apartment.name}</div>
                      </div>
                      <div className="text-sm text-right">
                        <div>{format(booking.checkIn, 'MMM d')}</div>
                        <div>to {format(booking.checkOut, 'MMM d, yyyy')}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
