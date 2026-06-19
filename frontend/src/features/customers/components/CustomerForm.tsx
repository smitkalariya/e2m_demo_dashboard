"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { extractErrorMessage } from "@/services/axios";
import { customerService } from "@/services/customer.service";
import { customerFormSchema, customerStatusOptions, type CustomerFormValues } from "../validation";
import type { Customer } from "../types";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

const STATUS_OPTIONS = customerStatusOptions.map((value) => ({ label: value, value }));

interface CustomerFormProps {
  customer?: Customer;
}

export function CustomerForm({ customer }: CustomerFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isEditing = Boolean(customer);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      company_name: customer?.company_name ?? "",
      contact_name: customer?.contact_name ?? "",
      email: customer?.email ?? "",
      phone: customer?.phone ?? "",
      status: customer?.status ?? "prospect",
    },
  });

  const onSubmit = async (values: CustomerFormValues) => {
    setSubmitError(null);
    const payload = { ...values, phone: values.phone || undefined };
    try {
      if (isEditing && customer) {
        const updated = await customerService.update(customer.id, payload);
        router.push(`/customers/${updated.id}`);
      } else {
        const created = await customerService.create(payload);
        router.push(`/customers/${created.id}`);
      }
    } catch (error) {
      setSubmitError(extractErrorMessage(error, "Failed to save customer"));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Input
        label="Company name"
        error={errors.company_name?.message}
        {...register("company_name")}
      />
      <Input
        label="Contact name"
        error={errors.contact_name?.message}
        {...register("contact_name")}
      />
      <Input label="Email" type="email" error={errors.email?.message} {...register("email")} />
      <Input label="Phone" error={errors.phone?.message} {...register("phone")} />
      <Select label="Status" options={STATUS_OPTIONS} error={errors.status?.message} {...register("status")} />

      {submitError && <p className="text-sm text-red-600">{submitError}</p>}

      <div className="flex gap-3">
        <Button type="submit" isLoading={isSubmitting}>
          {isEditing ? "Save changes" : "Create customer"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
