"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChevronLeft } from "lucide-react"
import type { ContestFormData } from "../contest-creation-wizard"
import { formatDate } from "@/lib/utils"

const timeframeSchema = z.object({
  startAt: z.string().refine((date) => {
    const startDate = new Date(date)
    const now = new Date()
    return startDate > now
  }, "Start date must be in the future"),
  endAt: z.string(),
}).refine((data) => {
  const startDate = new Date(data.startAt)
  const endDate = new Date(data.endAt)
  return endDate > startDate
}, {
  message: "End date must be after start date",
  path: ["endAt"],
})

type TimeframeFormData = z.infer<typeof timeframeSchema>

interface ContestTimeframeStepProps {
  data: ContestFormData
  onUpdate: (data: Partial<ContestFormData>) => void
  onNext: () => void
  onPrev: () => void
}

export function ContestTimeframeStep({ data, onUpdate, onNext, onPrev }: ContestTimeframeStepProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<TimeframeFormData>({
    resolver: zodResolver(timeframeSchema),
    defaultValues: {
      startAt: data.startAt.toISOString().slice(0, 16),
      endAt: data.endAt.toISOString().slice(0, 16),
    },
    mode: "onChange",
  })

  const watchedStartAt = watch("startAt")
  const watchedEndAt = watch("endAt")

  const onSubmit = (formData: TimeframeFormData) => {
    onUpdate({
      startAt: new Date(formData.startAt),
      endAt: new Date(formData.endAt),
    })
    onNext()
  }

  const calculateDuration = () => {
    if (watchedStartAt && watchedEndAt) {
      const start = new Date(watchedStartAt)
      const end = new Date(watchedEndAt)
      const diffMs = end.getTime() - start.getTime()
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
      
      if (diffDays === 1) return "1 day"
      if (diffDays < 7) return `${diffDays} days`
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''}`
      return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''}`
    }
    return null
  }

  const setPresetDuration = (hours: number) => {
    const now = new Date()
    const start = new Date(now.getTime() + 60 * 60 * 1000) // 1 hour from now
    const end = new Date(start.getTime() + hours * 60 * 60 * 1000)
    
    setValue("startAt", start.toISOString().slice(0, 16), { shouldValidate: true })
    setValue("endAt", end.toISOString().slice(0, 16), { shouldValidate: true })
  }

  const duration = calculateDuration()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Contest Timeframe</h2>
        <p className="text-gray-600">
          Set when your contest will start and end
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Start Date */}
        <div className="space-y-2">
          <Label htmlFor="startAt">Contest Start Date & Time *</Label>
          <Input
            id="startAt"
            type="datetime-local"
            {...register("startAt")}
            className={errors.startAt ? "border-red-500" : ""}
          />
          {errors.startAt && (
            <p className="text-sm text-red-500">{errors.startAt.message}</p>
          )}
          {watchedStartAt && (
            <p className="text-sm text-gray-500">
              Contest starts: {formatDate(new Date(watchedStartAt))}
            </p>
          )}
        </div>

        {/* End Date */}
        <div className="space-y-2">
          <Label htmlFor="endAt">Contest End Date & Time *</Label>
          <Input
            id="endAt"
            type="datetime-local"
            {...register("endAt")}
            className={errors.endAt ? "border-red-500" : ""}
          />
          {errors.endAt && (
            <p className="text-sm text-red-500">{errors.endAt.message}</p>
          )}
          {watchedEndAt && (
            <p className="text-sm text-gray-500">
              Contest ends: {formatDate(new Date(watchedEndAt))}
            </p>
          )}
        </div>

        {/* Duration Preview */}
        {isValid && duration && (
          <div className="p-4 bg-emerald-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              <span className="text-sm font-medium text-emerald-800">
                Contest Duration: {duration}
              </span>
            </div>
          </div>
        )}

        {/* Quick Duration Presets */}
        <div className="space-y-3">
          <Label>Quick Presets</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { label: "1 Day", hours: 24 },
              { label: "3 Days", hours: 72 },
              { label: "1 Week", hours: 168 },
              { label: "2 Weeks", hours: 336 },
            ].map((preset) => (
              <Button
                key={preset.label}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPresetDuration(preset.hours)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-6">
          <Button type="button" variant="outline" onClick={onPrev}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Details
          </Button>
          <Button type="submit" disabled={!isValid} size="lg">
            Continue to Pricing
          </Button>
        </div>
      </form>
    </div>
  )
} 