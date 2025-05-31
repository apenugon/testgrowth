"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { ContestDetailsStep } from "./steps/contest-details-step"
import { ContestTimeframeStep } from "./steps/contest-timeframe-step"
import { ContestPricingStep } from "./steps/contest-pricing-step"
import { ContestReviewStep } from "./steps/contest-review-step"
import type { ContestMetric } from "@/lib/db/contests"

export interface ContestFormData {
  // Step 1: Details
  name: string
  description: string
  metric: ContestMetric
  isPublic: boolean
  maxParticipants?: number
  
  // Step 2: Timeframe
  startAt: Date
  endAt: Date
  
  // Step 3: Pricing & Prize Pool
  entryFeeCents: number
  prizePoolCents: number
  prizePoolType: "ENTRY_FEES" | "CREATOR_FUNDED" | "HYBRID"
  firstPlacePercent: number
  secondPlacePercent: number
  thirdPlacePercent: number
  
  // Generated
  slug?: string
  whopPlanId?: string
}

interface ContestCreationWizardProps {
  userToken?: string | null
  experienceId?: string
}

const steps = [
  { id: 1, title: "Contest Details", description: "Name, description, and rules" },
  { id: 2, title: "Timeframe", description: "Start and end dates" },
  { id: 3, title: "Pricing & Prizes", description: "Entry fees and prize pool" },
  { id: 4, title: "Review", description: "Review and publish" },
]

export function ContestCreationWizard({ userToken, experienceId }: ContestCreationWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<ContestFormData>({
    name: "",
    description: "",
    metric: "TOTAL_SALES",
    isPublic: true,
    startAt: new Date(),
    endAt: new Date(),
    entryFeeCents: 0,
    prizePoolCents: 0,
    prizePoolType: "ENTRY_FEES",
    firstPlacePercent: 60,
    secondPlacePercent: 30,
    thirdPlacePercent: 10,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const updateFormData = (data: Partial<ContestFormData>) => {
    setFormData(prev => ({ ...prev, ...data }))
  }

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <ContestDetailsStep
            data={formData}
            onUpdate={updateFormData}
            onNext={nextStep}
          />
        )
      case 2:
        return (
          <ContestTimeframeStep
            data={formData}
            onUpdate={updateFormData}
            onNext={nextStep}
            onPrev={prevStep}
          />
        )
      case 3:
        return (
          <ContestPricingStep
            data={formData}
            onUpdate={updateFormData}
            onNext={nextStep}
            onPrev={prevStep}
          />
        )
      case 4:
        return (
          <ContestReviewStep
            data={formData}
            userToken={userToken}
            experienceId={experienceId}
            onPrev={prevStep}
            isSubmitting={isSubmitting}
            setIsSubmitting={setIsSubmitting}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-8">
      {/* Progress Indicator */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  currentStep >= step.id
                    ? "bg-emerald-500 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {step.id}
              </div>
              <div className="mt-2 text-center">
                <div className="text-sm font-medium text-gray-900">
                  {step.title}
                </div>
                <div className="text-xs text-gray-500">
                  {step.description}
                </div>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-4 transition-colors ${
                  currentStep > step.id ? "bg-emerald-500" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card className="min-h-[500px]">
        <CardContent className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  )
} 