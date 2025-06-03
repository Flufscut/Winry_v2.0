import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

const prospectFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  company: z.string().min(1, "Company is required"),
  title: z.string().min(1, "Job title is required"),
  email: z.string().email("Valid email is required"),
  linkedinUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type ProspectFormData = z.infer<typeof prospectFormSchema>;

interface ProspectFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ProspectForm({ onSuccess, onCancel }: ProspectFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ProspectFormData>({
    resolver: zodResolver(prospectFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      company: "",
      title: "",
      email: "",
      linkedinUrl: "",
    },
  });

  const createProspectMutation = useMutation({
    mutationFn: async (data: ProspectFormData) => {
      const response = await apiRequest("POST", "/api/prospects", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Prospect added successfully! Research has started.",
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/prospects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      
      onSuccess();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      toast({
        title: "Error",
        description: error.message || "Failed to add prospect",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: ProspectFormData) => {
    createProspectMutation.mutate(data);
  };

  return (
    <div>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            {...form.register("firstName")}
            placeholder="Enter first name"
            className="mt-1"
          />
          {form.formState.errors.firstName && (
            <p className="text-sm text-destructive mt-1">
              {form.formState.errors.firstName.message}
            </p>
          )}
        </div>
        
        <div>
          <Label htmlFor="lastName">Last Name *</Label>
          <Input
            id="lastName"
            {...form.register("lastName")}
            placeholder="Enter last name"
            className="mt-1"
          />
          {form.formState.errors.lastName && (
            <p className="text-sm text-destructive mt-1">
              {form.formState.errors.lastName.message}
            </p>
          )}
        </div>
        
        <div>
          <Label htmlFor="company">Company *</Label>
          <Input
            id="company"
            {...form.register("company")}
            placeholder="Enter company name"
            className="mt-1"
          />
          {form.formState.errors.company && (
            <p className="text-sm text-destructive mt-1">
              {form.formState.errors.company.message}
            </p>
          )}
        </div>
        
        <div>
          <Label htmlFor="title">Job Title *</Label>
          <Input
            id="title"
            {...form.register("title")}
            placeholder="Enter job title"
            className="mt-1"
          />
          {form.formState.errors.title && (
            <p className="text-sm text-destructive mt-1">
              {form.formState.errors.title.message}
            </p>
          )}
        </div>
        
        <div>
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            {...form.register("email")}
            placeholder="Enter email address"
            className="mt-1"
          />
          {form.formState.errors.email && (
            <p className="text-sm text-destructive mt-1">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>
        
        <div>
          <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
          <Input
            id="linkedinUrl"
            type="url"
            {...form.register("linkedinUrl")}
            placeholder="Enter LinkedIn profile URL"
            className="mt-1"
          />
          {form.formState.errors.linkedinUrl && (
            <p className="text-sm text-destructive mt-1">
              {form.formState.errors.linkedinUrl.message}
            </p>
          )}
        </div>
        
        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={createProspectMutation.isPending}
          >
            {createProspectMutation.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Start Research
          </Button>
        </div>
      </form>
    </div>
  );
}
