
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { dateRangeSchema, Apartment } from '@/types';

type FormValues = z.infer<typeof dateRangeSchema>;

interface AvailabilitySearchProps {
  onSearch: (start: Date, end: Date) => void;
  availableApartments: Apartment[] | null;
  onBookSelected: (checkIn: Date, checkOut: Date) => void;
}

export function AvailabilitySearch({
  onSearch,
  availableApartments,
  onBookSelected
}: AvailabilitySearchProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(dateRangeSchema),
    defaultValues: {
      startDate: undefined,
      endDate: undefined
    }
  });
  
  const onSubmit = (data: FormValues) => {
    onSearch(data.startDate, data.endDate);
  };
  
  const handleBookSelected = () => {
    const { startDate, endDate } = form.getValues();
    if (startDate && endDate) {
      onBookSelected(startDate, endDate);
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Find Available Apartments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <form
            className="space-y-6"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Check-in Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Check-out Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                          disabled={(date) => {
                            const startDate = form.getValues().startDate;
                            return startDate ? date <= startDate : false;
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="flex justify-end">
              <Button type="submit">Search</Button>
            </div>
          </form>
        </Form>
        
        {availableApartments !== null && (
          <div className="pt-4 border-t">
            <h3 className="font-medium mb-2">
              {availableApartments.length} apartments available
            </h3>
            
            {availableApartments.length > 0 ? (
              <div className="space-y-3">
                {availableApartments.map((apartment) => (
                  <div
                    key={apartment.id}
                    className="p-3 border rounded-md hover:bg-secondary/10 transition-colors cursor-pointer"
                    onClick={handleBookSelected}
                  >
                    <div className="font-medium">{apartment.name}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {apartment.properties.map((property) => (
                        <Badge key={property} variant="outline" className="text-xs">
                          {property}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground">
                No apartments available for the selected dates.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
