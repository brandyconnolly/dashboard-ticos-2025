"use client"

import { useState, useEffect } from "react"
import DataStatus from "@/components/data-status"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Plus, Edit, AlertTriangle, Loader2 } from "lucide-react"
import Link from "next/link"
import { parseParticipants, parseFamilies } from "@/lib/fetch-data"
import type { Participant } from "@/lib/types"

// Import the storage utility functions
import { saveParticipantsToStorage, getParticipantsFromStorage } from "@/lib/storage-utils"

// Volunteer type definition
interface Volunteer {
  id: string
  name: string
  preferences: string[]
  assigned: string
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

  // Fetch data directly in the component
  useEffect(() => {
    async function fetchData() {
      try {
        console.log("Fetching data for teams page")
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

        // Transform participants into volunteers
        const transformedVolunteers: Volunteer[] = parsedParticipants
          .filter((p) => p.ageGroup === "adult" || p.ageGroup === "student-15+") // Only adults and teens can be volunteers
          .map((participant: Participant) => {
            // Extract preferences from roles
            const preferences: string[] = []
            if (participant.roles.includes("setup-crew")) preferences.push("Setup Crew")
            if (participant.roles.includes("cleanup-crew")) preferences.push("Cleanup Crew")
            if (participant.roles.includes("food-crew")) preferences.push("Food Committee")
            if (participant.roles.includes("transportation")) preferences.push("Transportation Team")
            if (participant.roles.includes("activities-coordinator")) preferences.push("Activities Team")
            if (participant.roles.includes("prayer-team")) preferences.push("Prayer Team")
            if (participant.roles.includes("worship-team")) preferences.push("Worship Team")
            if (participant.customRole) preferences.push(participant.customRole)

            // Determine assigned team based on roles
            let assigned = "unassigned"
            if (participant.roles.includes("setup-crew")) assigned = "Setup Crew"
            else if (participant.roles.includes("cleanup-crew")) assigned = "Cleanup Crew"
            else if (participant.roles.includes("food-crew")) assigned = "Food Committee"
            else if (participant.roles.includes("transportation")) assigned = "Transportation Team"
            else if (participant.roles.includes("activities-coordinator")) assigned = "Activities Team"
            else if (participant.roles.includes("prayer-team")) assigned = "Prayer Team"
            else if (participant.roles.includes("worship-team")) assigned = "Worship Team"

            return {
              id: participant.id,
              name: participant.name,
              preferences: preferences,
              assigned: assigned,
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

    fetchData()
  }, [])

  // Update the handleAssignTeam function to save changes to both localStorage and Google Sheets
  const handleAssignTeam = async (volunteerId: string, team: string) => {
    // Mark this volunteer as saving
    setVolunteers(
      volunteers.map((volunteer) =>
        volunteer.id === volunteerId ? { ...volunteer, assigned: team, isSaving: true } : volunteer,
      ),
    )

    try {
      // Get the participant from localStorage
      const storedParticipants = getParticipantsFromStorage()
      if (!storedParticipants) return

      const participant = storedParticipants.find((p) => p.id === volunteerId)
      if (!participant) return

      // Update the participant's roles based on the team assignment
      let updatedRoles = [...participant.roles]

      // Remove any existing team roles
      updatedRoles = updatedRoles.filter(
        (role) =>
          ![
            "setup-crew",
            "cleanup-crew",
            "food-crew",
            "transportation",
            "activities-coordinator",
            "prayer-team",
            "worship-team",
          ].includes(role),
      )

      // Add the new team role if it's not "unassigned"
      if (team !== "unassigned") {
        // Map the team name to a role
        let roleToAdd: string | null = null
        switch (team) {
          case "Setup Crew":
            roleToAdd = "setup-crew"
            break
          case "Cleanup Crew":
            roleToAdd = "cleanup-crew"
            break
          case "Food Committee":
            roleToAdd = "food-crew"
            break
          case "Transportation Team":
            roleToAdd = "transportation"
            break
          case "Activities Team":
            roleToAdd = "activities-coordinator"
            break
          case "Prayer Team":
            roleToAdd = "prayer-team"
            break
          case "Worship Team":
            roleToAdd = "worship-team"
            break
        }

        if (roleToAdd) {
          updatedRoles.push(roleToAdd as any)
        }
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
        throw new Error("Failed to update participant in Google Sheet")
      }

      console.log("Team assignment saved to Google Sheet successfully")

      // Update the volunteer state to remove saving indicator
      setVolunteers(
        volunteers.map((volunteer) =>
          volunteer.id === volunteerId ? { ...volunteer, assigned: team, isSaving: false } : volunteer,
        ),
      )
    } catch (error) {
      console.error("Error saving team assignment:", error)

      // Update the volunteer state to remove saving indicator but keep the new assignment
      setVolunteers(
        volunteers.map((volunteer) =>
          volunteer.id === volunteerId ? { ...volunteer, assigned: team, isSaving: false } : volunteer,
        ),
      )
    }
  }

  // Update the handleAssignColorTeam function to save changes to both localStorage and Google Sheets
  const handleAssignColorTeam = async (volunteerId: string, colorTeam: string) => {
    // Mark this volunteer as saving
    setVolunteers(
      volunteers.map((volunteer) =>
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
      setVolunteers(
        volunteers.map((volunteer) =>
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

      // Update the volunteer state to remove saving indicator but keep the new assignment
      setVolunteers(
        volunteers.map((volunteer) =>
          volunteer.id === volunteerId
            ? {
                ...volunteer,
                colorTeam: colorTeam === "none" ? undefined : colorTeam,
                isSaving: false,
              }
            : volunteer,
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

  // Calculate team summary
  const teamSummary = functionalTeams.reduce(
    (acc, team) => {
      acc[team] = volunteers.filter((v) => v.assigned === team).length
      return acc
    },
    {} as Record<string, number>,
  )

  const unassignedCount = volunteers.filter((v) => v.assigned === "unassigned").length

  // Calculate color team summary
  const colorTeamSummary = colorTeamsList.reduce(
    (acc, team) => {
      acc[team.id] = volunteers.filter((v) => v.colorTeam === team.id).length
      return acc
    },
    {} as Record<string, number>,
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

      <Tabs defaultValue="functional" onValueChange={(value) => setActiveTab(value as "functional" | "color")}>
        <div className="flex justify-between items-center mb-6">
          <TabsList className="text-lg">
            <TabsTrigger value="functional" className="text-lg px-6 py-3">
              {language === "en" ? "Functional Teams" : "Équipes Fonctionnelles"}
            </TabsTrigger>
            <TabsTrigger value="color" className="text-lg px-6 py-3">
              {language === "en" ? "Color Teams" : "Équipes de Couleur"}
            </TabsTrigger>
          </TabsList>

          <Dialog open={editingTeams} onOpenChange={setEditingTeams}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                {language === "en" ? "Edit Teams" : "Modifier les équipes"}
              </Button>
            </DialogTrigger>
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
        </div>

        <TabsContent value="functional">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {functionalTeams.map((team) => (
              <div key={team} className="bg-white p-4 rounded-lg shadow-sm border">
                <h3 className="font-medium text-lg">{team}</h3>
                <p className="text-2xl font-bold">
                  {teamSummary[team] || 0} {language === "en" ? "people" : "personnes"}
                </p>
              </div>
            ))}
            <div className="bg-gray-100 p-4 rounded-lg shadow-sm border">
              <h3 className="font-medium text-lg">{language === "en" ? "Unassigned" : "Non assignés"}</h3>
              <p className="text-2xl font-bold">
                {unassignedCount} {language === "en" ? "people" : "personnes"}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <table className="w-full text-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left font-medium text-gray-500">
                    {language === "en" ? "Name" : "Nom"}
                  </th>
                  <th className="px-6 py-4 text-left font-medium text-gray-500">
                    {language === "en" ? "Assigned Team" : "Équipe Assignée"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {volunteers.map((volunteer) => (
                  <tr key={volunteer.id}>
                    <td className="px-6 py-4">{volunteer.name}</td>
                    <td className="px-6 py-4">
                      <Select
                        value={volunteer.assigned}
                        onValueChange={(value) => handleAssignTeam(volunteer.id, value)}
                        disabled={volunteer.isSaving}
                      >
                        <SelectTrigger className="w-full text-lg">
                          <SelectValue placeholder={language === "en" ? "Select a team" : "Sélectionner une équipe"}>
                            {volunteer.isSaving ? (
                              <div className="flex items-center">
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                {volunteer.assigned}
                              </div>
                            ) : (
                              volunteer.assigned
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">
                            {language === "en" ? "-- Unassigned --" : "-- Non assigné --"}
                          </SelectItem>
                          {functionalTeams.map((team) => (
                            <SelectItem key={team} value={team}>
                              {team}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="color">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {colorTeamsList.map((team) => (
              <div key={team.id} className="bg-white p-4 rounded-lg shadow-sm border">
                <h3 className="font-medium text-lg flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full ${team.color}`}></div>
                  {team.name[language]}
                </h3>
                <p className="text-2xl font-bold">
                  {colorTeamSummary[team.id] || 0} {language === "en" ? "people" : "personnes"}
                </p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <table className="w-full text-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left font-medium text-gray-500">
                    {language === "en" ? "Name" : "Nom"}
                  </th>
                  <th className="px-6 py-4 text-left font-medium text-gray-500">
                    {language === "en" ? "Current Team" : "Équipe Actuelle"}
                  </th>
                  <th className="px-6 py-4 text-left font-medium text-gray-500">
                    {language === "en" ? "Assign Color Team" : "Assigner une équipe de couleur"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {volunteers.map((volunteer) => {
                  const currentTeam = colorTeamsList.find((t) => t.id === volunteer.colorTeam)

                  return (
                    <tr key={volunteer.id}>
                      <td className="px-6 py-4">{volunteer.name}</td>
                      <td className="px-6 py-4">
                        {currentTeam ? (
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded-full ${currentTeam.color}`}></div>
                            <span>{currentTeam.name[language]}</span>
                          </div>
                        ) : (
                          <span className="text-gray-500">
                            {language === "en" ? "No team assigned" : "Aucune équipe assignée"}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Select
                          value={volunteer.colorTeam || "none"}
                          onValueChange={(value) => handleAssignColorTeam(volunteer.id, value)}
                          disabled={volunteer.isSaving}
                        >
                          <SelectTrigger className="w-full text-lg">
                            <SelectValue placeholder={language === "en" ? "Select a team" : "Sélectionner une équipe"}>
                              {volunteer.isSaving ? (
                                <div className="flex items-center">
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  {volunteer.colorTeam || "none"}
                                </div>
                              ) : (
                                <></>
                              )}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              {language === "en" ? "-- No Team --" : "-- Aucune équipe --"}
                            </SelectItem>
                            {colorTeamsList.map((team) => (
                              <SelectItem key={team.id} value={team.id || ""}>
                                <div className="flex items-center gap-2">
                                  <div className={`w-4 h-4 rounded-full ${team.color}`}></div>
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
        </TabsContent>
      </Tabs>
    </div>
  )
}
