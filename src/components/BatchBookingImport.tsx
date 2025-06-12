
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { parse, isValid } from 'date-fns';
import { Booking } from '@/types';

interface BatchBookingImportProps {
  onImport: (bookings: Omit<Booking, 'id'>[]) => void;
}

export function BatchBookingImport({ onImport }: BatchBookingImportProps) {
  const [open, setOpen] = useState(false);
  const [inputData, setInputData] = useState('');
  const { toast } = useToast();
  
  const parseExcelData = (input: string) => {
    const lines = input.trim().split('\n');
    const parsedBookings: Omit<Booking, 'id'>[] = [];
    const errors: string[] = [];
    
    lines.forEach((line, index) => {
      // First, try to split the line by tab character (common when pasting from Excel)
      const parts = line.trim().split(/\t+/);
      
      let guestName: string;
      let checkInStr: string;
      let checkOutStr: string;
      
      if (parts.length >= 3) {
        // We have tab-separated data (Excel paste)
        guestName = parts[0].trim();
        checkInStr = parts[1].trim();
        checkOutStr = parts[2].trim();
      } else {
        // Try to extract using regex for space-delimited format
        const nameAndDatesPattern = /^([^0-9]+?)[\s]+(\d{2}\.\d{2}\.\d{4}(?:\s*\/\s*\d{2}:\d{2})?)[\s]+(\d{2}\.\d{2}\.\d{4}(?:\s*\/\s*\d{2}:\d{2})?)$/;
        
        const match = line.match(nameAndDatesPattern);
        
        if (!match) {
          errors.push(`Line ${index + 1}: Invalid format`);
          return;
        }
        
        guestName = match[1].trim();
        checkInStr = match[2];
        checkOutStr = match[3];
      }
      
      // Process the date strings
      const processDateString = (dateStr: string) => {
        const parts = dateStr.split('/');
        const datePart = parts[0].trim();
        const timePart = parts.length > 1 ? parts[1].trim() : "00:00";
        
        return `${datePart} ${timePart}`;
      };
      
      const processedCheckInStr = processDateString(checkInStr);
      const processedCheckOutStr = processDateString(checkOutStr);
      
      const checkIn = parse(processedCheckInStr, 'dd.MM.yyyy HH:mm', new Date());
      const checkOut = parse(processedCheckOutStr, 'dd.MM.yyyy HH:mm', new Date());
      
      if (!isValid(checkIn) || !isValid(checkOut)) {
        errors.push(`Line ${index + 1}: Invalid date format for ${guestName}`);
        return;
      }
      
      if (checkIn >= checkOut) {
        errors.push(`Line ${index + 1}: Check-out must be after check-in for ${guestName}`);
        return;
      }
      
      parsedBookings.push({
        guestName,
        checkIn,
        checkOut,
      });
    });
    
    return { parsedBookings, errors };
  };
  
  const handleImport = () => {
    const { parsedBookings, errors } = parseExcelData(inputData);
    
    if (errors.length > 0) {
      toast({
        title: "Import errors",
        description: errors.join('\n').substring(0, 250) + (errors.join('\n').length > 250 ? '...' : ''),
        variant: "destructive",
      });
      return;
    }
    
    if (parsedBookings.length === 0) {
      toast({
        title: "No bookings found",
        description: "Please check your input data format",
        variant: "destructive",
      });
      return;
    }
    
    onImport(parsedBookings);
    setOpen(false);
    setInputData('');
    
    toast({
      title: "Bookings imported",
      description: `Successfully imported ${parsedBookings.length} bookings`,
    });
  };
  
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Batch Import
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md md:max-w-xl">
          <DialogHeader>
            <DialogTitle>Import Bookings</DialogTitle>
            <DialogDescription>
              Paste data from Excel or in the format: Name DD.MM.YYYY / HH:MM DD.MM.YYYY / HH:MM
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Textarea
              placeholder="David Smith	09.06.2025 / 11:45	16.06.2025 / 12:35"
              value={inputData}
              onChange={(e) => setInputData(e.target.value)}
              className="h-64"
            />
          </div>
          
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleImport}>
              Import Bookings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
