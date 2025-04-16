"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import type { Participant } from "@/lib/types"
import { Edit2 } from "lucide-react"

interface ColorTeamEditorProps {
  participant: Participant
  onUpdate: (updatedParticipant: Participant) => void
  language: "en" | "fr"
}

export default function ColorTeamEditor({ participant, onUpdate, language }: ColorTeamEditorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [customColor, setCustomColor] = useState("")

  const colorOptions = [
    { id: "red", label: { en: "Red Team", fr: "Équipe Rouge" }, color: "bg-red-500" },
    { id: "blue", label: { en: "Blue Team", fr: "Équipe Bleue" }, color: "bg-blue-500" },
    { id: "green", label: { en: "Green Team", fr: "Équipe Verte" }, color: "bg-green-500" },
    { id: "yellow", label: { en: "Yellow Team", fr: "Équipe Jaune" }, color: "bg-yellow-500" },
    { id: "purple", label: { en: "Purple Team", fr: "Équipe Violette" }, color: "bg-purple-500" },
    { id: "orange", label: { en: "Orange Team", fr: "Équipe Orange" }, color: "bg-orange-500" },
    { id: "custom", label: { en: "Custom Color", fr: "Couleur Personnalisée" }, color: "bg-gray-500" },
    { id: "none", label: { en: "No Team", fr: "Aucune Équipe" }, color: "bg-gray-200" },
  ]

  const getColorDisplay = () => {
    if (!participant.colorTeam) return null

    const option = colorOptions.find((opt) => opt.id === participant.colorTeam)
    if (!option) return null

    return (
      <div className="flex items-center gap-2">
        <div className={`w-4 h-4 rounded-full ${option.color}`}></div>
        <span>{option.label[language]}</span>
      </div>
    )
  }

  const handleColorChange = (color: string) => {
    onUpdate({
      ...participant,
      colorTeam: color === "none" ? undefined : color,
    })
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {participant.colorTeam ? (
          getColorDisplay()
        ) : (
          <span className="text-gray-500 text-sm">
            {language === "en" ? "No team assigned" : "Aucune équipe assignée"}
          </span>
        )}
      </div>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="text-sm">
            <Edit2 className="h-3 w-3 mr-1" />
            {language === "en" ? "Assign Team" : "Assigner une équipe"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-4">
            <h4 className="font-medium text-lg">
              {language === "en" ? "Assign Color Team" : "Assigner une équipe de couleur"}
            </h4>

            <RadioGroup value={participant.colorTeam || "none"} onValueChange={handleColorChange} className="space-y-2">
              {colorOptions.map((option) => (
                <div key={option.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.id} id={`color-${option.id}`} />
                  <Label htmlFor={`color-${option.id}`} className="flex items-center gap-2 cursor-pointer">
                    <div className={`w-4 h-4 rounded-full ${option.color}`}></div>
                    {option.label[language]}
                  </Label>
                </div>
              ))}
            </RadioGroup>

            {participant.colorTeam === "custom" && (
              <div className="pt-2">
                <Input
                  placeholder={language === "en" ? "Enter custom color name" : "Entrer un nom de couleur personnalisé"}
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  className="text-sm"
                />
              </div>
            )}

            <Button onClick={() => setIsOpen(false)} className="w-full">
              {language === "en" ? "Done" : "Terminé"}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
