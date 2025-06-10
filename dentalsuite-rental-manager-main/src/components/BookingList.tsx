import React from 'react';
import { Edit2Icon, TrashIcon, XIcon } from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Booking, Apartment } from '@/types';

interface BookingListProps {
  bookings: Booking[];
  apartments: Apartment[];
  onEdit: (booking: Booking) => void;
  onDelete: (bookingId: string) => void;
  showAssignButton?: boolean;
  onAssign?: (booking: Booking) => void;
  onUpdateAssignment?: (bookingId: string, apartmentId: string | null) => void;
}

export function BookingList({
  bookings,
  apartments,
  onEdit,
  onDelete,
  showAssignButton = false,
  onAssign,
  onUpdateAssignment
}: BookingListProps) {
  const getApartmentName = (apartmentId?: string, temporaryApartment?: string) => {
    if (temporaryApartment) return `${temporaryApartment} (Temporary)`;
    if (!apartmentId) return 'Unassigned';
    const apartment = apartments.find((a) => a.id === apartmentId);
    return apartment?.name || 'Unknown';
  };

  const handleAssignmentChange = (bookingId: string, apartmentId: string) => {
    if (onUpdateAssignment) {
      onUpdateAssignment(bookingId, apartmentId);
    }
  };

  const handleUnassign = (bookingId: string) => {
    if (onUpdateAssignment) {
      onUpdateAssignment(bookingId, null);
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Bookings</CardTitle>
      </CardHeader>
      <CardContent>
        {bookings.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            No bookings found.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guest</TableHead>
                <TableHead>Apartment</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Check-out</TableHead>
                <TableHead className="w-[150px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="font-medium">{booking.guestName}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {onUpdateAssignment ? (
                        <>
                          {booking.temporaryApartment ? (
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="bg-orange-100 text-orange-800 hover:bg-orange-200">
                                {booking.temporaryApartment} (Temp)
                              </Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => onUpdateAssignment(booking.id, null)}
                                title="Remove temporary assignment"
                              >
                                <XIcon className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <Select
                                value={booking.apartmentId || 'unassigned'}
                                onValueChange={(value) => {
                                  if (value === 'unassigned') {
                                    handleUnassign(booking.id);
                                  } else {
                                    handleAssignmentChange(booking.id, value);
                                  }
                                }}
                              >
                                <SelectTrigger className="w-[180px]">
                                  <SelectValue>
                                    {booking.apartmentId ? (
                                      getApartmentName(booking.apartmentId)
                                    ) : (
                                      <Badge variant="outline">Unassigned</Badge>
                                    )}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="unassigned">
                                    <Badge variant="outline">Unassigned</Badge>
                                  </SelectItem>
                                  {apartments.map((apartment) => (
                                    <SelectItem key={apartment.id} value={apartment.id}>
                                      {apartment.name}
                                      {apartment.isFavorite && ' ⭐'}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {booking.apartmentId && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleUnassign(booking.id)}
                                  title="Unassign apartment"
                                >
                                  <XIcon className="h-4 w-4" />
                                </Button>
                              )}
                            </>
                          )}
                        </>
                      ) : (
                        <span>{getApartmentName(booking.apartmentId, booking.temporaryApartment)}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{format(booking.checkIn, 'PP')}</TableCell>
                  <TableCell>{format(booking.checkOut, 'PP')}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {showAssignButton && !booking.apartmentId && !booking.temporaryApartment && onAssign && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onAssign(booking)}
                        >
                          Assign
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(booking)}
                      >
                        <Edit2Icon className="h-4 w-4" />
                        <span className="sr-only">Edit booking</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(booking.id)}
                      >
                        <TrashIcon className="h-4 w-4" />
                        <span className="sr-only">Delete booking</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
