import React, { useState, useMemo } from 'react';
import { PlusIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BookingForm } from '@/components/BookingForm';
import { BookingList } from '@/components/BookingList';
import { BatchBookingImport } from '@/components/BatchBookingImport';
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
import { Booking } from '@/types';
import { useToast } from '@/hooks/use-toast';

const BookingsPage = () => {
  const { apartments, bookings, addBooking, updateBooking, deleteBooking } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [bookingToDelete, setBookingToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  
  // Filter bookings based on search term
  const filteredBookings = useMemo(() => {
    if (!searchTerm.trim()) return bookings;
    
    const search = searchTerm.toLowerCase();
    return bookings.filter(booking => {
      const guestName = booking.guestName.toLowerCase();
      const apartmentName = booking.apartmentId 
        ? apartments.find(apt => apt.id === booking.apartmentId)?.name?.toLowerCase() || ''
        : '';
      
      return guestName.includes(search) || apartmentName.includes(search);
    });
  }, [bookings, searchTerm, apartments]);
  
  const handleAddNew = () => {
    setEditingBooking(null);
    setShowForm(true);
  };
  
  const handleEdit = (booking: Booking) => {
    setEditingBooking(booking);
    setShowForm(true);
  };
  
  const handleDelete = (bookingId: string) => {
    setBookingToDelete(bookingId);
  };
  
  const confirmDelete = async () => {
    if (bookingToDelete) {
      try {
        await deleteBooking(bookingToDelete);
        setBookingToDelete(null);
        toast({
          title: "Booking deleted",
          description: "The booking has been removed successfully.",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete booking. Please try again.",
          variant: "destructive",
        });
      }
    }
  };
  
  const handleFormSubmit = async (data: { guestName: string; checkIn: Date; checkOut: Date; apartmentId: string }) => {
    try {
      if (editingBooking) {
        await updateBooking(editingBooking.id, data);
        toast({
          title: "Booking updated",
          description: "The booking has been updated successfully.",
        });
      } else {
        await addBooking(data);
        toast({
          title: "Booking created",
          description: "The new booking has been added successfully.",
        });
      }
      setShowForm(false);
      setEditingBooking(null);
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${editingBooking ? 'update' : 'create'} booking. Please try again.`,
        variant: "destructive",
      });
    }
  };

  const handleBatchImport = async (bookings: Array<{ guestName: string; checkIn: Date; checkOut: Date }>) => {
    try {
      for (const booking of bookings) {
        await addBooking(booking);
      }
      
      toast({
        title: "Success",
        description: `${bookings.length} bookings have been added`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to import some bookings. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateAssignment = async (bookingId: string, apartmentId: string | null) => {
    try {
      if (apartmentId === null) {
        // Clear both regular and temporary assignments
        await updateBooking(bookingId, { 
          apartmentId: null,
          temporaryApartment: null
        });
        toast({
          title: "Assignment cleared",
          description: "Booking assignment has been cleared successfully.",
        });
      } else {
        // Assign regular apartment and clear temporary assignment
        await updateBooking(bookingId, { 
          apartmentId,
          temporaryApartment: null
        });
        toast({
          title: "Assignment updated",
          description: "Apartment assignment updated successfully.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update assignment. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <Layout>
      <div className="grid grid-cols-1 gap-8">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold">Bookings</h2>
          <div className="flex space-x-2">
            <BatchBookingImport onImport={handleBatchImport} />
            <Button onClick={handleAddNew}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Add New
            </Button>
          </div>
        </div>
        
        {!showForm && (
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Search bookings by guest name or apartment..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        )}
        
        {showForm ? (
          <BookingForm
            apartments={apartments}
            booking={editingBooking || undefined}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingBooking(null);
            }}
          />
        ) : (
          <BookingList
            bookings={filteredBookings}
            apartments={apartments}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onUpdateAssignment={handleUpdateAssignment}
          />
        )}
      </div>
      
      <AlertDialog open={!!bookingToDelete} onOpenChange={() => setBookingToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the booking.
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

export default BookingsPage;
