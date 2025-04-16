"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import type { Role, Participant } from "@/lib/types"
import { X, Edit2 } from "lucide-react"

interface RoleEditorProps {
  participant: Participant
  onUpdate: (updatedParticipant: Participant) => void
  language: "en" | "fr"
}

export default function RoleEditor({ participant, onUpdate, language }: RoleEditorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [customRole, setCustomRole] = useState(participant.customRole || "")

  const roleOptions: { id: Role; label: { en: string; fr: string }; color: string }[] = [
    {
      id: "primary-contact",
      label: { en: "Primary Contact", fr: "Contact Principal" },
      color: "bg-purple-100 text-purple-800",
    },
    { id: "prayer-team", label: { en: "Prayer Team", fr: "Équipe de Prière" }, color: "bg-blue-100 text-blue-800" },
    { id: "food-crew", label: { en: "Food Crew", fr: "Équipe Repas" }, color: "bg-green-100 text-green-800" },
    {
      id: "worship-team",
      label: { en: "Worship Team", fr: "Équipe de Louange" },
      color: "bg-yellow-100 text-yellow-800",
    },
    {
      id: "setup-crew",
      label: { en: "Setup Crew", fr: "Équipe Installation" },
      color: "bg-orange-100 text-orange-800",
    },
    { id: "cleanup-crew", label: { en: "Cleanup Crew", fr: "Équipe Nettoyage" }, color: "bg-red-100 text-red-800" },
    {
      id: "activities-coordinator",
      label: { en: "Activities Coordinator", fr: "Coordinateur Activités" },
      color: "bg-indigo-100 text-indigo-800",
    },
    { id: "transportation", label: { en: "Transportation", fr: "Transport" }, color: "bg-pink-100 text-pink-800" },
    { id: "custom", label: { en: "Custom Role", fr: "Rôle Personnalisé" }, color: "bg-gray-100 text-gray-800" },
  ]

  const getRoleColor = (role: Role): string => {
    const option = roleOptions.find((opt) => opt.id === role)
    return option ? option.color : "bg-gray-100 text-gray-800"
  }

  const getRoleLabel = (role: Role): string => {
    const option = roleOptions.find((opt) => opt.id === role)
    return option ? option.label[language] : role
  }

  const toggleRole = (role: Role) => {
    let updatedRoles: Role[]

    if (participant.roles.includes(role)) {
      updatedRoles = participant.roles.filter((r) => r !== role)
    } else {
      updatedRoles = [...participant.roles, role]
    }

    onUpdate({
      ...participant,
      roles: updatedRoles,
      customRole: role === "custom" ? customRole : participant.customRole,
    })
  }

  const handleCustomRoleChange = (value: string) => {
    setCustomRole(value)
    if (participant.roles.includes("custom")) {
      onUpdate({
        ...participant,
        customRole: value,
      })
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {participant.roles.map((role) => (
          <Badge key={role} className={`${getRoleColor(role)} px-2 py-1 text-sm flex items-center gap-1`}>
            {role === "custom" ? participant.customRole : getRoleLabel(role)}
            <button
              onClick={() => toggleRole(role)}
              className="ml-1 rounded-full hover:bg-gray-200 p-0.5"
              aria-label={language === "en" ? "Remove role" : "Supprimer le rôle"}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="text-sm">
            <Edit2 className="h-3 w-3 mr-1" />
            {language === "en" ? "Edit Roles" : "Modifier les rôles"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-4">
            <h4 className="font-medium text-lg">{language === "en" ? "Assign Roles" : "Assigner des rôles"}</h4>
            <div className="space-y-2">
              {roleOptions.map((option) => (
                <div key={option.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`role-${option.id}`}
                    checked={participant.roles.includes(option.id)}
                    onCheckedChange={() => toggleRole(option.id)}
                  />
                  <label
                    htmlFor={`role-${option.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {option.label[language]}
                  </label>
                </div>
              ))}

              {participant.roles.includes("custom") && (
                <div className="pt-2">
                  <Input
                    placeholder={language === "en" ? "Enter custom role" : "Entrer un rôle personnalisé"}
                    value={customRole}
                    onChange={(e) => handleCustomRoleChange(e.target.value)}
                    className="text-sm"
                  />
                </div>
              )}
            </div>

            <Button onClick={() => setIsOpen(false)} className="w-full">
              {language === "en" ? "Done" : "Terminé"}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
