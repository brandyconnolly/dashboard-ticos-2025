"use client"

import { useState, useEffect } from "react"
import DataStatus from "@/components/data-status"
import { Button } from "@/components/ui/button"
import { Bus, Plus, Check, X, Search, RefreshCw } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Participant, Family } from "@/lib/types"
import { useLanguage } from "@/hooks/use-language"
import { getTranslation } from "@/lib/translations"
import { getParticipantsFromStorage, getFamiliesFromStorage } from "@/lib/storage-utils"
import { fetchSheetData, parseParticipants, parseFamilies } from "@/lib/fetch-data"
import { toast } from "@/components/ui/use-toast"

// Transportation status type
type BoardingStatus = "boarded" | "changed-plans" | "not-boarded"

interface TransportationStatus {
  participantId: string
  boardedTo: BoardingStatus
  boardedFrom: BoardingStatus
}

// Track manually added/removed participants
interface TransportationManagement {
  excludedParticipants: string[] // IDs of participants manually removed
  includedParticipants: string[] // IDs of participants manually added
}

export default function TransportationPage() {
  const { language } = useLanguage()
  const [participants, setParticipants] = useState<Participant[]>([])
  const [families, setFamilies] = useState<Family[]>([])
  const [transportationStatus, setTransportationStatus] = useState<TransportationStatus[]>([])
  const [transportationManagement, setTransportationManagement] = useState<TransportationManagement>({
    excludedParticipants: [],
    includedParticipants: [],
  })
  const [searchQuery, setSearchQuery] = useState("")
  const [searchDialogOpen, setSearchDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"all" | "to" | "from">("all")
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load data
  useEffect(() => {
    loadData()
  }, [])

  // Function to load data from Google Sheets and localStorage
  async function loadData() {
    setIsLoading(true)
    try {
      // Try to get data from localStorage first
      let participantsData = getParticipantsFromStorage()
      let familiesData = getFamiliesFromStorage()

      // If no data in localStorage, fetch from API
      if (!participantsData || !familiesData) {
        const sheetData = await fetchSheetData()
        participantsData = parseParticipants(sheetData)
        familiesData = parseFamilies(sheetData)
      }

      setParticipants(participantsData)
      setFamilies(familiesData)

      // Load transportation management from localStorage
      const savedTransportManagement = localStorage.getItem("retreat-transportation-management")
      let transportManagement: TransportationManagement = {
        excludedParticipants: [],
        includedParticipants: [],
      }

      if (savedTransportManagement) {
        transportManagement = JSON.parse(savedTransportManagement)
      }
      setTransportationManagement(transportManagement)

      // Load transportation status from localStorage
      const savedTransportStatus = localStorage.getItem("retreat-transportation-status")
      let transportStatus: TransportationStatus[] = []

      if (savedTransportStatus) {
        transportStatus = JSON.parse(savedTransportStatus)
      } else {
        // Initialize transportation status based on Google Sheet data
        transportStatus = initializeTransportationFromSheets(participantsData, familiesData, transportManagement)
      }

      setTransportationStatus(transportStatus)
      console.log("Loaded transportation status:", transportStatus.length, "participants")
    } catch (error) {
      console.error("Error loading data:", error)
      setError(error instanceof Error ? error.message : String(error))
    } finally {
      setIsLoading(false)
    }
  }

  // Initialize transportation status from Google Sheets data
  function initializeTransportationFromSheets(
    participantsData: Participant[],
    familiesData: Family[],
    management: TransportationManagement,
  ): TransportationStatus[] {
    const initialStatus: TransportationStatus[] = []
    const processedFamilies = new Set<number>()

    // Process each family
    for (const family of familiesData) {
      // Skip if this family has already been processed
      if (processedFamilies.has(family.id)) continue

      // Get the primary contact of the family
      const primaryContact = participantsData.find((p) => p.id === family.primaryContactId)
      if (!primaryContact) continue

      // Check if this family needs transportation based on form responses
      const needsTransportation = checkFamilyNeedsTransportation(primaryContact, family, participantsData)

      if (needsTransportation) {
        // Add all family members to transportation
        const familyMembers = participantsData.filter((p) => p.familyId === family.id)

        for (const member of familyMembers) {
          // Skip if this member is manually excluded
          if (management.excludedParticipants.includes(member.id)) {
            continue
          }

          initialStatus.push({
            participantId: member.id,
            boardedTo: "not-boarded",
            boardedFrom: "not-boarded",
          })
        }

        // Mark this family as processed
        processedFamilies.add(family.id)
      }
    }

    // Add manually included participants
    for (const participantId of management.includedParticipants) {
      // Check if already added
      if (!initialStatus.some((status) => status.participantId === participantId)) {
        initialStatus.push({
          participantId,
          boardedTo: "not-boarded",
          boardedFrom: "not-boarded",
        })
      }
    }

    console.log(`Initialized transportation with ${initialStatus.length} participants`)
    return initialStatus
  }

  // Check if a family needs transportation based on form responses
  function checkFamilyNeedsTransportation(
    primaryContact: Participant,
    family: Family,
    allParticipants: Participant[],
  ): boolean {
    // Check if the primary contact has the needsTransportation flag
    if (primaryContact.needsTransportation === true) {
      return true
    }

    // Check if any family member has the needsTransportation flag
    const familyMembers = allParticipants.filter((p) => p.familyId === family.id)
    if (familyMembers.some((member) => member.needsTransportation === true)) {
      return true
    }

    // Check if the form response indicates bus transportation
    const transportField = primaryContact.transportation || ""
    if (
      typeof transportField === "string" &&
      (transportField.toLowerCase().includes("bus") ||
        transportField.toLowerCase().includes("autobus") ||
        transportField.toLowerCase().includes("shuttle") ||
        transportField.toLowerCase().includes("navette"))
    ) {
      return true
    }

    // Check if there's a specific comment about needing the bus
    if (primaryContact.comments) {
      const lowerComments = primaryContact.comments.toLowerCase()
      if (
        lowerComments.includes("bus") ||
        lowerComments.includes("autobus") ||
        lowerComments.includes("navette") ||
        (lowerComments.includes("need") && lowerComments.includes("transport"))
      ) {
        return true
      }
    }

    // Default to not needing transportation
    return false
  }

  // Save transportation status to localStorage whenever it changes
  useEffect(() => {
    if (transportationStatus.length > 0) {
      localStorage.setItem("retreat-transportation-status", JSON.stringify(transportationStatus))
    }
  }, [transportationStatus])

  // Save transportation management to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("retreat-transportation-management", JSON.stringify(transportationManagement))
  }, [transportationManagement])

  // Refresh transportation data from Google Sheets
  const refreshTransportationData = async () => {
    setIsRefreshing(true)
    try {
      // Fetch fresh data from Google Sheets
      const sheetData = await fetchSheetData()
      const newParticipants = parseParticipants(sheetData)
      const newFamilies = parseFamilies(sheetData)

      setParticipants(newParticipants)
      setFamilies(newFamilies)

      // Re-initialize transportation status while preserving manual changes
      const updatedStatus = initializeTransportationFromSheets(newParticipants, newFamilies, transportationManagement)

      // Preserve boarding status for existing participants
      const finalStatus = updatedStatus.map((newStatus) => {
        const existingStatus = transportationStatus.find(
          (oldStatus) => oldStatus.participantId === newStatus.participantId,
        )

        if (existingStatus) {
          return {
            ...newStatus,
            boardedTo: existingStatus.boardedTo,
            boardedFrom: existingStatus.boardedFrom,
          }
        }

        return newStatus
      })

      setTransportationStatus(finalStatus)
      localStorage.setItem("retreat-transportation-status", JSON.stringify(finalStatus))

      toast({
        title: language === "en" ? "Data Refreshed" : "Données rafraîchies",
        description:
          language === "en"
            ? "Transportation data has been updated from Google Sheets"
            : "Les données de transport ont été mises à jour depuis Google Sheets",
      })
    } catch (error) {
      console.error("Error refreshing data:", error)
      toast({
        variant: "destructive",
        title: language === "en" ? "Error" : "Erreur",
        description:
          language === "en"
            ? "Failed to refresh transportation data"
            : "Échec de l'actualisation des données de transport",
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  // Get participant by ID
  const getParticipant = (id: string) => {
    return participants.find((p) => p.id === id)
  }

  // Get family by ID
  const getFamily = (id: number) => {
    return families.find((f) => f.id === id)
  }

  // Get transportation status for a participant
  const getTransportStatus = (participantId: string) => {
    return (
      transportationStatus.find((ts) => ts.participantId === participantId) || {
        participantId,
        boardedTo: "not-boarded" as BoardingStatus,
        boardedFrom: "not-boarded" as BoardingStatus,
      }
    )
  }

  // Add a participant to transportation
  const addParticipantToTransportation = (participant: Participant) => {
    // Check if participant is already in transportation
    const existingStatus = transportationStatus.find((ts) => ts.participantId === participant.id)

    if (!existingStatus) {
      // Add new status
      setTransportationStatus([
        ...transportationStatus,
        {
          participantId: participant.id,
          boardedTo: "not-boarded",
          boardedFrom: "not-boarded",
        },
      ])

      // Add to included participants list
      setTransportationManagement({
        ...transportationManagement,
        includedParticipants: [...transportationManagement.includedParticipants, participant.id],
        // If they were previously excluded, remove from excluded list
        excludedParticipants: transportationManagement.excludedParticipants.filter((id) => id !== participant.id),
      })
    }

    setSearchDialogOpen(false)

    toast({
      title: language === "en" ? "Rider Added" : "Passager ajouté",
      description:
        language === "en"
          ? `${participant.name} added to transportation list`
          : `${participant.name} ajouté à la liste de transport`,
    })
  }

  // Update boarding status
  const updateBoardingStatus = (participantId: string, direction: "to" | "from", status: BoardingStatus) => {
    const updatedStatus = transportationStatus.map((ts) => {
      if (ts.participantId === participantId) {
        return direction === "to" ? { ...ts, boardedTo: status } : { ...ts, boardedFrom: status }
      }
      return ts
    })

    setTransportationStatus(updatedStatus)
  }

  // Remove participant from transportation
  const removeFromTransportation = (participantId: string) => {
    const updatedStatus = transportationStatus.filter((ts) => ts.participantId !== participantId)
    setTransportationStatus(updatedStatus)

    // Add to excluded participants list
    setTransportationManagement({
      ...transportationManagement,
      excludedParticipants: [...transportationManagement.excludedParticipants, participantId],
      // If they were previously included, remove from included list
      includedParticipants: transportationManagement.includedParticipants.filter((id) => id !== participantId),
    })

    const participant = getParticipant(participantId)
    if (participant) {
      toast({
        title: language === "en" ? "Rider Removed" : "Passager retiré",
        description:
          language === "en"
            ? `${participant.name} removed from transportation list`
            : `${participant.name} retiré de la liste de transport`,
      })
    }
  }

  // Filter participants based on search query
  const filteredParticipants = participants.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.email && p.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.phone && p.phone.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  // Get participants with transportation status
  const getTransportationParticipants = () => {
    return transportationStatus
      .map((ts) => {
        const participant = getParticipant(ts.participantId)
        return {
          status: ts,
          participant,
        }
      })
      .filter((item) => item.participant !== undefined)
  }

  // Filter transportation participants based on active tab
  const filteredTransportationParticipants = getTransportationParticipants().filter((item) => {
    if (activeTab === "all") return true
    if (activeTab === "to") return true
    if (activeTab === "from") return true
    return true
  })

  // Add this helper function after the component declaration but before the useEffect
  const getLastName = (name: string) => {
    const parts = name.split(" ")
    return parts.length > 1 ? parts[parts.length - 1] : name
  }

  // Replace the sortedTransportationParticipants function with this improved version
  const sortedTransportationParticipants = [...filteredTransportationParticipants].sort((a, b) => {
    if (!a.participant || !b.participant) return 0
    const lastNameA = getLastName(a.participant.name)
    const lastNameB = getLastName(b.participant.name)
    return lastNameA.localeCompare(lastNameB)
  })

  // Also sort the transportation coordinators
  // Find the transportationCoordinators declaration and add sorting after it
  const transportationCoordinators = participants
    .filter((p) => p.roles.includes("transportation"))
    .sort((a, b) => {
      const lastNameA = getLastName(a.name)
      const lastNameB = getLastName(b.name)
      return lastNameA.localeCompare(lastNameB)
    })

  // Calculate transportation statistics
  const toStats = {
    total: transportationStatus.length,
    boarded: transportationStatus.filter((ts) => ts.boardedTo === "boarded").length,
    changedPlans: transportationStatus.filter((ts) => ts.boardedTo === "changed-plans").length,
  }

  const fromStats = {
    total: transportationStatus.length,
    boarded: transportationStatus.filter((ts) => ts.boardedFrom === "boarded").length,
    changedPlans: transportationStatus.filter((ts) => ts.boardedFrom === "changed-plans").length,
  }

  // Helper function to render boarding status badge
  const getBoardingStatusBadge = (status: BoardingStatus) => {
    switch (status) {
      case "boarded":
        return <Badge variant="outline">{language === "en" ? "Boarded" : "Embarqué"}</Badge>
      case "changed-plans":
        return <Badge variant="secondary">{language === "en" ? "Changed Plans" : "Changement de plans"}</Badge>
      default:
        return <Badge>{language === "en" ? "Not Boarded" : "Non monté à bord"}</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">{getTranslation("transportation", language)}</h1>
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6">
          <p className="text-red-700 font-medium">{getTranslation("error_loading_data", language)}</p>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">{getTranslation("transportation", language)}</h1>

      <DataStatus language={language} />

      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center">
              <Bus className="mr-2 h-6 w-6" />
              {getTranslation("bus_transportation", language)}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base md:text-lg">{getTranslation("to_retreat", language)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl md:text-3xl font-bold">
                    {toStats.boarded} / {toStats.total}
                  </div>
                  <div className="text-xs md:text-sm text-gray-500">{getTranslation("boarded_of_total", language)}</div>
                  {toStats.changedPlans > 0 && (
                    <div className="text-xs md:text-sm text-orange-600 mt-1">
                      {toStats.changedPlans} {getTranslation("changed_plans", language)}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base md:text-lg">{getTranslation("from_retreat", language)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl md:text-3xl font-bold">
                    {fromStats.boarded} / {fromStats.total}
                  </div>
                  <div className="text-xs md:text-sm text-gray-500">{getTranslation("boarded_of_total", language)}</div>
                  {fromStats.changedPlans > 0 && (
                    <div className="text-xs md:text-sm text-orange-600 mt-1">
                      {fromStats.changedPlans} {getTranslation("changed_plans", language)}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex gap-2 mt-4 md:mt-0">
            <Button variant="outline" onClick={refreshTransportationData} disabled={isRefreshing} className="mr-2">
              {isRefreshing ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-b-transparent rounded-full"></div>
                  {language === "en" ? "Refreshing..." : "Actualisation..."}
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {language === "en" ? "Refresh from Sheets" : "Actualiser depuis Sheets"}
                </>
              )}
            </Button>

            <Dialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="text-lg">
                  <Plus className="mr-2 h-5 w-5" />
                  {getTranslation("add_rider", language)}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="text-xl">{getTranslation("add_bus_rider", language)}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="search">{getTranslation("search_participants", language)}</Label>
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                      <Input
                        id="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={getTranslation("search_by_name", language)}
                        className="pl-8"
                      />
                    </div>
                  </div>

                  <div className="border rounded-md max-h-[300px] overflow-y-auto">
                    {filteredParticipants.length > 0 ? (
                      <ul className="divide-y">
                        {filteredParticipants.map((participant) => {
                          const family = getFamily(participant.familyId)
                          const isInTransportation = transportationStatus.some(
                            (ts) => ts.participantId === participant.id,
                          )

                          return (
                            <li key={participant.id} className="p-3 hover:bg-gray-50">
                              <div className="flex justify-between items-center">
                                <div>
                                  <div className="font-medium">{participant.name}</div>
                                  <div className="text-sm text-gray-500">
                                    {family?.name || `Family ID: ${participant.familyId}`}
                                  </div>
                                </div>

                                {isInTransportation ? (
                                  <Badge variant="outline" className="ml-2">
                                    {getTranslation("already_added", language)}
                                  </Badge>
                                ) : (
                                  <Button size="sm" onClick={() => addParticipantToTransportation(participant)}>
                                    {getTranslation("add", language)}
                                  </Button>
                                )}
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    ) : (
                      <div className="p-4 text-center text-gray-500">{getTranslation("no_results", language)}</div>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Transportation Coordinators Section */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
          <div>
            <h2 className="text-xl font-bold">
              {language === "en" ? "Transportation Coordinators" : "Coordinateurs de transport"}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {language === "en"
                ? "People assigned to manage transportation (with transportation role)"
                : "Personnes assignées à gérer le transport (avec le rôle de transport)"}
            </p>
          </div>
        </div>

        <div className="mt-4">
          {transportationCoordinators.length > 0 ? (
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">
                      {language === "en" ? "Name" : "Nom"}
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">
                      {language === "en" ? "Contact" : "Contact"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {transportationCoordinators.map((coordinator) => (
                    <tr key={coordinator.id}>
                      <td className="px-4 py-3 font-medium">{coordinator.name}</td>
                      <td className="px-4 py-3">
                        {coordinator.phone && <div>{coordinator.phone}</div>}
                        {coordinator.email && <div className="text-gray-500">{coordinator.email}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center p-4 border rounded-md bg-gray-50">
              {language === "en"
                ? "No transportation coordinators assigned. Assign the transportation role to participants in the Teams page."
                : "Aucun coordinateur de transport assigné. Attribuez le rôle de transport aux participants dans la page Équipes."}
            </div>
          )}
        </div>
      </div>

      <Tabs defaultValue="all" onValueChange={(value) => setActiveTab(value as "all" | "to" | "from")}>
        <TabsList className="mb-6">
          <TabsTrigger value="all" className="text-lg px-6 py-3">
            {getTranslation("all_riders", language)}
          </TabsTrigger>
          <TabsTrigger value="to" className="text-lg px-6 py-3">
            {getTranslation("to_retreat", language)}
          </TabsTrigger>
          <TabsTrigger value="from" className="text-lg px-6 py-3">
            {getTranslation("from_retreat", language)}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {sortedTransportationParticipants.length > 0 ? (
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="responsive-table-container">
                <table className="w-full text-sm md:text-lg responsive-table">
                  <thead className="bg-gray-50 border-t border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left font-medium text-gray-500">
                        {getTranslation("name", language)}
                      </th>
                      <th className="px-6 py-3 text-left font-medium text-gray-500">
                        {getTranslation("contact", language)}
                      </th>
                      <th className="px-6 py-3 text-center font-medium text-gray-500">
                        {getTranslation("to_status", language)}
                      </th>
                      <th className="px-6 py-3 text-center font-medium text-gray-500">
                        {getTranslation("from_status", language)}
                      </th>
                      <th className="px-6 py-3 text-center font-medium text-gray-500">
                        {getTranslation("actions", language)}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {sortedTransportationParticipants.map(({ participant, status }) => (
                      <tr key={participant!.id}>
                        <td className="px-6 py-4 font-medium">{participant!.name}</td>
                        <td className="px-6 py-4">
                          {participant!.phone || "-"}
                          {participant!.email && <div className="text-xs text-gray-500">{participant!.email}</div>}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex justify-center gap-2">
                            {getBoardingStatusBadge(status.boardedTo)}
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => updateBoardingStatus(participant!.id, "to", "boarded")}
                              >
                                <Check
                                  className={`h-4 w-4 ${status.boardedTo === "boarded" ? "text-green-600" : ""}`}
                                />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => updateBoardingStatus(participant!.id, "to", "changed-plans")}
                              >
                                <X
                                  className={`h-4 w-4 ${status.boardedTo === "changed-plans" ? "text-orange-600" : ""}`}
                                />
                              </Button>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex justify-center gap-2">
                            {getBoardingStatusBadge(status.boardedFrom)}
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => updateBoardingStatus(participant!.id, "from", "boarded")}
                              >
                                <Check
                                  className={`h-4 w-4 ${status.boardedFrom === "boarded" ? "text-green-600" : ""}`}
                                />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => updateBoardingStatus(participant!.id, "from", "changed-plans")}
                              >
                                <X
                                  className={`h-4 w-4 ${status.boardedFrom === "changed-plans" ? "text-orange-600" : ""}`}
                                />
                              </Button>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromTransportation(participant!.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            {getTranslation("remove", language)}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
              <p className="text-gray-500 text-lg">{getTranslation("no_riders", language)}</p>
              <Button className="mt-4" onClick={() => setSearchDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {getTranslation("add_rider", language)}
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="to">
          {sortedTransportationParticipants.length > 0 ? (
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="responsive-table-container">
                <table className="w-full text-sm md:text-lg responsive-table">
                  <thead className="bg-gray-50 border-t border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left font-medium text-gray-500">
                        {getTranslation("name", language)}
                      </th>
                      <th className="px-6 py-3 text-left font-medium text-gray-500">
                        {getTranslation("contact", language)}
                      </th>
                      <th className="px-6 py-3 text-center font-medium text-gray-500">
                        {getTranslation("status", language)}
                      </th>
                      <th className="px-6 py-3 text-center font-medium text-gray-500">
                        {getTranslation("actions", language)}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {sortedTransportationParticipants.map(({ participant, status }) => (
                      <tr key={participant!.id}>
                        <td className="px-6 py-4 font-medium">{participant!.name}</td>
                        <td className="px-6 py-4">
                          {participant!.phone || "-"}
                          {participant!.email && <div className="text-xs text-gray-500">{participant!.email}</div>}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex justify-center gap-2">
                            {getBoardingStatusBadge(status.boardedTo)}
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => updateBoardingStatus(participant!.id, "to", "boarded")}
                              >
                                <Check
                                  className={`h-4 w-4 ${status.boardedTo === "boarded" ? "text-green-600" : ""}`}
                                />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => updateBoardingStatus(participant!.id, "to", "changed-plans")}
                              >
                                <X
                                  className={`h-4 w-4 ${status.boardedTo === "changed-plans" ? "text-orange-600" : ""}`}
                                />
                              </Button>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromTransportation(participant!.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            {getTranslation("remove", language)}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
              <p className="text-gray-500 text-lg">{getTranslation("no_riders_to", language)}</p>
              <Button className="mt-4" onClick={() => setSearchDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {getTranslation("add_rider", language)}
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="from">
          {sortedTransportationParticipants.length > 0 ? (
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="responsive-table-container">
                <table className="w-full text-sm md:text-lg responsive-table">
                  <thead className="bg-gray-50 border-t border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left font-medium text-gray-500">
                        {getTranslation("name", language)}
                      </th>
                      <th className="px-6 py-3 text-left font-medium text-gray-500">
                        {getTranslation("contact", language)}
                      </th>
                      <th className="px-6 py-3 text-center font-medium text-gray-500">
                        {getTranslation("status", language)}
                      </th>
                      <th className="px-6 py-3 text-center font-medium text-gray-500">
                        {getTranslation("actions", language)}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {sortedTransportationParticipants.map(({ participant, status }) => (
                      <tr key={participant!.id}>
                        <td className="px-6 py-4 font-medium">{participant!.name}</td>
                        <td className="px-6 py-4">
                          {participant!.phone || "-"}
                          {participant!.email && <div className="text-xs text-gray-500">{participant!.email}</div>}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex justify-center gap-2">
                            {getBoardingStatusBadge(status.boardedFrom)}
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => updateBoardingStatus(participant!.id, "from", "boarded")}
                              >
                                <Check
                                  className={`h-4 w-4 ${status.boardedFrom === "boarded" ? "text-green-600" : ""}`}
                                />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => updateBoardingStatus(participant!.id, "from", "changed-plans")}
                              >
                                <X
                                  className={`h-4 w-4 ${status.boardedFrom === "changed-plans" ? "text-orange-600" : ""}`}
                                />
                              </Button>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromTransportation(participant!.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            {getTranslation("remove", language)}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
              <p className="text-gray-500 text-lg">{getTranslation("no_riders_from", language)}</p>
              <Button className="mt-4" onClick={() => setSearchDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {getTranslation("add_rider", language)}
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
