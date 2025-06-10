import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parse, isValid } from 'date-fns';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { bookingSchema, Apartment, Booking, ParsedBookingData } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';

type FormValues = z.infer<typeof bookingSchema>;

interface BookingFormProps {
  apartments: Apartment[];
  booking?: Booking;
  availableApartments?: Apartment[];
  onSubmit: (data: FormValues) => void;
  onCancel?: () => void;
}

export function BookingForm({
  apartments,
  booking,
  availableApartments,
  onSubmit,
  onCancel
}: BookingFormProps) {
  const [bulkInput, setBulkInput] = useState('');
  const [skipApartment, setSkipApartment] = useState(!booking?.apartmentId);
  const { toast } = useToast();
  
  const apartmentsToShow = availableApartments || apartments;
  
  // Create a modified schema based on the skipApartment state
  const getValidationSchema = () => {
    if (skipApartment) {
      // Create a schema without the apartmentId requirement
      return z.object({
        guestName: bookingSchema.shape.guestName,
        checkIn: bookingSchema.shape.checkIn,
        checkOut: bookingSchema.shape.checkOut,
        apartmentId: z.string().optional() // Make truly optional
      });
    }
    return bookingSchema; // Use the original schema
  };
  
  const form = useForm<FormValues>({
    resolver: zodResolver(getValidationSchema()),
    defaultValues: booking ? {
      guestName: booking.guestName,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      apartmentId: booking.apartmentId
    } : {
      guestName: '',
      checkIn: undefined,
      checkOut: undefined,
      apartmentId: ''
    },
    mode: 'onChange'
  });
  
  // Update form validation when skipApartment changes
  React.useEffect(() => {
    form.trigger();
  }, [skipApartment, form]);
  
  const parseExcelData = (input: string): ParsedBookingData | null => {
    // First, try to split the input by tab character (common when pasting from Excel)
    const parts = input.trim().split(/\t+/);
    
    let guestName: string;
    let checkInStr: string;
    let checkOutStr: string;
    
    if (parts.length >= 3) {
      // We have tab-separated data (Excel paste)
      guestName = parts[0].trim();
      checkInStr = parts[1].trim();
      checkOutStr = parts[2].trim();
      
      console.log("Tab-separated format detected:", { guestName, checkInStr, checkOutStr });
    } else {
      // Try to extract using regex for space-delimited format
      // This pattern is more flexible with multiple spaces
      const nameAndDatesPattern = /^([^0-9]+?)[\s]+(\d{2}\.\d{2}\.\d{4}(?:\s*\/\s*\d{2}:\d{2})?)[\s]+(\d{2}\.\d{2}\.\d{4}(?:\s*\/\s*\d{2}:\d{2})?)$/;
      
      const match = input.match(nameAndDatesPattern);
      
      if (!match) {
        toast({
          title: "Invalid format",
          description: "Expected format: 'Guest Name DD.MM.YYYY / HH:MM DD.MM.YYYY / HH:MM' or Excel paste",
          variant: "destructive"
        });
        return null;
      }
      
      guestName = match[1].trim();
      checkInStr = match[2]; // DD.MM.YYYY / HH:MM format
      checkOutStr = match[3]; // DD.MM.YYYY / HH:MM format
    }
    
    // Process the date strings to extract date and time components
    const processDateString = (dateStr: string) => {
      const parts = dateStr.split('/');
      const datePart = parts[0].trim();
      const timePart = parts.length > 1 ? parts[1].trim() : "00:00";
      
      return `${datePart} ${timePart}`;
    };
    
    // Parse the dates using date-fns
    const processedCheckInStr = processDateString(checkInStr);
    const processedCheckOutStr = processDateString(checkOutStr);
    
    const checkIn = parse(processedCheckInStr, 'dd.MM.yyyy HH:mm', new Date());
    const checkOut = parse(processedCheckOutStr, 'dd.MM.yyyy HH:mm', new Date());
    
    if (!isValid(checkIn) || !isValid(checkOut)) {
      toast({
        title: "Invalid dates",
        description: "Please check that dates are in format DD.MM.YYYY / HH:MM",
        variant: "destructive"
      });
      return null;
    }
    
    if (checkIn >= checkOut) {
      toast({
        title: "Invalid date range",
        description: "Check-out must be after check-in",
        variant: "destructive"
      });
      return null;
    }
    
    return {
      guestName,
      checkIn,
      checkOut
    };
  };
  
  const handlePasteData = () => {
    const parsedData = parseExcelData(bulkInput);
    if (parsedData) {
      form.setValue('guestName', parsedData.guestName);
      form.setValue('checkIn', parsedData.checkIn);
      form.setValue('checkOut', parsedData.checkOut);
      setBulkInput('');
      
      toast({
        title: "Data parsed successfully",
        description: "Please continue to complete the booking",
      });
    }
  };

  const handleSubmit = (data: FormValues) => {
    const formData = { ...data };
    
    // If skip apartment is checked, remove apartmentId from submission
    if (skipApartment) {
      delete formData.apartmentId;
    }
    
    onSubmit(formData);
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          {booking ? 'Edit Booking' : 'New Booking'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!booking && (
          <div className="mb-6 space-y-2">
            <FormLabel>Paste Excel Data</FormLabel>
            <div className="flex gap-2">
              <Textarea
                placeholder="e.g., Kerrie Leigh Porter	08.05.2025 / 21:40	15.05.2025 / 22:30"
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                onClick={handlePasteData}
                className="self-end"
              >
                Parse
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Format: Paste directly from Excel (tab-separated) or type "Guest Name DD.MM.YYYY / HH:MM DD.MM.YYYY / HH:MM"
            </p>
          </div>
        )}
        
        <Form {...form}>
          <form
            className="space-y-6"
            onSubmit={form.handleSubmit(handleSubmit)}
          >
            <FormField
              control={form.control}
              name="guestName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Guest Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Guest name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="checkIn"
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
                              format(field.value, "PPP HH:mm")
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
                name="checkOut"
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
                              format(field.value, "PPP HH:mm")
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
                            const checkIn = form.getValues().checkIn;
                            return checkIn ? date < checkIn : false;
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center space-x-2 mb-4">
              <Checkbox 
                id="skipApartment" 
                checked={skipApartment} 
                onCheckedChange={(checked) => {
                  setSkipApartment(checked === true);
                  // Clear any validation errors for apartmentId when skipping
                  if (checked === true) {
                    form.clearErrors('apartmentId');
                  }
                }}
              />
              <label htmlFor="skipApartment" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Skip apartment selection (assign later)
              </label>
            </div>
            
            {!skipApartment && (
              <FormField
                control={form.control}
                name="apartmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apartment</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an apartment" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {apartmentsToShow.length === 0 ? (
                          <div className="text-center py-2 text-muted-foreground">
                            No available apartments
                          </div>
                        ) : (
                          apartmentsToShow.map((apartment) => (
                            <SelectItem key={apartment.id} value={apartment.id}>
                              {apartment.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <div className="flex justify-end gap-2">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button type="submit">
                {booking ? 'Update' : 'Create'} Booking
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
