"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { extractErrorMessage } from "@/services/axios";
import { interactionService } from "@/services/interaction.service";
import { interactionFormSchema, type InteractionFormValues } from "../validation";
import type { Interaction } from "../types";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface InteractionFormProps {
  customerId: string;
  onCreated: (interaction: Interaction) => void;
  onCancel: () => void;
}

export function InteractionForm({ customerId, onCreated, onCancel }: InteractionFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InteractionFormValues>({ resolver: zodResolver(interactionFormSchema) });

  const onSubmit = async (values: InteractionFormValues) => {
    setSubmitError(null);
    try {
      const created = await interactionService.create(customerId, {
        ...values,
        meeting_date: new Date(values.meeting_date).toISOString(),
      });
      reset();
      onCreated(created);
    } catch (error) {
      setSubmitError(extractErrorMessage(error, "Failed to log interaction"));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5">
      <Input label="Title" error={errors.title?.message} {...register("title")} />
      <Input
        label="Meeting date"
        type="datetime-local"
        error={errors.meeting_date?.message}
        {...register("meeting_date")}
      />
      <div className="flex flex-col gap-1">
        <label htmlFor="notes" className="text-sm font-medium text-slate-700">
          Notes
        </label>
        <textarea
          id="notes"
          rows={5}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-900/20"
          {...register("notes")}
        />
        {errors.notes?.message && <p className="text-sm text-red-600">{errors.notes.message}</p>}
      </div>

      {submitError && <p className="text-sm text-red-600">{submitError}</p>}

      <div className="flex gap-3">
        <Button type="submit" isLoading={isSubmitting}>
          Log interaction
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
