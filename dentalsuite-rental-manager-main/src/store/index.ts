import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { areIntervalsOverlapping, addDays } from 'date-fns';

import { Apartment, Booking } from '@/types';
import { apartmentsAPI, bookingsAPI } from '@/lib/api';

// Generate test data for initial load (will be replaced by API data)
const generateTestData = () => {
  return { apartments: [], bookings: [] };
};

interface AppState {
  apartments: Apartment[];
  bookings: Booking[];
  loading: boolean;
  
  // Data fetching
  fetchApartments: () => Promise<void>;
  fetchBookings: () => Promise<void>;
  refreshData: () => Promise<void>;
  
  // Apartment actions
  addApartment: (apartment: Omit<Apartment, 'id'>) => Promise<void>;
  updateApartment: (id: string, apartment: Partial<Omit<Apartment, 'id'>>) => Promise<void>;
  deleteApartment: (id: string) => Promise<void>;
  toggleApartmentFavorite: (id: string) => Promise<void>;
  
  // Booking actions
  addBooking: (booking: Omit<Booking, 'id'>) => Promise<void>;
  updateBooking: (id: string, booking: Partial<Omit<Booking, 'id'>>) => Promise<void>;
  deleteBooking: (id: string) => Promise<void>;
  deleteAllBookings: () => Promise<void>;
  
  // Helper functions
  getAvailableApartments: (checkIn: Date, checkOut: Date) => Apartment[];
  getBookingsByApartmentId: (apartmentId: string) => Booking[];
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => {
      return {
        apartments: [],
        bookings: [],
        loading: false,
        
        // Data fetching
        fetchApartments: async () => {
          try {
            set({ loading: true });
            const apartments = await apartmentsAPI.getAll();
            set({ apartments, loading: false });
          } catch (error) {
            console.error('Failed to fetch apartments:', error);
            set({ loading: false });
          }
        },
        
        fetchBookings: async () => {
          try {
            set({ loading: true });
            const bookings = await bookingsAPI.getAll();
            // Convert API booking format to local format
            const formattedBookings = bookings.map(booking => ({
              id: booking.id,
              guestName: booking.guest_name,
              checkIn: new Date(booking.checkIn),
              checkOut: new Date(booking.checkOut),
              apartmentId: booking.apartment_id || undefined,
              temporaryApartment: booking.temporary_apartment || undefined
            }));
            set({ bookings: formattedBookings, loading: false });
          } catch (error) {
            console.error('Failed to fetch bookings:', error);
            set({ loading: false });
          }
        },
        
        refreshData: async () => {
          const { fetchApartments, fetchBookings } = get();
          await Promise.all([fetchApartments(), fetchBookings()]);
        },
        
        // Apartment actions
        addApartment: async (apartment) => {
          try {
            const newApartment = await apartmentsAPI.create({
              name: apartment.name,
              properties: apartment.properties
            });
            set((state) => ({
              apartments: [...state.apartments, newApartment]
            }));
          } catch (error) {
            console.error('Failed to add apartment:', error);
            throw error;
          }
        },
        
        updateApartment: async (id, apartment) => {
          try {
            const updatedApartment = await apartmentsAPI.update(id, apartment);
            set((state) => ({
              apartments: state.apartments.map((a) => 
                a.id === id ? updatedApartment : a
              )
            }));
          } catch (error) {
            console.error('Failed to update apartment:', error);
            throw error;
          }
        },
        
        deleteApartment: async (id) => {
          try {
            await apartmentsAPI.delete(id);
            set((state) => ({
              apartments: state.apartments.filter((a) => a.id !== id),
              // Also remove all bookings for this apartment
              bookings: state.bookings.filter((b) => b.apartmentId !== id)
            }));
          } catch (error) {
            console.error('Failed to delete apartment:', error);
            throw error;
          }
        },
        
        toggleApartmentFavorite: async (id) => {
          try {
            const result = await apartmentsAPI.toggleFavorite(id);
            set((state) => ({
              apartments: state.apartments.map((a) => 
                a.id === id ? { ...a, isFavorite: result.isFavorite } : a
              )
            }));
          } catch (error) {
            console.error('Failed to toggle favorite:', error);
            throw error;
          }
        },
        
        // Booking actions
        addBooking: async (booking) => {
          try {
            const newBooking = await bookingsAPI.create({
              guest_name: booking.guestName,
              check_in: booking.checkIn.toISOString(),
              check_out: booking.checkOut.toISOString(),
              apartment_id: booking.apartmentId,
              temporary_apartment: booking.temporaryApartment
            });
            
            // Convert back to local format
            const formattedBooking = {
              id: newBooking.id,
              guestName: newBooking.guest_name,
              checkIn: new Date(newBooking.checkIn),
              checkOut: new Date(newBooking.checkOut),
              apartmentId: newBooking.apartment_id || undefined,
              temporaryApartment: newBooking.temporary_apartment || undefined
            };
            
            set((state) => ({
              bookings: [...state.bookings, formattedBooking]
            }));
          } catch (error) {
            console.error('Failed to add booking:', error);
            throw error;
          }
        },
        
        updateBooking: async (id, booking) => {
          try {
            const updateData: any = {};
            if (booking.guestName) updateData.guest_name = booking.guestName;
            if (booking.checkIn) updateData.check_in = booking.checkIn.toISOString();
            if (booking.checkOut) updateData.check_out = booking.checkOut.toISOString();
            if (booking.apartmentId !== undefined) updateData.apartment_id = booking.apartmentId;
            if (booking.temporaryApartment !== undefined) updateData.temporary_apartment = booking.temporaryApartment;
            
            const updatedBooking = await bookingsAPI.update(id, updateData);
            
            // Convert back to local format
            const formattedBooking = {
              id: updatedBooking.id,
              guestName: updatedBooking.guest_name,
              checkIn: new Date(updatedBooking.checkIn),
              checkOut: new Date(updatedBooking.checkOut),
              apartmentId: updatedBooking.apartment_id || undefined,
              temporaryApartment: updatedBooking.temporary_apartment || undefined
            };
            
            set((state) => ({
              bookings: state.bookings.map((b) => 
                b.id === id ? formattedBooking : b
              )
            }));
          } catch (error) {
            console.error('Failed to update booking:', error);
            throw error;
          }
        },
        
        deleteBooking: async (id) => {
          try {
            await bookingsAPI.delete(id);
            set((state) => ({
              bookings: state.bookings.filter((b) => b.id !== id)
            }));
          } catch (error) {
            console.error('Failed to delete booking:', error);
            throw error;
          }
        },
        
        deleteAllBookings: async () => {
          try {
            await bookingsAPI.deleteAll();
            set({ bookings: [] });
          } catch (error) {
            console.error('Failed to delete all bookings:', error);
            throw error;
          }
        },
        
        // Helper functions
        getAvailableApartments: (checkIn, checkOut) => {
          const { apartments, bookings } = get();
          
          const availableApartments = apartments.filter((apartment) => {
            const apartmentBookings = bookings.filter(
              (booking) => booking.apartmentId === apartment.id
            );
            
            const isAvailable = !apartmentBookings.some((booking) =>
              areIntervalsOverlapping(
                { start: booking.checkIn, end: booking.checkOut },
                { start: checkIn, end: checkOut }
              )
            );
            
            return isAvailable;
          });
          
          return availableApartments.sort((a, b) => {
            if (a.isFavorite && !b.isFavorite) return -1;
            if (!a.isFavorite && b.isFavorite) return 1;
            return 0;
          });
        },
        
        getBookingsByApartmentId: (apartmentId) => {
          const { bookings } = get();
          return bookings.filter((booking) => booking.apartmentId === apartmentId);
        }
      };
    },
    {
      name: 'apartment-booking-storage',
      // Only persist user preferences, not the actual data
      partialize: (state) => ({ 
        // Don't persist apartments and bookings as they come from API
      }),
    }
  )
);
