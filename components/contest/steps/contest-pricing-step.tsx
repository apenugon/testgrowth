"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChevronLeft, DollarSign, Trophy } from "lucide-react"
import type { ContestFormData } from "../contest-creation-wizard"
import { formatCurrency } from "@/lib/utils"

const pricingSchema = z.object({
  prizePoolCents: z.number().min(0, "Prize pool cannot be negative"),
})

type PricingFormData = z.infer<typeof pricingSchema>

interface ContestPricingStepProps {
  data: ContestFormData
  onUpdate: (data: Partial<ContestFormData>) => void
  onNext: () => void
  onPrev: () => void
}

export function ContestPricingStep({ data, onUpdate, onNext, onPrev }: ContestPricingStepProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<PricingFormData>({
    resolver: zodResolver(pricingSchema),
    defaultValues: {
      prizePoolCents: data.prizePoolCents / 100,
    },
    mode: "onChange",
  })

  const watchedPrizePool = watch("prizePoolCents")

  const onSubmit = (formData: PricingFormData) => {
    onUpdate({
      entryFeeCents: 0, // Always free
      prizePoolCents: formData.prizePoolCents * 100,
      prizePoolType: "CREATOR_FUNDED", // Always creator funded
      firstPlacePercent: 100, // All to first place
      secondPlacePercent: 0,
      thirdPlacePercent: 0,
    })
    onNext()
  }

  const presetPrizePools = [
    { label: "$50", dollars: 50 },
    { label: "$100", dollars: 100 },
    { label: "$250", dollars: 250 },
    { label: "$500", dollars: 500 },
    { label: "$1000", dollars: 1000 },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Prize Pool</h2>
        <p className="text-gray-600">
          Set the prize amount for your contest winner
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Contest Info */}
        <div className="space-y-4 p-6 bg-emerald-50 rounded-lg">
          <h3 className="text-lg font-semibold text-emerald-900">Contest Details</h3>

          {/* Prize Pool Input */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <Trophy className="h-6 w-6 text-emerald-600" />
              <h3 className="text-xl font-semibold text-emerald-900">Winner's Prize</h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prizePool">Prize Amount (USD)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="prizePool"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="pl-10 text-lg"
                  {...register("prizePoolCents", {
                    valueAsNumber: true,
                  })}
                />
              </div>
              {errors.prizePoolCents && (
                <p className="text-sm text-red-500">{errors.prizePoolCents.message}</p>
              )}
            </div>

            {/* Preset Prize Pools */}
            <div className="space-y-3">
              <Label>Quick Presets</Label>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                {presetPrizePools.map((preset) => (
                  <Button
                    key={preset.dollars}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setValue("prizePoolCents", preset.dollars, { shouldValidate: true })}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={onPrev}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Timeframe
          </Button>
          <Button type="submit" disabled={!isValid} size="lg">
            Review Contest
          </Button>
        </div>
      </form>
    </div>
  )
} 