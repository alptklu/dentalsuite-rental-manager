import { z } from "zod";

// Apartment model
export interface Apartment {
  id: string;
  name: string;
  properties: string[];
  isFavorite?: boolean; // Added favorite flag
}

// Booking model
export interface Booking {
  id: string;
  guestName: string;
  checkIn: Date;
  checkOut: Date;
  apartmentId?: string; // Changed to optional
  temporaryApartment?: string; // New field for temporary apartment custom names
}

// Form schemas
export const apartmentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  properties: z.array(z.string())
});

export const bookingSchema = z.object({
  guestName: z.string().min(1, "Guest name is required"),
  checkIn: z.date({
    required_error: "Check-in date is required"
  }),
  checkOut: z.date({
    required_error: "Check-out date is required"
  }).refine(date => date > new Date(), {
    message: "Check-out date must be in the future"
  }),
  apartmentId: z.string().min(1, "Apartment is required").optional(), // Made optional
  temporaryApartment: z.string().optional() // New field for temporary apartments
});

export const dateRangeSchema = z.object({
  startDate: z.date({
    required_error: "Start date is required"
  }),
  endDate: z.date({
    required_error: "End date is required"
  }).refine(date => date > new Date(), {
    message: "End date must be in the future"
  })
});

// Type for parsed Excel/CSV data
export interface ParsedBookingData {
  guestName: string;
  checkIn: Date;
  checkOut: Date;
}
