"use client"

import { useState, useEffect } from "react"
import DataStatus from "@/components/data-status"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Check, X, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { parseParticipants, parseFamilies } from "@/lib/fetch-data"

// Import the storage utility functions
import { saveParticipantsToStorage, getParticipantsFromStorage } from "@/lib/storage-utils"

// Define a type for our family group with check-in status
interface FamilyGroup {
  id: number
  family: string
  members: {
    id: string
    name: string
    checkedIn: boolean
  }[]
}

export default function CheckinPage() {
  const [language, setLanguage] = useState<"en" | "fr">("en")
  const [attendees, setAttendees] = useState<FamilyGroup[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedFamilies, setExpandedFamilies] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalAttendees, setTotalAttendees] = useState(0)
  const [checkedInCount, setCheckedInCount] = useState(0)

  // Fetch data directly in the component
  useEffect(() => {
    async function fetchData() {
      try {
        console.log("Fetching data for check-in page")
        const response = await fetch("/api/update-data")

        if (!response.ok) {
          throw new Error(`API returned status: ${response.status}`)
        }

        const result = await response.json()

        if (!result.data || !Array.isArray(result.data)) {
          throw new Error("Invalid data format received from API")
        }

        console.log("Raw data received:", result.data.length, "rows")

        // Parse the data
        const parsedParticipants = parseParticipants(result.data)
        const parsedFamilies = parseFamilies(result.data)

        console.log("Parsed participants:", parsedParticipants.length)
        console.log("Parsed families:", parsedFamilies.length)

        // Transform data into the format needed for check-in
        const familyGroups: FamilyGroup[] = parsedFamilies.map((family) => {
          const familyMembers = parsedParticipants.filter((p) => p.familyId === family.id)

          return {
            id: family.id,
            family: family.name,
            members: familyMembers.map((member) => ({
              id: member.id,
              name: member.name,
              checkedIn: member.checkedIn || false,
            })),
          }
        })

        console.log("Transformed into family groups:", familyGroups.length)

        // Calculate totals
        const total = familyGroups.reduce((sum, family) => sum + family.members.length, 0)
        const checkedIn = familyGroups.reduce(
          (sum, family) => sum + family.members.filter((member) => member.checkedIn).length,
          0,
        )

        setTotalAttendees(total)
        setCheckedInCount(checkedIn)
        setAttendees(familyGroups)
        setIsLoading(false)
      } catch (err) {
        console.error("Error fetching data:", err)
        setError(err instanceof Error ? err.message : String(err))
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const toggleFamilyExpanded = (familyId: number) => {
    if (expandedFamilies.includes(familyId)) {
      setExpandedFamilies(expandedFamilies.filter((id) => id !== familyId))
    } else {
      setExpandedFamilies([...expandedFamilies, familyId])
    }
  }

  // Update the handleCheckIn function to save changes to localStorage and Google Sheets
  const handleCheckIn = async (familyId: number, memberId: string) => {
    // Find the participant to update
    const family = attendees.find((f) => f.id === familyId)
    const member = family?.members.find((m) => m.id === memberId)

    if (!member) return

    // Toggle the checked-in status
    const newCheckedInStatus = !member.checkedIn

    setAttendees(
      attendees.map((family) =>
        family.id === familyId
          ? {
              ...family,
              members: family.members.map((member) =>
                member.id === memberId ? { ...member, checkedIn: newCheckedInStatus } : member,
              ),
            }
          : family,
      ),
    )

    // Update the checked-in count
    const updatedAttendees = attendees.map((family) =>
      family.id === familyId
        ? {
            ...family,
            members: family.members.map((member) =>
              member.id === memberId ? { ...member, checkedIn: newCheckedInStatus } : member,
            ),
          }
        : family,
    )

    const newCheckedInCount = updatedAttendees.reduce(
      (sum, family) => sum + family.members.filter((member) => member.checkedIn).length,
      0,
    )

    setCheckedInCount(newCheckedInCount)

    // Update the participant's checkedIn status in localStorage
    const storedParticipants = getParticipantsFromStorage()
    if (storedParticipants) {
      const updatedParticipants = storedParticipants.map((participant) => {
        if (participant.id === memberId) {
          return {
            ...participant,
            checkedIn: newCheckedInStatus,
          }
        }
        return participant
      })

      // Save the updated participants to localStorage
      saveParticipantsToStorage(updatedParticipants)

      // Update Google Sheet via API
      try {
        const participantToUpdate = updatedParticipants.find((p) => p.id === memberId)
        if (participantToUpdate) {
          const response = await fetch("/api/update-participant", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(participantToUpdate),
          })

          if (!response.ok) {
            const errorData = await response.json()
            console.error("Error updating participant in Google Sheet:", errorData)
          } else {
            console.log("Participant check-in status updated successfully in Google Sheet")
          }
        }
      } catch (error) {
        console.error("Error calling update-participant API:", error)
      }
    }
  }

  // Update the handleCheckInAll function to save changes to localStorage and Google Sheets
  const handleCheckInAll = async (familyId: number, checkIn: boolean) => {
    setAttendees(
      attendees.map((family) =>
        family.id === familyId
          ? {
              ...family,
              members: family.members.map((member) => ({ ...member, checkedIn: checkIn })),
            }
          : family,
      ),
    )

    // Update the checked-in count
    const updatedAttendees = attendees.map((family) =>
      family.id === familyId
        ? {
            ...family,
            members: family.members.map((member) => ({ ...member, checkedIn: checkIn })),
          }
        : family,
    )

    const newCheckedInCount = updatedAttendees.reduce(
      (sum, family) => sum + family.members.filter((member) => member.checkedIn).length,
      0,
    )

    setCheckedInCount(newCheckedInCount)

    // Update the participants' checkedIn status in localStorage
    const storedParticipants = getParticipantsFromStorage()
    if (storedParticipants) {
      const family = attendees.find((f) => f.id === familyId)
      if (!family) return

      const memberIds = family.members.map((m) => m.id)

      const updatedParticipants = storedParticipants.map((participant) => {
        // Check if this participant is in the family we're updating
        if (memberIds.includes(participant.id)) {
          return {
            ...participant,
            checkedIn: checkIn,
          }
        }
        return participant
      })

      // Save the updated participants to localStorage
      saveParticipantsToStorage(updatedParticipants)

      // Update Google Sheet via API for each family member
      try {
        const participantsToUpdate = updatedParticipants.filter((p) => memberIds.includes(p.id))

        // Update each participant one by one
        for (const participant of participantsToUpdate) {
          const response = await fetch("/api/update-participant", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(participant),
          })

          if (!response.ok) {
            const errorData = await response.json()
            console.error("Error updating participant in Google Sheet:", errorData)
          }
        }

        console.log(`${participantsToUpdate.length} participants' check-in status updated successfully in Google Sheet`)
      } catch (error) {
        console.error("Error calling update-participant API:", error)
      }
    }
  }

  const filteredAttendees = attendees.filter(
    (family) =>
      family.family.toLowerCase().includes(searchTerm.toLowerCase()) ||
      family.members.some((member) => member.name.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-lg">{language === "en" ? "Loading data..." : "Chargement des données..."}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">{language === "en" ? "Check-in" : "Enregistrement"}</h1>
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6 flex items-start">
          <AlertTriangle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
          <div>
            <p className="text-red-700 font-medium">Error loading data</p>
            <p className="text-red-600">{error}</p>
            <Link href="/api-test" className="text-blue-600 underline mt-2 inline-block">
              Go to API Test page to diagnose
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">{language === "en" ? "Check-in" : "Enregistrement"}</h1>

      <DataStatus language={language} />

      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="text-center md:text-left mb-4 md:mb-0">
            <h2 className="text-2xl font-bold">{language === "en" ? "Attendance Status" : "Statut de présence"}</h2>
            <p className="text-3xl font-bold">
              <span className={checkedInCount === totalAttendees ? "text-green-600" : ""}>{checkedInCount}</span> /{" "}
              {totalAttendees}
              <span className="text-lg ml-2 font-normal">{language === "en" ? "checked in" : "enregistrés"}</span>
            </p>
          </div>

          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder={language === "en" ? "Search attendees..." : "Rechercher des participants..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-lg py-6"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredAttendees.length > 0 ? (
          filteredAttendees.map((family) => {
            const isExpanded = expandedFamilies.includes(family.id)
            const allCheckedIn = family.members.every((member) => member.checkedIn)
            const someCheckedIn = family.members.some((member) => member.checkedIn)

            return (
              <div key={family.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div
                  className={`p-4 flex justify-between items-center cursor-pointer ${
                    allCheckedIn ? "bg-green-50" : someCheckedIn ? "bg-yellow-50" : ""
                  }`}
                  onClick={() => toggleFamilyExpanded(family.id)}
                >
                  <div className="flex items-center">
                    <div className="mr-3">
                      {allCheckedIn ? (
                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                          <Check className="h-5 w-5 text-green-600" />
                        </div>
                      ) : someCheckedIn ? (
                        <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
                          <span className="text-yellow-600 font-bold">!</span>
                        </div>
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <X className="h-5 w-5 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">{family.family}</h3>
                      <p className="text-sm text-gray-500">
                        {family.members.length} {language === "en" ? "members" : "membres"} •{" "}
                        {family.members.filter((m) => m.checkedIn).length}{" "}
                        {language === "en" ? "checked in" : "enregistrés"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="mr-2 text-lg"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCheckInAll(family.id, !allCheckedIn)
                      }}
                    >
                      {allCheckedIn
                        ? language === "en"
                          ? "Uncheck All"
                          : "Tout décocher"
                        : language === "en"
                          ? "Check In All"
                          : "Tout cocher"}
                    </Button>
                    <div className="h-6 w-6 flex items-center justify-center">
                      <svg
                        className={`h-5 w-5 transform transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t">
                    {family.members.map((member) => (
                      <div
                        key={member.id}
                        className={`p-4 flex justify-between items-center border-b last:border-b-0 ${
                          member.checkedIn ? "bg-green-50" : ""
                        }`}
                      >
                        <span className="text-lg">{member.name}</span>
                        <Button
                          variant={member.checkedIn ? "default" : "outline"}
                          size="sm"
                          className="text-lg"
                          onClick={() => handleCheckIn(family.id, member.id)}
                        >
                          {member.checkedIn
                            ? language === "en"
                              ? "Checked In ✓"
                              : "Enregistré ✓"
                            : language === "en"
                              ? "Check In"
                              : "Enregistrer"}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        ) : (
          <div className="text-center p-8 bg-gray-50 rounded-lg">
            <p className="text-lg text-gray-500">
              {language === "en" ? "No attendees found" : "Aucun participant trouvé"}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
