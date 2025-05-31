"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, DollarSign, Target, Trophy } from "lucide-react"
import type { ContestFormData } from "../contest-creation-wizard"
import { formatCurrency } from "@/lib/utils"

const pricingSchema = z.object({
  entryFeeCents: z.number().min(0, "Entry fee cannot be negative"),
  prizePoolCents: z.number().min(0, "Prize pool cannot be negative"),
  prizePoolType: z.enum(["ENTRY_FEES", "CREATOR_FUNDED", "HYBRID"]),
  firstPlacePercent: z.number().min(0).max(100),
  secondPlacePercent: z.number().min(0).max(100),
  thirdPlacePercent: z.number().min(0).max(100),
}).refine((data) => {
  const total = data.firstPlacePercent + data.secondPlacePercent + data.thirdPlacePercent
  return total === 100
}, {
  message: "Prize percentages must add up to 100%",
  path: ["thirdPlacePercent"],
})

type PricingFormData = z.infer<typeof pricingSchema>

interface ContestPricingStepProps {
  data: ContestFormData
  onUpdate: (data: Partial<ContestFormData>) => void
  onNext: () => void
  onPrev: () => void
}

export function ContestPricingStep({ data, onUpdate, onNext, onPrev }: ContestPricingStepProps) {
  const [isFree, setIsFree] = useState(data.entryFeeCents === 0)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<PricingFormData>({
    resolver: zodResolver(pricingSchema),
    defaultValues: {
      entryFeeCents: data.entryFeeCents / 100,
      prizePoolCents: data.prizePoolCents / 100,
      prizePoolType: data.prizePoolType,
      firstPlacePercent: data.firstPlacePercent || 60,
      secondPlacePercent: data.secondPlacePercent || 30,
      thirdPlacePercent: data.thirdPlacePercent || 10,
    },
    mode: "onChange",
  })

  const watchedEntryFee = watch("entryFeeCents")
  const watchedPrizePool = watch("prizePoolCents")
  const watchedPrizePoolType = watch("prizePoolType")
  const watchedFirstPlace = watch("firstPlacePercent")
  const watchedSecondPlace = watch("secondPlacePercent")
  const watchedThirdPlace = watch("thirdPlacePercent")

  // Auto-adjust percentages when one changes
  useEffect(() => {
    const total = watchedFirstPlace + watchedSecondPlace + watchedThirdPlace
    if (total !== 100 && total > 0) {
      // Auto-balance the remaining percentages
      const remaining = 100 - watchedFirstPlace
      if (remaining >= 0) {
        const secondPercent = Math.round(remaining * 0.75)
        const thirdPercent = remaining - secondPercent
        setValue("secondPlacePercent", secondPercent, { shouldValidate: true })
        setValue("thirdPlacePercent", thirdPercent, { shouldValidate: true })
      }
    }
  }, [watchedFirstPlace, watchedSecondPlace, watchedThirdPlace, setValue])

  const onSubmit = (formData: PricingFormData) => {
    onUpdate({
      entryFeeCents: isFree ? 0 : formData.entryFeeCents * 100,
      prizePoolCents: formData.prizePoolCents * 100,
      prizePoolType: formData.prizePoolType,
      firstPlacePercent: formData.firstPlacePercent,
      secondPlacePercent: formData.secondPlacePercent,
      thirdPlacePercent: formData.thirdPlacePercent,
    })
    onNext()
  }

  const handleFreeToggle = (checked: boolean) => {
    setIsFree(checked)
    if (checked) {
      setValue("entryFeeCents", 0)
      setValue("prizePoolType", "CREATOR_FUNDED")
    } else {
      setValue("prizePoolType", "ENTRY_FEES")
    }
  }

  const presetPrices = [
    { label: "$5", dollars: 5 },
    { label: "$10", dollars: 10 },
    { label: "$25", dollars: 25 },
    { label: "$50", dollars: 50 },
    { label: "$100", dollars: 100 },
  ]

  const presetPrizePools = [
    { label: "$50", dollars: 50 },
    { label: "$100", dollars: 100 },
    { label: "$250", dollars: 250 },
    { label: "$500", dollars: 500 },
    { label: "$1000", dollars: 1000 },
  ]

  const calculateTotalPrizePool = () => {
    if (watchedPrizePoolType === "ENTRY_FEES") {
      // Estimate based on entry fees (assuming some participants)
      const estimatedParticipants = data.maxParticipants || 20
      return Math.round(watchedEntryFee * estimatedParticipants * 100) // Convert to cents for display
    } else if (watchedPrizePoolType === "CREATOR_FUNDED") {
      return Math.round(watchedPrizePool * 100) // Convert to cents for display
    } else {
      // HYBRID
      const estimatedParticipants = data.maxParticipants || 20
      return Math.round((watchedEntryFee * estimatedParticipants + watchedPrizePool) * 100) // Convert to cents for display
    }
  }

  const totalPrizePool = calculateTotalPrizePool()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Pricing & Prize Pool</h2>
        <p className="text-gray-600">
          Set entry fees and configure the prize pool for your contest
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Free Contest Toggle */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-1">
            <Label>Free Contest</Label>
            <p className="text-sm text-gray-500">
              Make this contest free to join for all participants
            </p>
          </div>
          <Switch
            checked={isFree}
            onCheckedChange={handleFreeToggle}
          />
        </div>

        {/* Entry Fee Input */}
        {!isFree && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="entryFee">Entry Fee (USD) *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="entryFee"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="pl-10"
                  {...register("entryFeeCents", {
                    valueAsNumber: true,
                  })}
                />
              </div>
              {errors.entryFeeCents && (
                <p className="text-sm text-red-500">{errors.entryFeeCents.message}</p>
              )}
              {watchedEntryFee > 0 && (
                <p className="text-sm text-gray-500">
                  Entry fee: {formatCurrency(Math.round(watchedEntryFee * 100))}
                </p>
              )}
            </div>

            {/* Preset Prices */}
            <div className="space-y-3">
              <Label>Quick Presets</Label>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                {presetPrices.map((preset) => (
                  <Button
                    key={preset.dollars}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setValue("entryFeeCents", preset.dollars, { shouldValidate: true })}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Prize Pool Configuration */}
        <div className="space-y-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-3">
            <Trophy className="h-5 w-5 text-emerald-600" />
            <h3 className="text-lg font-semibold text-emerald-900">Prize Pool Setup</h3>
          </div>

          {/* Prize Pool Type */}
          <div className="space-y-2">
            <Label>Prize Pool Source</Label>
            <Select
              value={watchedPrizePoolType}
              onValueChange={(value: "ENTRY_FEES" | "CREATOR_FUNDED" | "HYBRID") => 
                setValue("prizePoolType", value, { shouldValidate: true })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select prize pool source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ENTRY_FEES" disabled={isFree}>
                  <div>
                    Entry Fees Only
                    <div className="text-xs text-gray-500 mt-1">
                      Prize pool comes from participant entry fees
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="CREATOR_FUNDED">
                  <div>
                    Creator Funded
                    <div className="text-xs text-gray-500 mt-1">
                      You fund the entire prize pool
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="HYBRID" disabled={isFree}>
                  <div>
                    Hybrid (Entry Fees + Creator)
                    <div className="text-xs text-gray-500 mt-1">
                      Combine entry fees with your contribution
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Creator Prize Pool Contribution */}
          {(watchedPrizePoolType === "CREATOR_FUNDED" || watchedPrizePoolType === "HYBRID") && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prizePool">
                  {watchedPrizePoolType === "CREATOR_FUNDED" ? "Total Prize Pool" : "Your Contribution"} (USD) *
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="prizePool"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="pl-10"
                    {...register("prizePoolCents", {
                      valueAsNumber: true,
                    })}
                  />
                </div>
                {errors.prizePoolCents && (
                  <p className="text-sm text-red-500">{errors.prizePoolCents.message}</p>
                )}
                {watchedPrizePool > 0 && (
                  <p className="text-sm text-gray-500">
                    {watchedPrizePoolType === "CREATOR_FUNDED" ? "Prize pool" : "Your contribution"}: {formatCurrency(Math.round(watchedPrizePool * 100))}
                  </p>
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
          )}

          {/* Total Prize Pool Display */}
          {totalPrizePool > 0 && (
            <div className="p-3 bg-white border border-emerald-300 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-medium text-emerald-900">Total Prize Pool:</span>
                <span className="text-lg font-bold text-emerald-600">
                  {formatCurrency(totalPrizePool)}
                </span>
              </div>
              {watchedPrizePoolType === "ENTRY_FEES" && (
                <p className="text-xs text-emerald-700 mt-1">
                  *Estimated based on {data.maxParticipants || 20} participants
                </p>
              )}
            </div>
          )}
        </div>

        {/* Prize Distribution */}
        {totalPrizePool > 0 && (
          <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-3">
              <Target className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-blue-900">Prize Distribution</h3>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstPlace">1st Place (%)</Label>
                <Input
                  id="firstPlace"
                  type="number"
                  min="0"
                  max="100"
                  {...register("firstPlacePercent", { valueAsNumber: true })}
                />
                {totalPrizePool > 0 && (
                  <p className="text-sm text-blue-600">
                    {formatCurrency(Math.round(totalPrizePool * watchedFirstPlace / 100))}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondPlace">2nd Place (%)</Label>
                <Input
                  id="secondPlace"
                  type="number"
                  min="0"
                  max="100"
                  {...register("secondPlacePercent", { valueAsNumber: true })}
                />
                {totalPrizePool > 0 && (
                  <p className="text-sm text-blue-600">
                    {formatCurrency(Math.round(totalPrizePool * watchedSecondPlace / 100))}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="thirdPlace">3rd Place (%)</Label>
                <Input
                  id="thirdPlace"
                  type="number"
                  min="0"
                  max="100"
                  {...register("thirdPlacePercent", { valueAsNumber: true })}
                />
                {totalPrizePool > 0 && (
                  <p className="text-sm text-blue-600">
                    {formatCurrency(Math.round(totalPrizePool * watchedThirdPlace / 100))}
                  </p>
                )}
              </div>
            </div>

            {errors.thirdPlacePercent && (
              <p className="text-sm text-red-500">{errors.thirdPlacePercent.message}</p>
            )}

            <div className="flex items-center justify-between text-sm">
              <span>Total Distribution:</span>
              <span className={`font-medium ${
                (watchedFirstPlace + watchedSecondPlace + watchedThirdPlace) === 100 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                {watchedFirstPlace + watchedSecondPlace + watchedThirdPlace}%
              </span>
            </div>

            {/* Quick Distribution Presets */}
            <div className="space-y-2">
              <Label>Quick Presets</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setValue("firstPlacePercent", 60)
                    setValue("secondPlacePercent", 30)
                    setValue("thirdPlacePercent", 10)
                  }}
                >
                  60/30/10
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setValue("firstPlacePercent", 50)
                    setValue("secondPlacePercent", 30)
                    setValue("thirdPlacePercent", 20)
                  }}
                >
                  50/30/20
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setValue("firstPlacePercent", 70)
                    setValue("secondPlacePercent", 20)
                    setValue("thirdPlacePercent", 10)
                  }}
                >
                  70/20/10
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setValue("firstPlacePercent", 100)
                    setValue("secondPlacePercent", 0)
                    setValue("thirdPlacePercent", 0)
                  }}
                >
                  Winner Takes All
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Trophy className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-900">Participants</span>
            </div>
            <p className="text-sm text-blue-700">
              {isFree ? "Free to join" : `${formatCurrency(Math.round(watchedEntryFee * 100))} entry fee`}
            </p>
          </div>

          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Trophy className="h-5 w-5 text-emerald-600" />
              <span className="font-medium text-emerald-900">Prize Pool</span>
            </div>
            <p className="text-sm text-emerald-700">
              {totalPrizePool > 0 
                ? formatCurrency(totalPrizePool)
                : "No monetary prizes"
              }
            </p>
          </div>

          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <DollarSign className="h-5 w-5 text-purple-600" />
              <span className="font-medium text-purple-900">Platform Fee</span>
            </div>
            <p className="text-sm text-purple-700">
              {isFree ? "No fees" : "Handled by Whop"}
            </p>
          </div>
        </div>

        {/* Whop Integration Info */}
        {!isFree && (
          <div className="p-4 bg-gray-50 border rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Payment Processing</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Payments processed securely through Whop</li>
              <li>• Automatic participant verification</li>
              <li>• Built-in refund and dispute handling</li>
              <li>• Real-time payment notifications</li>
              {watchedPrizePoolType === "CREATOR_FUNDED" || watchedPrizePoolType === "HYBRID" ? (
                <li>• Creator prize pool held in escrow until contest ends</li>
              ) : null}
            </ul>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-6">
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