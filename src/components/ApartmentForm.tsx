
import React, { useState } from 'react';
import { PlusIcon, XIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Apartment, apartmentSchema } from '@/types';
import { useToast } from '@/hooks/use-toast';

type FormValues = z.infer<typeof apartmentSchema>;

interface ApartmentFormProps {
  apartment?: Apartment;
  onSubmit: (data: FormValues) => void;
  onCancel?: () => void;
}

export function ApartmentForm({
  apartment,
  onSubmit,
  onCancel
}: ApartmentFormProps) {
  const [propertyInput, setPropertyInput] = useState('');
  const { toast } = useToast();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(apartmentSchema),
    defaultValues: {
      name: apartment?.name || '',
      properties: apartment?.properties || []
    }
  });
  
  const addProperty = () => {
    if (!propertyInput.trim()) return;
    
    const currentProperties = form.getValues().properties || [];
    if (currentProperties.includes(propertyInput.trim())) {
      toast({
        title: "Property already exists",
        description: "This property has already been added.",
        variant: "destructive"
      });
      return;
    }
    
    form.setValue('properties', [...currentProperties, propertyInput.trim()]);
    setPropertyInput('');
  };
  
  const removeProperty = (property: string) => {
    const currentProperties = form.getValues().properties || [];
    form.setValue(
      'properties',
      currentProperties.filter((p) => p !== property)
    );
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addProperty();
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          {apartment ? 'Edit Apartment' : 'Add New Apartment'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            className="space-y-6"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Apartment Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Suite 101" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="space-y-2">
              <FormLabel>Properties</FormLabel>
              <div className="flex gap-2">
                <Input 
                  placeholder="e.g., double bed"
                  value={propertyInput}
                  onChange={(e) => setPropertyInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1"
                />
                <Button type="button" onClick={addProperty}>
                  <PlusIcon className="h-4 w-4" />
                  <span className="sr-only">Add Property</span>
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-2">
                {form.watch('properties')?.map((property) => (
                  <Badge key={property} variant="secondary" className="flex items-center gap-1">
                    {property}
                    <button 
                      type="button" 
                      onClick={() => removeProperty(property)}
                      className="ml-1 text-muted-foreground hover:text-foreground"
                    >
                      <XIcon className="h-3 w-3" />
                      <span className="sr-only">Remove {property}</span>
                    </button>
                  </Badge>
                ))}
                {form.watch('properties')?.length === 0 && (
                  <p className="text-sm text-muted-foreground">No properties added yet</p>
                )}
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button type="submit">
                {apartment ? 'Update' : 'Create'} Apartment
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
