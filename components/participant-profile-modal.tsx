"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Calendar, Mail, Phone, User, Users } from "lucide-react"
import RoleEditor from "@/components/role-editor"
import ColorTeamEditor from "@/components/color-team-editor"
import type { Participant, Family } from "@/lib/types"
import { useLanguage } from "@/hooks/use-language"
import { getTranslation } from "@/lib/translations"

interface ParticipantProfileModalProps {
  participant: Participant | null
  family?: Family | null
  isOpen: boolean
  onClose: () => void
  onUpdate: (updatedParticipant: Participant) => void
  allParticipants: Participant[]
}

export default function ParticipantProfileModal({
  participant,
  family,
  isOpen,
  onClose,
  onUpdate,
  allParticipants,
}: ParticipantProfileModalProps) {
  const { language } = useLanguage()
  const [comments, setComments] = useState(participant?.comments || "")
  const [attendance, setAttendance] = useState(
    participant?.attendance || {
      fullAttendance: true,
      days: { friday: true, saturday: true, sunday: true },
    },
  )

  if (!participant) return null

  const familyMembers = allParticipants.filter((p) => p.familyId === participant.familyId && p.id !== participant.id)

  // Update the handleUpdateComments function to save immediately
  const handleUpdateComments = () => {
    const updatedParticipant = {
      ...participant,
      comments,
    }
    onUpdate(updatedParticipant)
  }

  // Update the handleAttendanceChange function to save immediately
  const handleAttendanceChange = (day: "friday" | "saturday" | "sunday", value: boolean) => {
    const newAttendance = {
      ...attendance,
      days: {
        ...attendance.days,
        [day]: value,
      },
    }

    // Update fullAttendance based on all days being true
    newAttendance.fullAttendance = newAttendance.days.friday && newAttendance.days.saturday && newAttendance.days.sunday

    setAttendance(newAttendance)

    onUpdate({
      ...participant,
      attendance: newAttendance,
    })
  }

  // Update the handleToggleFullAttendance function to save immediately
  const handleToggleFullAttendance = () => {
    const newFullAttendance = !attendance.fullAttendance

    const newAttendance = {
      fullAttendance: newFullAttendance,
      days: {
        friday: newFullAttendance,
        saturday: newFullAttendance,
        sunday: newFullAttendance,
      },
    }

    setAttendance(newAttendance)

    onUpdate({
      ...participant,
      attendance: newAttendance,
    })
  }

  const getAgeGroupLabel = (ageGroup: string) => {
    return getTranslation(ageGroup, language)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <User className="h-6 w-6" />
            {participant.name}
            {participant.isPrimaryContact && (
              <Badge className="ml-2 bg-purple-100 text-purple-800">
                {getTranslation("primary_contact", language)}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Basic Info */}
          <div className="grid gap-2">
            <h3 className="text-lg font-medium">{getTranslation("basic_info", language)}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-gray-500" />
                <div>
                  <div className="text-sm text-gray-500">{getTranslation("family", language)}</div>
                  <div>{family?.name || `Family ID: ${participant.familyId}`}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-gray-500" />
                <div>
                  <div className="text-sm text-gray-500">{getTranslation("age_group", language)}</div>
                  <div>{getAgeGroupLabel(participant.ageGroup)}</div>
                </div>
              </div>
              {participant.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-gray-500" />
                  <div>
                    <div className="text-sm text-gray-500">{getTranslation("phone", language)}</div>
                    <div>{participant.phone}</div>
                  </div>
                </div>
              )}
              {participant.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-gray-500" />
                  <div>
                    <div className="text-sm text-gray-500">{getTranslation("email", language)}</div>
                    <div>{participant.email}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Family Members */}
          {familyMembers.length > 0 && (
            <div className="grid gap-2">
              <h3 className="text-lg font-medium">{getTranslation("family_members", language)}</h3>
              <div className="bg-gray-50 p-3 rounded-md">
                <ul className="space-y-1">
                  {familyMembers.map((member) => (
                    <li key={member.id} className="flex items-center justify-between">
                      <span>{member.name}</span>
                      <Badge variant="outline">{getAgeGroupLabel(member.ageGroup)}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Roles */}
          <div className="grid gap-2">
            <h3 className="text-lg font-medium">{getTranslation("roles", language)}</h3>
            <RoleEditor participant={participant} onUpdate={onUpdate} language={language} />
          </div>

          {/* Color Team */}
          <div className="grid gap-2">
            <h3 className="text-lg font-medium">{getTranslation("color_team", language)}</h3>
            <ColorTeamEditor participant={participant} onUpdate={onUpdate} language={language} />
          </div>

          {/* Attendance */}
          <div className="grid gap-2">
            <h3 className="text-lg font-medium">{getTranslation("attendance", language)}</h3>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Button
                  variant={attendance.fullAttendance ? "default" : "outline"}
                  onClick={handleToggleFullAttendance}
                  className="w-full"
                >
                  {getTranslation("full_attendance", language)}
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-2">
                <Button
                  variant={attendance.days.friday ? "default" : "outline"}
                  onClick={() => handleAttendanceChange("friday", !attendance.days.friday)}
                  className={attendance.days.friday ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  {getTranslation("friday", language)}
                </Button>
                <Button
                  variant={attendance.days.saturday ? "default" : "outline"}
                  onClick={() => handleAttendanceChange("saturday", !attendance.days.saturday)}
                  className={attendance.days.saturday ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  {getTranslation("saturday", language)}
                </Button>
                <Button
                  variant={attendance.days.sunday ? "default" : "outline"}
                  onClick={() => handleAttendanceChange("sunday", !attendance.days.sunday)}
                  className={attendance.days.sunday ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  {getTranslation("sunday", language)}
                </Button>
              </div>
            </div>
          </div>

          {/* Comments / Special Considerations */}
          <div className="grid gap-2">
            <h3 className="text-lg font-medium">{getTranslation("special_considerations", language)}</h3>
            <Textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder={getTranslation("enter_special_considerations", language)}
              rows={3}
            />
            <Button onClick={handleUpdateComments} variant="outline">
              {getTranslation("save_comments", language)}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
