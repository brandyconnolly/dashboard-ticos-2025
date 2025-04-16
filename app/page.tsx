"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertTriangle, Search, Users, User2, Calendar } from "lucide-react"
import Link from "next/link"
import DataStatus from "@/components/data-status"
import { parseParticipants, parseFamilies } from "@/lib/fetch-data"
import type { Family, Participant } from "@/lib/types"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { useLanguage } from "@/hooks/use-language"
import { getTranslation } from "@/lib/translations"
import ParticipantProfileModal from "@/components/participant-profile-modal"

// Import the storage utility functions
import {
  saveParticipantsToStorage,
  saveFamiliesToStorage,
  getParticipantsFromStorage,
  getFamiliesFromStorage,
} from "@/lib/storage-utils"

export default function ParticipantsPage() {
  const { language } = useLanguage()
  const [participants, setParticipants] = useState<Participant[]>([])
  const [families, setFamilies] = useState<Family[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useLocalStorage<"all" | "adults" | "students" | "children" | "infants">(
    "participants-active-tab",
    "all",
  )
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)

  // Fetch data directly in the component
  // Update the useEffect hook that fetches data to first check localStorage
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)

        // First, try to get data from localStorage
        const storedParticipants = getParticipantsFromStorage()
        const storedFamilies = getFamiliesFromStorage()

        if (storedParticipants && storedFamilies) {
          console.log("Loading data from localStorage")
          setParticipants(storedParticipants)
          setFamilies(storedFamilies)
          setIsLoading(false)
          return
        }

        // If no stored data, fetch from API
        console.log("Fetching data from API")
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

        // Save to localStorage
        saveParticipantsToStorage(parsedParticipants)
        saveFamiliesToStorage(parsedFamilies)

        // Update state
        setParticipants(parsedParticipants)
        setFamilies(parsedFamilies)
        setIsLoading(false)
      } catch (err) {
        console.error("Error fetching data:", err)
        setError(err instanceof Error ? err.message : String(err))
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  // Extract last name for sorting
  const getLastName = (name: string) => {
    const parts = name.split(" ")
    return parts.length > 1 ? parts[parts.length - 1] : name
  }

  // Filter participants based on search term and active tab
  const filteredParticipants = participants
    .filter((participant) => {
      // Filter by search term
      const matchesSearch =
        searchTerm === "" ||
        participant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (participant.email && participant.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (participant.phone && participant.phone.toLowerCase().includes(searchTerm.toLowerCase()))

      // Filter by age group tab
      let matchesTab = true
      if (activeTab !== "all") {
        switch (activeTab) {
          case "adults":
            matchesTab = participant.ageGroup === "adult"
            break
          case "students":
            matchesTab = participant.ageGroup === "student-15+"
            break
          case "children":
            matchesTab = participant.ageGroup === "child-8-14" || participant.ageGroup === "child-2-7"
            break
          case "infants":
            matchesTab = participant.ageGroup === "infant-0-2"
            break
        }
      }

      return matchesSearch && matchesTab
    })
    // Sort by family name or last name
    .sort((a, b) => {
      const familyA = families.find((f) => f.id === a.familyId)?.name || getLastName(a.name)
      const familyB = families.find((f) => f.id === b.familyId)?.name || getLastName(b.name)
      return familyA.localeCompare(familyB)
    })

  // Count participants by age group
  const adultCount = participants.filter((p) => p.ageGroup === "adult").length
  const studentCount = participants.filter((p) => p.ageGroup === "student-15+").length
  const childrenCount =
    participants.filter((p) => p.ageGroup === "child-8-14").length +
    participants.filter((p) => p.ageGroup === "child-2-7").length
  const infantCount = participants.filter((p) => p.ageGroup === "infant-0-2").length

  // Get family name for a participant
  const getFamilyName = (familyId: number) => {
    const family = families.find((f) => f.id === familyId)
    return family ? family.name : ""
  }

  // Get family object for a participant
  const getFamily = (familyId: number) => {
    return families.find((f) => f.id === familyId) || null
  }

  // Handle participant update
  // Update the handleParticipantUpdate function to save changes to localStorage
  const handleParticipantUpdate = (updatedParticipant: Participant) => {
    setParticipants((prevParticipants) => {
      const newParticipants = prevParticipants.map((p) => (p.id === updatedParticipant.id ? updatedParticipant : p))

      // Save to localStorage
      saveParticipantsToStorage(newParticipants)

      return newParticipants
    })

    setSelectedParticipant(updatedParticipant)

    // TODO: Update Excel sheet via API
    console.log("Updated participant:", updatedParticipant)
  }

  // Open participant profile
  const openParticipantProfile = (participant: Participant) => {
    setSelectedParticipant(participant)
    setIsProfileModalOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-lg">{getTranslation("loading_data", language)}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">{getTranslation("participants", language)}</h1>
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6 flex items-start">
          <AlertTriangle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
          <div>
            <p className="text-red-700 font-medium">{getTranslation("error_loading_data", language)}</p>
            <p className="text-red-600">{error}</p>
            <Link href="/settings" className="text-blue-600 underline mt-2 inline-block">
              {getTranslation("go_to_settings", language)}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">
        {getTranslation("participants", language)} ({participants.length})
      </h1>

      <DataStatus />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
        <Card className={activeTab === "all" ? "border-2 border-primary" : ""}>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium">{getTranslation("all", language)}</h3>
                <p className="text-3xl font-bold">{participants.length}</p>
              </div>
              <Users className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card className={activeTab === "adults" ? "border-2 border-primary" : ""}>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium">{getTranslation("adults", language)}</h3>
                <p className="text-3xl font-bold">{adultCount}</p>
              </div>
              <User2 className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card className={activeTab === "students" ? "border-2 border-primary" : ""}>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium">{getTranslation("students_15plus", language)}</h3>
                <p className="text-3xl font-bold">{studentCount}</p>
              </div>
              <User2 className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card className={activeTab === "children" ? "border-2 border-primary" : ""}>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium">{getTranslation("children", language)}</h3>
                <p className="text-3xl font-bold">{childrenCount}</p>
              </div>
              <User2 className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "all" | "adults" | "students" | "children" | "infants")}
          className="w-full md:w-auto"
        >
          <TabsList>
            <TabsTrigger value="all">{getTranslation("all", language)}</TabsTrigger>
            <TabsTrigger value="adults">{getTranslation("adults", language)}</TabsTrigger>
            <TabsTrigger value="students">{getTranslation("students", language)}</TabsTrigger>
            <TabsTrigger value="children">{getTranslation("children", language)}</TabsTrigger>
            <TabsTrigger value="infants">{getTranslation("infants", language)}</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder={getTranslation("search_participants", language)}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 text-lg py-6"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden responsive-table-container">
        <table className="w-full text-sm md:text-lg responsive-table">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left font-medium text-gray-500">{getTranslation("name", language)}</th>
              <th className="px-6 py-4 text-left font-medium text-gray-500">{getTranslation("family", language)}</th>
              <th className="px-6 py-4 text-left font-medium text-gray-500">{getTranslation("age_group", language)}</th>
              <th className="px-6 py-4 text-left font-medium text-gray-500">{getTranslation("roles", language)}</th>
              <th className="px-6 py-4 text-center font-medium text-gray-500">
                {getTranslation("attendance", language)}
              </th>
              <th className="px-6 py-4 text-center font-medium text-gray-500">{getTranslation("status", language)}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredParticipants.map((participant) => {
              const attendance = participant.attendance || {
                fullAttendance: true,
                days: { friday: true, saturday: true, sunday: true },
              }
              return (
                <tr
                  key={participant.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => openParticipantProfile(participant)}
                >
                  <td className="px-6 py-4 font-medium">
                    {participant.name}
                    {participant.isPrimaryContact && (
                      <Badge className="ml-2 bg-purple-100 text-purple-800">
                        {getTranslation("primary_short", language)}
                      </Badge>
                    )}
                  </td>
                  <td className="px-6 py-4">{getFamilyName(participant.familyId)}</td>
                  <td className="px-6 py-4">{getTranslation(participant.ageGroup, language)}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {participant.roles.map((role) => (
                        <Badge key={role} variant="outline" className="text-xs">
                          {getTranslation(role, language)}
                          {role === "custom" && participant.customRole ? `: ${participant.customRole}` : ""}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {attendance.fullAttendance ? (
                      <Badge className="bg-green-100 text-green-800">
                        <Calendar className="mr-1 h-3 w-3" />
                        {getTranslation("full_attendance", language)}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-500">
                        <Calendar className="mr-1 h-3 w-3" />
                        {getTranslation("partial_attendance", language)}
                      </Badge>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {participant.checkedIn ? (
                      <Badge className="bg-green-100 text-green-800">{getTranslation("checked_in", language)}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-500">
                        {getTranslation("not_checked_in", language)}
                      </Badge>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Participant Profile Modal */}
      <ParticipantProfileModal
        participant={selectedParticipant}
        family={selectedParticipant ? getFamily(selectedParticipant.familyId) : null}
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onUpdate={handleParticipantUpdate}
        allParticipants={participants}
      />
    </div>
  )
}
