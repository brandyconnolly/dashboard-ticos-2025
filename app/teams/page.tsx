"use client"

import { useState, useEffect } from "react"
import { AlertTriangle, Edit, Plus, X, Loader2, Save } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import DataStatus from "@/components/data-status"
import { getParticipantsFromStorage, saveParticipantsToStorage } from "@/lib/storage-utils"
import type { Participant, Role } from "@/lib/types"

// Volunteer type definition
interface Volunteer {
  id: string
  name: string
  roles: string[]
  colorTeam?: string
  isSaving?: boolean
}

// Color team type definition
interface ColorTeam {
  id: string
  name: { en: string; fr: string }
  color: string
}

export default function TeamsPage() {
  const [language, setLanguage] = useState<"en" | "fr">("en")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [volunteers, setVolunteers] = useState<Volunteer[]>([])
  const [activeTab, setActiveTab] = useState<"functional" | "color">("functional")
  const [editingTeams, setEditingTeams] = useState(false)
  const [selectedVolunteer, setSelectedVolunteer] = useState<string | null>(null)
  const [editingRoles, setEditingRoles] = useState(false)
  const [isSavingToSheets, setIsSavingToSheets] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Team definitions
  const [functionalTeams, setFunctionalTeams] = useState([
    "Setup Crew",
    "Cleanup Crew",
    "Food Committee",
    "Transportation Team",
    "Activities Team",
    "Prayer Team",
    "Worship Team",
  ])

  const [colorTeamsList, setColorTeamsList] = useState<ColorTeam[]>([
    { id: "red", name: { en: "Red Team", fr: "Équipe Rouge" }, color: "bg-red-500" },
    { id: "blue", name: { en: "Blue Team", fr: "Équipe Bleue" }, color: "bg-blue-500" },
    { id: "green", name: { en: "Green Team", fr: "Équipe Verte" }, color: "bg-green-500" },
    { id: "yellow", name: { en: "Yellow Team", fr: "Équipe Jaune" }, color: "bg-yellow-500" },
    { id: "purple", name: { en: "Purple Team", fr: "Équipe Violette" }, color: "bg-purple-500" },
    { id: "orange", name: { en: "Orange Team", fr: "Équipe Orange" }, color: "bg-orange-500" },
  ])

  const [newTeamName, setNewTeamName] = useState("")
  const [newColorTeam, setNewColorTeam] = useState<ColorTeam>({
    id: "",
    name: { en: "", fr: "" },
    color: "bg-gray-500",
  })

  // Role mapping
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

  // Load data on component mount
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true)

        // Get participants from storage
        const storedParticipants = getParticipantsFromStorage()

        if (!storedParticipants) {
          setVolunteers([])
          setIsLoading(false)
          return
        }

        // Transform participants into volunteers
        const transformedVolunteers: Volunteer[] = storedParticipants
          .filter((p: Participant) => p.ageGroup === "adult" || p.ageGroup === "student-15+")
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

        setVolunteers(transformedVolunteers)
        setHasUnsavedChanges(false)
      } catch (err) {
        console.error("Error loading data:", err)
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  // Helper function to toggle a role for a volunteer
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

      // Set unsaved changes flag
      setHasUnsavedChanges(true)
    } catch (error) {
      console.error("Error toggling role:", error)

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

      // Set unsaved changes flag
      setHasUnsavedChanges(true)
    } catch (error) {
      console.error("Error saving color team assignment:", error)

      // Update the volunteer state to remove saving indicator
      setVolunteers((prevVolunteers) =>
        prevVolunteers.map((volunteer) =>
          volunteer.id === volunteerId ? { ...volunteer, isSaving: false } : volunteer,
        ),
      )
    }
  }

  // Helper functions for team management
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

  // Helper functions to get volunteers for specific teams
  const getTeamVolunteers = (team: string) => {
    return volunteers.filter((volunteer) => volunteer.roles.includes(team))
  }

  const getUnassignedVolunteers = () => {
    return volunteers.filter((volunteer) => volunteer.roles.length === 0)
  }

  const getColorTeamVolunteers = (teamId: string) => {
    return volunteers.filter((volunteer) => volunteer.colorTeam === teamId)
  }

  const getUnassignedColorTeamVolunteers = () => {
    return volunteers.filter((volunteer) => !volunteer.colorTeam)
  }

  // Get the selected volunteer safely
  const selectedVolunteerData = selectedVolunteer ? volunteers.find((v) => v.id === selectedVolunteer) : null

  // Function to save all changes to Google Sheets
  const saveChangesToGoogleSheets = async () => {
    setIsSavingToSheets(true)

    try {
      // Get all participants from localStorage
      const storedParticipants = getParticipantsFromStorage()
      if (!storedParticipants) {
        throw new Error("No participants found in localStorage")
      }

      // Filter to only get volunteers (adults and students)
      const volunteersToUpdate = storedParticipants.filter(
        (p) => p.ageGroup === "adult" || p.ageGroup === "student-15+",
      )

      // Create a counter for successful updates
      let successCount = 0

      // Update each volunteer one by one
      for (const participant of volunteersToUpdate) {
        try {
          const response = await fetch("/api/update-participant", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(participant),
          })

          if (response.ok) {
            successCount++
          } else {
            console.error(`Failed to update participant ${participant.id}: ${response.statusText}`)
          }
        } catch (error) {
          console.error(`Error updating participant ${participant.id}:`, error)
        }
      }

      // Show success message
      toast({
        title: language === "en" ? "Changes Saved" : "Modifications Enregistrées",
        description:
          language === "en"
            ? `Successfully updated ${successCount} of ${volunteersToUpdate.length} volunteers in Google Sheets.`
            : `Mise à jour réussie de ${successCount} sur ${volunteersToUpdate.length} volontaires dans Google Sheets.`,
      })

      // Reset unsaved changes flag
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error("Error saving changes to Google Sheets:", error)

      // Show error message
      toast({
        variant: "destructive",
        title: language === "en" ? "Error Saving Changes" : "Erreur lors de l'enregistrement",
        description:
          language === "en"
            ? "Failed to save changes to Google Sheets. Please try again."
            : "Échec de l'enregistrement des modifications dans Google Sheets. Veuillez réessayer.",
      })
    } finally {
      setIsSavingToSheets(false)
    }
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

          {/* Move TabsContent inside the Tabs component */}
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
        </Tabs>

        <div className="flex flex-col gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditingTeams(true)}>
            <Edit className="h-4 w-4 mr-2" />
            {language === "en" ? "Edit Teams" : "Modifier les équipes"}
          </Button>

          <Button
            size="sm"
            onClick={saveChangesToGoogleSheets}
            disabled={isSavingToSheets || !hasUnsavedChanges}
            className={hasUnsavedChanges ? "bg-green-600 hover:bg-green-700" : ""}
          >
            {isSavingToSheets ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {language === "en" ? "Saving..." : "Enregistrement..."}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {language === "en" ? "Save to Sheets" : "Enregistrer"}
              </>
            )}
          </Button>
        </div>
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
                      <SelectItem value="bg-orange-500">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                          <span>Orange</span>
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
