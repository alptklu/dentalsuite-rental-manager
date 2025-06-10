import React from 'react';
import { Edit2Icon, TrashIcon, Star, Check } from 'lucide-react';

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
import { Apartment } from '@/types';

interface ApartmentListProps {
  apartments: Apartment[];
  onEdit: (apartment: Apartment) => void;
  onDelete: (apartmentId: string) => void;
  onToggleFavorite?: (apartmentId: string) => void;
  selectedApartmentIds?: string[];
  onToggleSelect?: (apartmentId: string) => void;
}

export function ApartmentList({
  apartments,
  onEdit,
  onDelete,
  onToggleFavorite,
  selectedApartmentIds = [],
  onToggleSelect
}: ApartmentListProps) {
  const selectionEnabled = !!onToggleSelect;
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Apartments</CardTitle>
        {selectionEnabled && (
          <p className="text-sm text-muted-foreground">
            Click on any apartment to view its details and occupancy
          </p>
        )}
      </CardHeader>
      <CardContent>
        {apartments.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            No apartments added yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Properties</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apartments.map((apartment) => {
                const isSelected = selectedApartmentIds.includes(apartment.id);
                
                return (
                  <TableRow 
                    key={apartment.id}
                    className={`
                      ${isSelected ? "bg-blue-50 border-blue-200" : "hover:bg-gray-50"}
                      ${selectionEnabled ? "cursor-pointer" : ""}
                    `}
                    onClick={selectionEnabled ? () => onToggleSelect(apartment.id) : undefined}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {isSelected && selectionEnabled && (
                          <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                            <Check className="h-2.5 w-2.5 text-white" />
                          </div>
                        )}
                        {apartment.name}
                        {apartment.isFavorite && (
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {apartment.properties.map((property) => (
                          <Badge key={property} variant="outline">
                            {property}
                          </Badge>
                        ))}
                        {apartment.properties.length === 0 && (
                          <span className="text-muted-foreground text-sm">None</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {onToggleFavorite && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onToggleFavorite(apartment.id)}
                            className="hover:bg-yellow-50"
                          >
                            <Star 
                              className={`h-4 w-4 ${
                                apartment.isFavorite 
                                  ? 'fill-yellow-400 text-yellow-400' 
                                  : 'text-gray-400'
                              }`} 
                            />
                            <span className="sr-only">
                              {apartment.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                            </span>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(apartment)}
                        >
                          <Edit2Icon className="h-4 w-4" />
                          <span className="sr-only">Edit {apartment.name}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(apartment.id)}
                        >
                          <TrashIcon className="h-4 w-4" />
                          <span className="sr-only">Delete {apartment.name}</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
