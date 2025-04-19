"use client"

import { useState, useEffect } from "react"
import DataStatus from "@/components/data-status"
import { Button } from "@/components/ui/button"
import { Bus, Plus, Check, X, Search, Save } from "lucide-react"
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
type TransportDirection = "both" | "to" | "from" | "none"
type BoardingStatus = "boarded" | "changed-plans" | "not-boarded"

interface TransportationStatus {
  participantId: string
  direction: TransportDirection
  boardedTo: BoardingStatus
  boardedFrom: BoardingStatus
}

export default function TransportationPage() {
  const { language } = useLanguage()
  const [participants, setParticipants] = useState<Participant[]>([])
  const [families, setFamilies] = useState<Family[]>([])
  const [transportationStatus, setTransportationStatus] = useState<TransportationStatus[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [searchDialogOpen, setSearchDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"all" | "to" | "from">("all")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load data
  useEffect(() => {
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

        // Load transportation status from localStorage
        const savedTransportStatus = localStorage.getItem("retreat-transportation-status")

        if (savedTransportStatus) {
          setTransportationStatus(JSON.parse(savedTransportStatus))
        } else {
          // Initialize with empty transportation status
          setTransportationStatus([])
          localStorage.setItem("retreat-transportation-status", JSON.stringify([]))
        }
      } catch (error) {
        console.error("Error loading data:", error)
        setError(error instanceof Error ? error.message : String(error))
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  // Save transportation status to localStorage whenever it changes
  useEffect(() => {
    if (transportationStatus.length > 0) {
      localStorage.setItem("retreat-transportation-status", JSON.stringify(transportationStatus))
    }
  }, [transportationStatus])

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
        direction: "both" as TransportDirection,
        boardedTo: "not-boarded" as BoardingStatus,
        boardedFrom: "not-boarded" as BoardingStatus,
      }
    )
  }

  // Add a participant to transportation
  const addParticipantToTransportation = (participant: Participant, direction: TransportDirection) => {
    // Check if participant is already in transportation
    const existingStatus = transportationStatus.find((ts) => ts.participantId === participant.id)

    if (existingStatus) {
      // Update existing status
      const updatedStatus = transportationStatus.map((ts) =>
        ts.participantId === participant.id ? { ...ts, direction } : ts,
      )
      setTransportationStatus(updatedStatus)
    } else {
      // Add new status
      setTransportationStatus([
        ...transportationStatus,
        {
          participantId: participant.id,
          direction,
          boardedTo: "not-boarded",
          boardedFrom: "not-boarded",
        },
      ])
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

  // Save transportation roles to Google Sheets
  const saveTransportationRolesToSheets = async () => {
    setIsSaving(true)
    try {
      // Get participants with transportation role
      const transportationCoordinators = participants.filter((p) => p.roles.includes("transportation"))

      // Update each participant in Google Sheets
      for (const participant of transportationCoordinators) {
        await fetch("/api/update-participant", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(participant),
        })
      }

      toast({
        title: language === "en" ? "Saved to Google Sheets" : "Enregistré dans Google Sheets",
        description:
          language === "en"
            ? "Transportation coordinators saved to Google Sheets"
            : "Coordinateurs de transport enregistrés dans Google Sheets",
      })
    } catch (error) {
      console.error("Error saving to Google Sheets:", error)
      toast({
        variant: "destructive",
        title: language === "en" ? "Error" : "Erreur",
        description:
          language === "en" ? "Failed to save to Google Sheets" : "Échec de l'enregistrement dans Google Sheets",
      })
    } finally {
      setIsSaving(false)
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
    if (activeTab === "to") return item.status.direction === "both" || item.status.direction === "to"
    if (activeTab === "from") return item.status.direction === "both" || item.status.direction === "from"
    return true
  })

  // Group participants by family
  const groupedByFamily = filteredTransportationParticipants.reduce(
    (acc, item) => {
      const participant = item.participant!
      const familyId = participant.familyId

      if (!acc[familyId]) {
        acc[familyId] = []
      }

      acc[familyId].push(item)
      return acc
    },
    {} as Record<number, typeof filteredTransportationParticipants>,
  )

  // Calculate statistics
  const calculateStats = (direction: "to" | "from") => {
    const relevantParticipants = transportationStatus.filter(
      (ts) => ts.direction === "both" || ts.direction === direction,
    )

    const total = relevantParticipants.length
    const boarded = relevantParticipants.filter((ts) =>
      direction === "to" ? ts.boardedTo === "boarded" : ts.boardedFrom === "boarded",
    ).length
    const changedPlans = relevantParticipants.filter((ts) =>
      direction === "to" ? ts.boardedTo === "changed-plans" : ts.boardedFrom === "changed-plans",
    ).length

    return { total, boarded, changedPlans }
  }

  const toStats = calculateStats("to")
  const fromStats = calculateStats("from")

  // Get boarding status badge
  const getBoardingStatusBadge = (status: BoardingStatus) => {
    switch (status) {
      case "boarded":
        return <Badge className="bg-green-600">{getTranslation("boarded", language)}</Badge>
      case "changed-plans":
        return (
          <Badge variant="outline" className="border-orange-500 text-orange-600">
            {getTranslation("changed_plans", language)}
          </Badge>
        )
      default:
        return <Badge variant="outline">{getTranslation("not_boarded", language)}</Badge>
    }
  }

  // Get transportation coordinators
  const transportationCoordinators = participants.filter((p) => p.roles.includes("transportation"))

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
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => addParticipantToTransportation(participant, "to")}
                                    >
                                      {getTranslation("to_only", language)}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => addParticipantToTransportation(participant, "from")}
                                    >
                                      {getTranslation("from_only", language)}
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => addParticipantToTransportation(participant, "both")}
                                    >
                                      {getTranslation("both_ways", language)}
                                    </Button>
                                  </div>
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

          <Button onClick={saveTransportationRolesToSheets} disabled={isSaving} className="mt-4 md:mt-0">
            {isSaving ? (
              <>
                <div className="animate-spin mr-2 h-4 w-4 border-2 border-b-transparent rounded-full"></div>
                {language === "en" ? "Saving..." : "Enregistrement..."}
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {language === "en" ? "Save to Sheets" : "Enregistrer dans Sheets"}
              </>
            )}
          </Button>
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
          {Object.entries(groupedByFamily).length > 0 ? (
            <div className="space-y-6">
              {Object.entries(groupedByFamily).map(([familyId, members]) => {
                const family = getFamily(Number(familyId))
                const familyName = family?.name || `Family ID: ${familyId}`

                return (
                  <div key={familyId} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                    <div className="bg-gray-50 px-6 py-3 font-medium text-lg">{familyName}</div>
                    <div className="responsive-table-container">
                      <table className="w-full text-sm md:text-lg responsive-table">
                        <thead className="bg-gray-50 border-t border-gray-200">
                          <tr>
                            <th className="px-6 py-3 text-left font-medium text-gray-500">
                              {getTranslation("name", language)}
                            </th>
                            <th className="px-6 py-3 text-left font-medium text-gray-500">
                              {getTranslation("direction", language)}
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
                          {members.map(({ participant, status }) => (
                            <tr key={participant!.id}>
                              <td className="px-6 py-4 font-medium">{participant!.name}</td>
                              <td className="px-6 py-4">
                                {status.direction === "both" && (
                                  <span>
                                    {getTranslation("both_ways", language)}
                                    <span className="ml-2">🔄</span>
                                  </span>
                                )}
                                {status.direction === "to" && (
                                  <span>
                                    {getTranslation("to_only", language)}
                                    <span className="ml-2">➡️</span>
                                  </span>
                                )}
                                {status.direction === "from" && (
                                  <span>
                                    {getTranslation("from_only", language)}
                                    <span className="ml-2">⬅️</span>
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-center">
                                {status.direction === "both" || status.direction === "to" ? (
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
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-center">
                                {status.direction === "both" || status.direction === "from" ? (
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
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
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
                )
              })}
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
          {/* To retreat content - same structure as above */}
          {Object.entries(groupedByFamily).length > 0 ? (
            <div className="space-y-6">
              {Object.entries(groupedByFamily).map(([familyId, members]) => {
                const family = getFamily(Number(familyId))
                const familyName = family?.name || `Family ID: ${familyId}`
                const filteredMembers = members.filter(
                  (m) => m.status.direction === "both" || m.status.direction === "to",
                )

                if (filteredMembers.length === 0) return null

                return (
                  <div key={familyId} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                    <div className="bg-gray-50 px-6 py-3 font-medium text-lg">{familyName}</div>
                    <div className="responsive-table-container">
                      <table className="w-full text-sm md:text-lg responsive-table">
                        <thead className="bg-gray-50 border-t border-gray-200">
                          <tr>
                            <th className="px-6 py-3 text-left font-medium text-gray-500">
                              {getTranslation("name", language)}
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
                          {filteredMembers.map(({ participant, status }) => (
                            <tr key={participant!.id}>
                              <td className="px-6 py-4 font-medium">{participant!.name}</td>
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
                )
              })}
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
          {Object.entries(groupedByFamily).length > 0 ? (
            <div className="space-y-6">
              {Object.entries(groupedByFamily).map(([familyId, members]) => {
                const family = getFamily(Number(familyId))
                const familyName = family?.name || `Family ID: ${familyId}`
                const filteredMembers = members.filter(
                  (m) => m.status.direction === "both" || m.status.direction === "from",
                )

                if (filteredMembers.length === 0) return null

                return (
                  <div key={familyId} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                    <div className="bg-gray-50 px-6 py-3 font-medium text-lg">{familyName}</div>
                    <div className="responsive-table-container">
                      <table className="w-full text-sm md:text-lg responsive-table">
                        <thead className="bg-gray-50 border-t border-gray-200">
                          <tr>
                            <th className="px-6 py-3 text-left font-medium text-gray-500">
                              {getTranslation("name", language)}
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
                          {filteredMembers.map(({ participant, status }) => (
                            <tr key={participant!.id}>
                              <td className="px-6 py-4 font-medium">{participant!.name}</td>
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
                )
              })}
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
