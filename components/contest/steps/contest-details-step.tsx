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
  description: z.string().min(10, "Description must be at least 10 characters"),
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
    setValue,
    watch,
    clearErrors,
    formState: { errors },
    trigger,
  } = useForm<DetailsFormData>({
    resolver: zodResolver(detailsSchema),
    defaultValues: {
      name: data.name,
      description: data.description,
      metric: data.metric,
      isPublic: data.isPublic,
      maxParticipants: data.maxParticipants,
    },
    mode: "onChange",
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
      maxParticipants: hasMaxParticipants ? formData.maxParticipants : undefined,
    })
    onNext()
  }

  // Manual validation check for better UX
  const isFormValid = 
    watchedName && watchedName.length >= 3 &&
    watchedDescription && watchedDescription.length >= 10 &&
    watchedMetric &&
    (!hasMaxParticipants || (watch("maxParticipants") && watch("maxParticipants")! > 0))

  const handleNext = () => {
    // Trigger validation
    trigger().then((validationResult) => {
      if (validationResult) {
        onNext()
      }
    })
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

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description *</Label>
          <Textarea
            id="description"
            placeholder="Describe your contest, rules, and what participants can expect..."
            rows={4}
            {...register("description")}
            className={errors.description ? "border-red-500" : ""}
          />
          {errors.description && (
            <p className="text-sm text-red-500">{errors.description.message}</p>
          )}
        </div>

        {/* Metric Type */}
        <div className="space-y-2">
          <Label>Contest Metric *</Label>
          <Select
            value={watchedMetric}
            onValueChange={(value: ContestMetric) => setValue("metric", value, { shouldValidate: true })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select how to measure success" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TOTAL_SALES">
                <div>
                  Total Sales Value
                  <div className="text-xs text-gray-500 mt-1">
                    Winner determined by highest total sales amount
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="ORDER_COUNT">
                <div>
                  Number of Orders
                  <div className="text-xs text-gray-500 mt-1">
                    Winner determined by most orders completed
                  </div>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Public Contest Toggle */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-1">
            <Label>Public Contest</Label>
            <p className="text-sm text-gray-500">
              Allow anyone to view the leaderboard and join the contest
            </p>
          </div>
          <Switch
            checked={watch("isPublic")}
            onCheckedChange={(checked) => setValue("isPublic", checked, { shouldValidate: true })}
          />
        </div>

        {/* Max Participants */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Limit Participants</Label>
            <Switch
              checked={hasMaxParticipants}
              onCheckedChange={setHasMaxParticipants}
            />
          </div>
          
          {hasMaxParticipants && (
            <div className="space-y-2">
              <Input
                type="number"
                placeholder="Maximum number of participants"
                min={1}
                max={1000}
                {...register("maxParticipants", { 
                  valueAsNumber: true,
                  required: hasMaxParticipants ? "Maximum participants is required" : false
                })}
              />
              {errors.maxParticipants && (
                <p className="text-sm text-red-500">{errors.maxParticipants.message}</p>
              )}
            </div>
          )}
        </div>

        {/* Next Button */}
        <div className="flex justify-end pt-6">
          <Button type="submit" disabled={!isFormValid} size="lg" onClick={handleNext}>
            Continue to Timeframe
          </Button>
        </div>
      </form>
    </div>
  )
} 