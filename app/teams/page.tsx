"use client"

import { useState, useEffect } from "react"
import DataStatus from "@/components/data-status"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Plus, Edit, AlertTriangle, Loader2, X } from "lucide-react"
import Link from "next/link"
import { parseParticipants, parseFamilies } from "@/lib/fetch-data"
import type { Participant, Role } from "@/lib/types"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Import the storage utility functions
import { saveParticipantsToStorage, getParticipantsFromStorage } from "@/lib/storage-utils"
import { saveFamiliesToStorage } from "@/lib/storage-utils"

// Volunteer type definition
interface Volunteer {
  id: string
  name: string
  roles: string[]
  colorTeam?: string
  isSaving?: boolean
}

export default function TeamsPage() {
  const [language, setLanguage] = useState<"en" | "fr">("en")
  const [volunteers, setVolunteers] = useState<Volunteer[]>([])
  const [activeTab, setActiveTab] = useState<"functional" | "color">("functional")
  const [editingTeams, setEditingTeams] = useState(false)
  const [functionalTeams, setFunctionalTeams] = useState([
    "Setup Crew",
    "Cleanup Crew",
    "Food Committee",
    "Transportation Team",
    "Activities Team",
    "Prayer Team",
    "Worship Team",
  ])
  const [newTeamName, setNewTeamName] = useState("")
  const [colorTeamsList, setColorTeamsList] = useState([
    { id: "red", name: { en: "Red Team", fr: "Équipe Rouge" }, color: "bg-red-500" },
    { id: "blue", name: { en: "Blue Team", fr: "Équipe Bleue" }, color: "bg-blue-500" },
    { id: "green", name: { en: "Green Team", fr: "Équipe Verte" }, color: "bg-green-500" },
    { id: "yellow", name: { en: "Yellow Team", fr: "Équipe Jaune" }, color: "bg-yellow-500" },
    { id: "purple", name: { en: "Purple Team", fr: "Équipe Violette" }, color: "bg-purple-500" },
    { id: "orange", name: { en: "Orange Team", fr: "Équipe Orange" }, color: "bg-orange-500" },
  ])
  const [newColorTeam, setNewColorTeam] = useState({ id: "", name: { en: "", fr: "" }, color: "bg-gray-500" })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedVolunteer, setSelectedVolunteer] = useState<string | null>(null)
  const [editingRoles, setEditingRoles] = useState(false)

  // Standardized role mapping
  const roleToTeamMap: Record<string, string> = {
    "setup-crew": "Setup Crew",
    "cleanup-crew": "Cleanup Crew",
    "food-crew": "Food Committee",
    transportation: "Transportation Team",
    "activities-coordinator": "Activities Team",
    "prayer-team": "Prayer Team",
    "worship-team": "Worship Team",
  }

  const teamToRoleMap: Record<string, string> = {
    "Setup Crew": "setup-crew",
    "Cleanup Crew": "cleanup-crew",
    "Food Committee": "food-crew",
    "Transportation Team": "transportation",
    "Activities Team": "activities-coordinator",
    "Prayer Team": "prayer-team",
    "Worship Team": "worship-team",
  }

  // Function to fetch data
  const fetchData = async () => {
    try {
      console.log("Fetching data for teams page")
      setIsLoading(true)

      // First try to get data from localStorage
      const storedParticipants = getParticipantsFromStorage()

      let parsedParticipants
      if (storedParticipants) {
        console.log("Using data from localStorage")
        parsedParticipants = storedParticipants
      } else {
        // If not in localStorage, fetch from API
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
        parsedParticipants = parseParticipants(result.data)
        const parsedFamilies = parseFamilies(result.data)

        // Save to localStorage
        saveParticipantsToStorage(parsedParticipants)
        saveFamiliesToStorage(parsedFamilies)
      }

      console.log("Parsed participants:", parsedParticipants.length)

      // Transform participants into volunteers with standardized role mapping
      const transformedVolunteers: Volunteer[] = parsedParticipants
        .filter((p: Participant) => p.ageGroup === "adult" || p.ageGroup === "student-15+") // Only adults and teens can be volunteers
        .map((participant: Participant) => {
          // Extract roles using the standardized role mapping
          const roles: string[] = []

          // Map each role to its team name
          for (const role of participant.roles) {
            if (roleToTeamMap[role]) {
              roles.push(roleToTeamMap[role])
            }
          }

          return {
            id: participant.id,
            name: participant.name,
            roles: roles,
            colorTeam: participant.colorTeam,
          }
        })

      console.log("Transformed volunteers:", transformedVolunteers.length)
      setVolunteers(transformedVolunteers)
      setIsLoading(false)
    } catch (err) {
      console.error("Error fetching data:", err)
      setError(err instanceof Error ? err.message : String(err))
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Function to toggle a role for a volunteer
  const toggleRole = async (volunteerId: string, team: string) => {
    // Find the volunteer
    const volunteer = volunteers.find((v) => v.id === volunteerId)
    if (!volunteer) return

    // Mark this volunteer as saving
    setVolunteers((prevVolunteers) => prevVolunteers.map((v) => (v.id === volunteerId ? { ...v, isSaving: true } : v)))

    try {
      // Get the participant from localStorage
      const storedParticipants = getParticipantsFromStorage()
      if (!storedParticipants) {
        throw new Error("No participants found in localStorage")
      }

      const participant = storedParticipants.find((p) => p.id === volunteerId)
      if (!participant) {
        throw new Error(`Participant with ID ${volunteerId} not found`)
      }

      // Get the role ID for this team
      const roleId = teamToRoleMap[team]
      if (!roleId) {
        throw new Error(`No role mapping found for team: ${team}`)
      }

      // Check if the volunteer already has this role
      const hasRole = volunteer.roles.includes(team)
      let updatedRoles: Role[]

      if (hasRole) {
        // Remove the role
        updatedRoles = participant.roles.filter((r) => r !== roleId) as Role[]
      } else {
        // Add the role
        updatedRoles = [...participant.roles, roleId as Role]
      }

      const updatedParticipant = {
        ...participant,
        roles: updatedRoles,
      }

      // Update localStorage
      const updatedParticipants = storedParticipants.map((p) => (p.id === volunteerId ? updatedParticipant : p))
      saveParticipantsToStorage(updatedParticipants)

      // Update Google Sheet via API
      const response = await fetch("/api/update-participant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedParticipant),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`Failed to update participant in Google Sheet: ${errorData.error || response.statusText}`)
      }

      // Update the volunteer in the UI
      setVolunteers((prevVolunteers) =>
        prevVolunteers.map((v) => {
          if (v.id === volunteerId) {
            const updatedRoles = hasRole ? v.roles.filter((r) => r !== team) : [...v.roles, team]
            return { ...v, roles: updatedRoles, isSaving: false }
          }
          return v
        }),
      )
    } catch (error) {
      console.error("Error toggling role:", error)

      // Show error to user
      alert(
        language === "en"
          ? `Failed to update team assignment: ${error instanceof Error ? error.message : String(error)}`
          : `Échec de l'enregistrement de l'équipe: ${error instanceof Error ? error.message : String(error)}`,
      )

      // Remove saving indicator
      setVolunteers((prevVolunteers) =>
        prevVolunteers.map((v) => (v.id === volunteerId ? { ...v, isSaving: false } : v)),
      )
    }
  }

  // Function to assign a color team
  const handleAssignColorTeam = async (volunteerId: string, colorTeam: string) => {
    // Mark this volunteer as saving
    setVolunteers((prevVolunteers) =>
      prevVolunteers.map((volunteer) =>
        volunteer.id === volunteerId
          ? {
              ...volunteer,
              colorTeam: colorTeam === "none" ? undefined : colorTeam,
              isSaving: true,
            }
          : volunteer,
      ),
    )

    try {
      // Get the participant from localStorage
      const storedParticipants = getParticipantsFromStorage()
      if (!storedParticipants) return

      const participant = storedParticipants.find((p) => p.id === volunteerId)
      if (!participant) return

      const updatedParticipant = {
        ...participant,
        colorTeam: colorTeam === "none" ? undefined : colorTeam,
      }

      // Update localStorage
      const updatedParticipants = storedParticipants.map((p) => (p.id === volunteerId ? updatedParticipant : p))
      saveParticipantsToStorage(updatedParticipants)

      // Update Google Sheet via API
      const response = await fetch("/api/update-participant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedParticipant),
      })

      if (!response.ok) {
        throw new Error("Failed to update participant in Google Sheet")
      }

      console.log("Color team assignment saved to Google Sheet successfully")

      // Update the volunteer state to remove saving indicator
      setVolunteers((prevVolunteers) =>
        prevVolunteers.map((volunteer) =>
          volunteer.id === volunteerId
            ? {
                ...volunteer,
                colorTeam: colorTeam === "none" ? undefined : colorTeam,
                isSaving: false,
              }
            : volunteer,
        ),
      )
    } catch (error) {
      console.error("Error saving color team assignment:", error)

      // Show error to user
      alert(
        language === "en"
          ? `Failed to update color team: ${error instanceof Error ? error.message : String(error)}`
          : `Échec de l'enregistrement de l'équipe de couleur: ${error instanceof Error ? error.message : String(error)}`,
      )

      // Update the volunteer state to remove saving indicator
      setVolunteers((prevVolunteers) =>
        prevVolunteers.map((volunteer) =>
          volunteer.id === volunteerId ? { ...volunteer, isSaving: false } : volunteer,
        ),
      )
    }
  }

  const addFunctionalTeam = () => {
    if (newTeamName.trim()) {
      setFunctionalTeams([...functionalTeams, newTeamName.trim()])
      setNewTeamName("")
    }
  }

  const addColorTeam = () => {
    if (newColorTeam.id.trim() && newColorTeam.name.en.trim() && newColorTeam.name.fr.trim()) {
      setColorTeamsList([...colorTeamsList, { ...newColorTeam }])
      setNewColorTeam({ id: "", name: { en: "", fr: "" }, color: "bg-gray-500" })
    }
  }

  // Helper function to get volunteers for a specific team
  const getTeamVolunteers = (team: string) => {
    return volunteers.filter((volunteer) => volunteer.roles.includes(team))
  }

  // Helper function to get unassigned volunteers (no functional teams)
  const getUnassignedVolunteers = () => {
    return volunteers.filter((volunteer) => volunteer.roles.length === 0)
  }

  // Helper function to get volunteers for a specific color team
  const getColorTeamVolunteers = (teamId: string) => {
    return volunteers.filter((volunteer) => volunteer.colorTeam === teamId)
  }

  // Helper function to get volunteers with no color team
  const getUnassignedColorTeamVolunteers = () => {
    return volunteers.filter((volunteer) => !volunteer.colorTeam)
  }

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
        <h1 className="text-3xl font-bold mb-6">{language === "en" ? "Team Assignments" : "Équipes"}</h1>
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

  // Get the selected volunteer safely
  const selectedVolunteerData = selectedVolunteer ? volunteers.find((v) => v.id === selectedVolunteer) : null

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">{language === "en" ? "Team Assignments" : "Équipes"}</h1>

      <DataStatus language={language} />

      <div className="flex justify-between items-center mb-6">
        <Tabs defaultValue="functional" onValueChange={(value) => setActiveTab(value as "functional" | "color")}>
          <TabsList>
            <TabsTrigger value="functional">
              {language === "en" ? "Functional Teams" : "Équipes Fonctionnelles"}
            </TabsTrigger>
            <TabsTrigger value="color">{language === "en" ? "Color Teams" : "Équipes de Couleur"}</TabsTrigger>
          </TabsList>
        </Tabs>

        <Button variant="outline" size="sm" onClick={() => setEditingTeams(true)}>
          <Edit className="h-4 w-4 mr-2" />
          {language === "en" ? "Edit Teams" : "Modifier les équipes"}
        </Button>
      </div>

      {/* Edit Teams Dialog */}
      <Dialog open={editingTeams} onOpenChange={setEditingTeams}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {activeTab === "functional"
                ? language === "en"
                  ? "Edit Functional Teams"
                  : "Modifier les équipes fonctionnelles"
                : language === "en"
                  ? "Edit Color Teams"
                  : "Modifier les équipes de couleur"}
            </DialogTitle>
          </DialogHeader>

          {activeTab === "functional" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                {functionalTeams.map((team, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span>{team}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFunctionalTeams(functionalTeams.filter((_, i) => i !== index))
                      }}
                    >
                      {language === "en" ? "Remove" : "Supprimer"}
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder={language === "en" ? "New team name" : "Nom de la nouvelle équipe"}
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                />
                <Button onClick={addFunctionalTeam}>
                  <Plus className="h-4 w-4 mr-2" />
                  {language === "en" ? "Add" : "Ajouter"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                {colorTeamsList.map((team, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full ${team.color}`}></div>
                      <span>{team.name[language]}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setColorTeamsList(colorTeamsList.filter((_, i) => i !== index))
                      }}
                    >
                      {language === "en" ? "Remove" : "Supprimer"}
                    </Button>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder={language === "en" ? "Team ID (e.g. pink)" : "ID d'équipe (ex. rose)"}
                    value={newColorTeam.id}
                    onChange={(e) =>
                      setNewColorTeam({ ...newColorTeam, id: e.target.value.toLowerCase().replace(/\s+/g, "-") })
                    }
                  />
                  <Select
                    value={newColorTeam.color}
                    onValueChange={(value) => setNewColorTeam({ ...newColorTeam, color: value })}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bg-red-500">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-red-500"></div>
                          <span>Red</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="bg-blue-500">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                          <span>Blue</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="bg-green-500">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-green-500"></div>
                          <span>Green</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="bg-yellow-500">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                          <span>Yellow</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="bg-purple-500">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-purple-500"></div>
                          <span>Purple</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="bg-pink-500">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-pink-500"></div>
                          <span>Pink</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="bg-orange-500">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                          <span>Orange</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="bg-gray-500">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-gray-500"></div>
                          <span>Gray</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  placeholder={language === "en" ? "English name" : "Nom en anglais"}
                  value={newColorTeam.name.en}
                  onChange={(e) =>
                    setNewColorTeam({ ...newColorTeam, name: { ...newColorTeam.name, en: e.target.value } })
                  }
                />
                <Input
                  placeholder={language === "en" ? "French name" : "Nom en français"}
                  value={newColorTeam.name.fr}
                  onChange={(e) =>
                    setNewColorTeam({ ...newColorTeam, name: { ...newColorTeam.name, fr: e.target.value } })
                  }
                />
                <Button onClick={addColorTeam} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  {language === "en" ? "Add Color Team" : "Ajouter une équipe de couleur"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <TabsContent value="functional" className="mt-6">
        <div className="grid grid-cols-1 gap-8">
          {/* Functional Teams */}
          {functionalTeams.map((team) => {
            const teamVolunteers = getTeamVolunteers(team)
            return (
              <div key={team} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b">
                  <h3 className="font-medium text-lg flex items-center justify-between">
                    <span>{team}</span>
                    <Badge variant="outline" className="ml-2">
                      {teamVolunteers.length} {language === "en" ? "members" : "membres"}
                    </Badge>
                  </h3>
                </div>
                <div className="p-4">
                  {teamVolunteers.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {teamVolunteers.map((volunteer) => (
                        <div key={volunteer.id} className="flex items-center justify-between p-2 border rounded-md">
                          <span className="truncate">{volunteer.name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRole(volunteer.id, team)}
                            disabled={volunteer.isSaving}
                          >
                            {volunteer.isSaving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4 text-red-500" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">
                      {language === "en" ? "No members assigned" : "Aucun membre assigné"}
                    </p>
                  )}
                </div>
              </div>
            )
          })}

          {/* Unassigned Section */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b">
              <h3 className="font-medium text-lg flex items-center justify-between">
                <span>{language === "en" ? "Unassigned" : "Non assignés"}</span>
                <Badge variant="outline" className="ml-2">
                  {getUnassignedVolunteers().length} {language === "en" ? "members" : "membres"}
                </Badge>
              </h3>
            </div>
            <div className="p-4">
              {getUnassignedVolunteers().length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {getUnassignedVolunteers().map((volunteer) => (
                    <div key={volunteer.id} className="flex items-center justify-between p-2 border rounded-md">
                      <span className="truncate">{volunteer.name}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedVolunteer(volunteer.id)
                          setEditingRoles(true)
                        }}
                      >
                        {language === "en" ? "Assign" : "Assigner"}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  {language === "en" ? "No unassigned members" : "Aucun membre non assigné"}
                </p>
              )}
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="color" className="mt-6">
        <div className="grid grid-cols-1 gap-8">
          {/* Color Teams */}
          {colorTeamsList.map((team) => {
            const teamVolunteers = getColorTeamVolunteers(team.id)
            return (
              <div key={team.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className={`px-6 py-4 border-b ${team.color} bg-opacity-20`}>
                  <h3 className="font-medium text-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full ${team.color}`}></div>
                      <span>{team.name[language]}</span>
                    </div>
                    <Badge variant="outline" className="ml-2">
                      {teamVolunteers.length} {language === "en" ? "members" : "membres"}
                    </Badge>
                  </h3>
                </div>
                <div className="p-4">
                  {teamVolunteers.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {teamVolunteers.map((volunteer) => (
                        <div key={volunteer.id} className="flex items-center justify-between p-2 border rounded-md">
                          <span className="truncate">{volunteer.name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAssignColorTeam(volunteer.id, "none")}
                            disabled={volunteer.isSaving}
                          >
                            {volunteer.isSaving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4 text-red-500" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">
                      {language === "en" ? "No members assigned" : "Aucun membre assigné"}
                    </p>
                  )}
                </div>
              </div>
            )
          })}

          {/* Unassigned Color Team Section */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b">
              <h3 className="font-medium text-lg flex items-center justify-between">
                <span>{language === "en" ? "Unassigned" : "Non assignés"}</span>
                <Badge variant="outline" className="ml-2">
                  {getUnassignedColorTeamVolunteers().length} {language === "en" ? "members" : "membres"}
                </Badge>
              </h3>
            </div>
            <div className="p-4">
              {getUnassignedColorTeamVolunteers().length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {getUnassignedColorTeamVolunteers().map((volunteer) => (
                    <div key={volunteer.id} className="flex items-center justify-between p-2 border rounded-md">
                      <span className="truncate">{volunteer.name}</span>
                      <Select
                        onValueChange={(value) => handleAssignColorTeam(volunteer.id, value)}
                        disabled={volunteer.isSaving}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder={language === "en" ? "Assign" : "Assigner"} />
                        </SelectTrigger>
                        <SelectContent>
                          {colorTeamsList.map((team) => (
                            <SelectItem key={team.id} value={team.id}>
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${team.color}`}></div>
                                <span>{team.name[language]}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  {language === "en" ? "No unassigned members" : "Aucun membre non assigné"}
                </p>
              )}
            </div>
          </div>
        </div>
      </TabsContent>

      {/* All Volunteers View */}
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">{language === "en" ? "All Volunteers" : "Tous les Volontaires"}</h2>
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <table className="w-full text-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left font-medium text-gray-500">{language === "en" ? "Name" : "Nom"}</th>
                <th className="px-6 py-4 text-left font-medium text-gray-500">
                  {language === "en" ? "Functional Teams" : "Équipes Fonctionnelles"}
                </th>
                <th className="px-6 py-4 text-left font-medium text-gray-500">
                  {language === "en" ? "Color Team" : "Équipe de Couleur"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {volunteers.map((volunteer) => {
                const currentColorTeam = colorTeamsList.find((t) => t.id === volunteer.colorTeam)
                return (
                  <tr key={volunteer.id}>
                    <td className="px-6 py-4">{volunteer.name}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {volunteer.roles.length > 0 ? (
                          volunteer.roles.map((role) => (
                            <Badge key={role} variant="outline" className="mr-1">
                              {role}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-gray-500">{language === "en" ? "None" : "Aucune"}</span>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedVolunteer(volunteer.id)
                            setEditingRoles(true)
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {currentColorTeam ? (
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full ${currentColorTeam.color}`}></div>
                          <span>{currentColorTeam.name[language]}</span>
                        </div>
                      ) : (
                        <span className="text-gray-500">{language === "en" ? "None" : "Aucune"}</span>
                      )}
                      <Select
                        value={volunteer.colorTeam || "none"}
                        onValueChange={(value) => handleAssignColorTeam(volunteer.id, value)}
                        disabled={volunteer.isSaving}
                      >
                        <SelectTrigger className="w-full mt-1">
                          <SelectValue>
                            {volunteer.isSaving ? (
                              <div className="flex items-center">
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                {language === "en" ? "Saving..." : "Enregistrement..."}
                              </div>
                            ) : language === "en" ? (
                              "Change"
                            ) : (
                              "Modifier"
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            {language === "en" ? "-- No Team --" : "-- Aucune équipe --"}
                          </SelectItem>
                          {colorTeamsList.map((team) => (
                            <SelectItem key={team.id} value={team.id}>
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${team.color}`}></div>
                                <span>{team.name[language]}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialog for editing roles */}
      <Dialog open={editingRoles} onOpenChange={setEditingRoles}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {language === "en" ? "Edit Teams for " : "Modifier les équipes pour "}
              {selectedVolunteerData?.name || ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {functionalTeams.map((team) => {
              const isAssigned = selectedVolunteerData?.roles.includes(team) || false

              return (
                <div key={team} className="flex items-center space-x-2">
                  <Checkbox
                    id={`edit-team-${team}`}
                    checked={isAssigned}
                    onCheckedChange={() => {
                      if (selectedVolunteer) {
                        toggleRole(selectedVolunteer, team)
                      }
                    }}
                    disabled={!selectedVolunteer}
                  />
                  <label
                    htmlFor={`edit-team-${team}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {team}
                  </label>
                </div>
              )
            })}
          </div>
          <Button onClick={() => setEditingRoles(false)} className="w-full mt-4">
            {language === "en" ? "Done" : "Terminé"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
