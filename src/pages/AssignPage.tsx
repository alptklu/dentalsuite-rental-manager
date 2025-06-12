import React, { useState } from 'react';
import { format } from 'date-fns';
import { PlayIcon } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookingList } from '@/components/BookingList';
import { useAppStore } from '@/store';
import { Layout } from '@/components/Layout';
import { Booking } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

const AssignPage = () => {
  const { apartments, bookings, updateBooking, getAvailableApartments } = useAppStore();
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedApartmentId, setSelectedApartmentId] = useState<string>('');
  const [isTemporaryMode, setIsTemporaryMode] = useState(false);
  const [temporaryApartmentName, setTemporaryApartmentName] = useState('');
  const { toast } = useToast();
  
  // Get unassigned bookings
  const unassignedBookings = bookings.filter(booking => !booking.apartmentId && !booking.temporaryApartment);
  
  // Get available apartments for the selected booking
  const availableApartments = selectedBooking 
    ? getAvailableApartments(selectedBooking.checkIn, selectedBooking.checkOut)
    : [];
  
  const handleAssign = (booking: Booking) => {
    setSelectedBooking(booking);
    setSelectedApartmentId('');
    setIsTemporaryMode(false);
    setTemporaryApartmentName('');
  };
  
  const handleConfirmAssign = async () => {
    if (selectedBooking) {
      try {
        if (isTemporaryMode && temporaryApartmentName.trim()) {
          // Assign temporary apartment
          await updateBooking(selectedBooking.id, { 
            temporaryApartment: temporaryApartmentName.trim(),
            apartmentId: undefined // Clear any existing apartment assignment
          });
          toast({
            title: "Temporary apartment assigned",
            description: `Successfully assigned temporary apartment "${temporaryApartmentName}" to ${selectedBooking.guestName}`
          });
        } else if (!isTemporaryMode && selectedApartmentId) {
          // Assign regular apartment
          await updateBooking(selectedBooking.id, { 
            apartmentId: selectedApartmentId,
            temporaryApartment: undefined // Clear any existing temporary assignment
          });
          toast({
            title: "Apartment assigned",
            description: `Successfully assigned apartment to ${selectedBooking.guestName}`
          });
        } else {
          toast({
            title: "Assignment incomplete",
            description: "Please select an apartment or enter a temporary apartment name.",
            variant: "destructive",
          });
          return;
        }
        setSelectedBooking(null);
      } catch {
        toast({
          title: "Assignment failed",
          description: "Failed to assign apartment. Please try again.",
          variant: "destructive",
        });
      }
    }
  };
  
  const closeDialog = () => {
    setSelectedBooking(null);
    setIsTemporaryMode(false);
    setTemporaryApartmentName('');
  };
  
  // Auto-assign algorithm with favorite prioritization
  const autoAssignBookings = async () => {
    if (unassignedBookings.length === 0) {
      toast({
        title: "No unassigned bookings",
        description: "There are no bookings that need assignment.",
      });
      return;
    }
    
    // Sort bookings by check-in date (earlier first)
    const sortedBookings = [...unassignedBookings].sort(
      (a, b) => a.checkIn.getTime() - b.checkIn.getTime()
    );
    
    let assignedCount = 0;
    let failedCount = 0;
    
    // Try to assign each booking
    for (const booking of sortedBookings) {
      try {
        // Get available apartments for this booking's date range
        const availableApts = getAvailableApartments(booking.checkIn, booking.checkOut);
        
        if (availableApts.length > 0) {
          // Prioritize favorite apartments (getAvailableApartments already sorts by favorites)
          const favoriteApt = availableApts.find(apt => apt.isFavorite);
          const apartmentToAssign = favoriteApt || availableApts[0];
          
          await updateBooking(booking.id, { apartmentId: apartmentToAssign.id });
          assignedCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        console.error('Failed to assign booking:', booking.id, error);
        failedCount++;
      }
    }
    
    if (assignedCount > 0) {
      toast({
        title: "Auto-assignment complete",
        description: `Successfully assigned ${assignedCount} of ${sortedBookings.length} bookings to apartments.${failedCount > 0 ? ` ${failedCount} assignments failed.` : ''}`,
      });
    } else {
      toast({
        title: "Auto-assignment failed",
        description: "Could not find available apartments for any of the unassigned bookings.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <Layout>
      <div className="grid grid-cols-1 gap-8">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold">Assign Apartments</h2>
          <div className="flex space-x-2">
            <Button onClick={autoAssignBookings} disabled={unassignedBookings.length === 0}>
              <PlayIcon className="mr-2 h-4 w-4" />
              Auto Assign All
            </Button>
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Unassigned Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            {unassignedBookings.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                No unassigned bookings found.
              </div>
            ) : (
              <BookingList
                bookings={unassignedBookings}
                apartments={apartments}
                onEdit={() => {}}
                onDelete={() => {}}
                showAssignButton={true}
                onAssign={handleAssign}
              />
            )}
          </CardContent>
        </Card>
      </div>
      
      <Dialog open={!!selectedBooking} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Apartment</DialogTitle>
            <DialogDescription>
              {selectedBooking && (
                <div className="mt-2 space-y-2">
                  <p><strong>Guest:</strong> {selectedBooking.guestName}</p>
                  <p><strong>Check-in:</strong> {format(selectedBooking.checkIn, 'PP')}</p>
                  <p><strong>Check-out:</strong> {format(selectedBooking.checkOut, 'PP')}</p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="temporary-mode"
                  checked={isTemporaryMode}
                  onCheckedChange={(checked) => setIsTemporaryMode(checked === true)}
                />
                <Label htmlFor="temporary-mode" className="text-sm font-medium">
                  Assign to temporary/external accommodation
                </Label>
              </div>
              
              {isTemporaryMode ? (
                <div className="space-y-2">
                  <Label htmlFor="temporary-apartment-name">Temporary accommodation name</Label>
                  <Input
                    id="temporary-apartment-name"
                    placeholder="e.g., Hotel Central Room 205, Partner Clinic Suite A"
                    value={temporaryApartmentName}
                    onChange={(e) => setTemporaryApartmentName(e.target.value)}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="apartment">Select an apartment</Label>
                  <Select
                    value={selectedApartmentId}
                    onValueChange={setSelectedApartmentId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an apartment" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableApartments.length === 0 ? (
                        <div className="text-center py-2 text-muted-foreground">
                          No available apartments for these dates
                        </div>
                      ) : (
                        availableApartments.map((apartment) => (
                          <SelectItem key={apartment.id} value={apartment.id}>
                            {apartment.name}
                            {apartment.isFavorite && ' ⭐'}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmAssign}
              disabled={
                isTemporaryMode 
                  ? !temporaryApartmentName.trim() 
                  : (!selectedApartmentId || availableApartments.length === 0)
              }
            >
              {isTemporaryMode ? 'Assign Temporary' : 'Assign Apartment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default AssignPage;
