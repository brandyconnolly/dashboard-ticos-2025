"use client"

import { useState } from "react"
import DataStatus from "@/components/data-status"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Mock data for demonstration
const mockSpecialConsiderations = [
  {
    id: 1,
    name: "Agnès M.",
    type: "room",
    note: "Prefers to room alone if possible.",
  },
  {
    id: 2,
    name: "Lee Family",
    type: "dietary",
    note: "Two vegetarian adults; 1 peanut allergy (child).",
  },
  {
    id: 3,
    name: "Robert L.",
    type: "medical",
    note: "Uses wheelchair (needs ground-floor room).",
  },
  {
    id: 4,
    name: "Chen Family",
    type: "medical",
    note: "One member has severe asthma (carries inhaler).",
  },
  {
    id: 5,
    name: "Smith Family",
    type: "dietary",
    note: "Gluten-free diet (Jane); No dairy (John).",
  },
  {
    id: 6,
    name: "Johnson Family",
    type: "other",
    note: "Offered to sponsor others financially.",
  },
]

export default function SpecialPage() {
  const [language, setLanguage] = useState<"en" | "fr">("en")
  const [considerations, setConsiderations] = useState(mockSpecialConsiderations)
  const [newConsideration, setNewConsideration] = useState({
    name: "",
    type: "dietary",
    note: "",
  })
  const [dialogOpen, setDialogOpen] = useState(false)

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "dietary":
        return "🍽️"
      case "medical":
        return "❤️"
      case "room":
        return "🏠"
      default:
        return "⭐"
    }
  }

  const getTypeLabel = (type: string, lang: "en" | "fr") => {
    if (lang === "en") {
      switch (type) {
        case "dietary":
          return "Dietary"
        case "medical":
          return "Medical"
        case "room":
          return "Room Preference"
        default:
          return "Other"
      }
    } else {
      switch (type) {
        case "dietary":
          return "Alimentaire"
        case "medical":
          return "Médical"
        case "room":
          return "Préférence de chambre"
        default:
          return "Autre"
      }
    }
  }

  const handleAddConsideration = () => {
    if (newConsideration.name && newConsideration.note) {
      setConsiderations([
        ...considerations,
        {
          id: considerations.length + 1,
          ...newConsideration,
        },
      ])
      setNewConsideration({
        name: "",
        type: "dietary",
        note: "",
      })
      setDialogOpen(false)
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">{language === "en" ? "Special Considerations" : "Besoins Spéciaux"}</h1>

      <DataStatus language={language} />

      <div className="flex justify-end mb-6">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="text-lg">
              <PlusCircle className="mr-2 h-5 w-5" />
              {language === "en" ? "Add Note" : "Ajouter une note"}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-xl">
                {language === "en" ? "Add Special Consideration" : "Ajouter un besoin spécial"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label htmlFor="name" className="text-lg font-medium">
                  {language === "en" ? "Name/Family" : "Nom/Famille"}
                </label>
                <Input
                  id="name"
                  value={newConsideration.name}
                  onChange={(e) => setNewConsideration({ ...newConsideration, name: e.target.value })}
                  className="text-lg"
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="type" className="text-lg font-medium">
                  {language === "en" ? "Type" : "Type"}
                </label>
                <Select
                  value={newConsideration.type}
                  onValueChange={(value) => setNewConsideration({ ...newConsideration, type: value })}
                >
                  <SelectTrigger className="text-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dietary">{language === "en" ? "Dietary" : "Alimentaire"} 🍽️</SelectItem>
                    <SelectItem value="medical">{language === "en" ? "Medical" : "Médical"} ❤️</SelectItem>
                    <SelectItem value="room">
                      {language === "en" ? "Room Preference" : "Préférence de chambre"} 🏠
                    </SelectItem>
                    <SelectItem value="other">{language === "en" ? "Other" : "Autre"} ⭐</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <label htmlFor="note" className="text-lg font-medium">
                  {language === "en" ? "Note" : "Note"}
                </label>
                <Textarea
                  id="note"
                  value={newConsideration.note}
                  onChange={(e) => setNewConsideration({ ...newConsideration, note: e.target.value })}
                  className="text-lg"
                  rows={3}
                />
              </div>
            </div>
            <Button onClick={handleAddConsideration} className="text-lg">
              {language === "en" ? "Add" : "Ajouter"}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {considerations.map((item) => (
          <div key={item.id} className="bg-white rounded-lg shadow-sm border p-4 md:p-6">
            <div className="flex items-start">
              <span className="text-xl md:text-2xl mr-2 md:mr-3">{getTypeIcon(item.type)}</span>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg md:text-xl font-semibold truncate">{item.name}</h3>
                <p className="text-xs md:text-sm text-gray-500 mb-1 md:mb-2">{getTypeLabel(item.type, language)}</p>
                <p className="text-sm md:text-lg break-words">{item.note}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
