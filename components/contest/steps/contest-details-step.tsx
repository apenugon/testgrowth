"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import type { ContestFormData } from "../contest-creation-wizard"
import type { ContestMetric } from "@/lib/db/contests"

const detailsSchema = z.object({
  name: z.string().min(3, "Contest name must be at least 3 characters"),
  description: z.string().optional(),
  metric: z.enum(["TOTAL_SALES", "ORDER_COUNT"]),
  isPublic: z.boolean(),
  maxParticipants: z.number().min(1, "Must be at least 1 participant").optional(),
})

type DetailsFormData = z.infer<typeof detailsSchema>

interface ContestDetailsStepProps {
  data: ContestFormData
  onUpdate: (data: Partial<ContestFormData>) => void
  onNext: () => void
}

export function ContestDetailsStep({ data, onUpdate, onNext }: ContestDetailsStepProps) {
  const [hasMaxParticipants, setHasMaxParticipants] = useState(!!data.maxParticipants)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid: isFormValid },
    clearErrors,
    trigger,
  } = useForm<DetailsFormData>({
    resolver: zodResolver(detailsSchema),
    mode: "onChange",
    defaultValues: {
      name: data.name,
      description: data.description,
      metric: data.metric,
      isPublic: data.isPublic,
      maxParticipants: data.maxParticipants,
    },
  })

  const watchedMetric = watch("metric")
  const watchedName = watch("name")
  const watchedDescription = watch("description")

  // Clear maxParticipants errors when toggle is off
  useEffect(() => {
    if (!hasMaxParticipants) {
      clearErrors("maxParticipants")
      setValue("maxParticipants", undefined)
    }
  }, [hasMaxParticipants, clearErrors, setValue])

  const onSubmit = (formData: DetailsFormData) => {
    onUpdate({
      ...formData,
      description: formData.description || "",
      metric: formData.metric || "TOTAL_SALES",
      maxParticipants: hasMaxParticipants ? formData.maxParticipants : undefined,
    })
    onNext()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Contest Details</h2>
        <p className="text-gray-600">
          Set up the basic information for your sales contest
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Contest Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Contest Name *</Label>
          <Input
            id="name"
            placeholder="e.g., Black Friday Sales Challenge"
            {...register("name")}
            className={errors.name ? "border-red-500" : ""}
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>
        
        {/* Continue Button */}
        <div className="flex justify-end">
          <Button type="submit" disabled={!isFormValid} size="lg">
            Continue to Timeframe
          </Button>
        </div>
      </form>
    </div>
  )
} 