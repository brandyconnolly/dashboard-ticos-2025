"use client"

import { useState, useEffect } from "react"
import DataStatus from "@/components/data-status"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Edit, Plus, Trash2, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { parseParticipants, parseFamilies } from "@/lib/fetch-data"
import type { Family } from "@/lib/types"

// Room type definition
interface Room {
  id: string
  beds: number
  occupants: string[]
  accessible?: boolean
  notes?: string
}

// Building type definition
interface Building {
  name: string
  rooms: Room[]
}

// Unassigned group type
interface UnassignedGroup {
  id: number
  name: string
  members: string[]
  specialNeeds: boolean
  prefersSingle?: boolean
  needsAccessible?: boolean
}

export default function RoomsPage() {
  const [language, setLanguage] = useState<"en" | "fr">("en")
  const [buildings, setBuildings] = useState<Building[]>([
    {
      name: "Building A",
      rooms: [
        { id: "A1", beds: 4, occupants: [], notes: "" },
        { id: "A2", beds: 6, occupants: [], notes: "" },
        { id: "A3", beds: 4, occupants: [], notes: "" },
        { id: "A4", beds: 2, occupants: [], accessible: true, notes: "Ground floor, wheelchair accessible" },
      ],
    },
    {
      name: "Building B",
      rooms: [
        { id: "B1", beds: 4, occupants: [], notes: "" },
        { id: "B2", beds: 4, occupants: [], notes: "" },
        { id: "B3", beds: 6, occupants: [], notes: "" },
      ],
    },
    {
      name: "Building C",
      rooms: [
        { id: "C1", beds: 4, occupants: [], notes: "" },
        { id: "C2", beds: 6, occupants: [], notes: "Near restrooms" },
        { id: "C3", beds: 4, occupants: [], notes: "" },
      ],
    },
  ])
  const [unassignedGroups, setUnassignedGroups] = useState<UnassignedGroup[]>([])
  const [selectedBuilding, setSelectedBuilding] = useState("Building A")
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [editingBuilding, setEditingBuilding] = useState<string | null>(null)
  const [newBuilding, setNewBuilding] = useState({ name: "", rooms: [] })
  const [newRoom, setNewRoom] = useState<Room>({ id: "", beds: 2, occupants: [], notes: "" })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [buildingDialogOpen, setBuildingDialogOpen] = useState(false)
  const [newRoomDialogOpen, setNewRoomDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch data directly in the component
  useEffect(() => {
    async function fetchData() {
      try {
        console.log("Fetching data for rooms page")
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

        // Transform families into unassigned groups
        const transformedGroups: UnassignedGroup[] = parsedFamilies.map((family: Family) => {
          const familyMembers = parsedParticipants.filter((p) => p.familyId === family.id)
          const memberNames = familyMembers.map((m) => m.name)

          // Check if any family member has special needs
          const hasSpecialNeeds = familyMembers.some(
            (m) =>
              m.roles.includes("custom") &&
              (m.customRole?.toLowerCase().includes("wheelchair") ||
                m.customRole?.toLowerCase().includes("accessible")),
          )

          // Check if family prefers single room
          const prefersSingle =
            familyMembers.length === 1 ||
            familyMembers.some((m) => m.roles.includes("custom") && m.customRole?.toLowerCase().includes("single"))

          return {
            id: family.id,
            name: family.name,
            members: memberNames,
            specialNeeds: hasSpecialNeeds,
            prefersSingle: prefersSingle,
            needsAccessible: hasSpecialNeeds,
          }
        })

        console.log("Transformed unassigned groups:", transformedGroups.length)
        setUnassignedGroups(transformedGroups)
        setIsLoading(false)
      } catch (err) {
        console.error("Error fetching data:", err)
        setError(err instanceof Error ? err.message : String(err))
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleAssignRoom = (buildingName: string, roomId: string, groupId: number) => {
    const group = unassignedGroups.find((g) => g.id === groupId)
    if (!group) return

    // Update rooms
    const updatedBuildings = [...buildings]
    const buildingIndex = updatedBuildings.findIndex((b) => b.name === buildingName)

    if (buildingIndex !== -1) {
      const roomIndex = updatedBuildings[buildingIndex].rooms.findIndex((r) => r.id === roomId)
      if (roomIndex !== -1) {
        updatedBuildings[buildingIndex].rooms[roomIndex].occupants = [
          ...updatedBuildings[buildingIndex].rooms[roomIndex].occupants,
          ...group.members,
        ]
        setBuildings(updatedBuildings)
      }
    }

    // Remove from unassigned
    setUnassignedGroups(unassignedGroups.filter((g) => g.id !== groupId))
  }

  const handleRemoveOccupant = (buildingName: string, roomId: string, occupantName: string) => {
    const updatedBuildings = [...buildings]
    const buildingIndex = updatedBuildings.findIndex((b) => b.name === buildingName)

    if (buildingIndex !== -1) {
      const roomIndex = updatedBuildings[buildingIndex].rooms.findIndex((r) => r.id === roomId)
      if (roomIndex !== -1) {
        updatedBuildings[buildingIndex].rooms[roomIndex].occupants = updatedBuildings[buildingIndex].rooms[
          roomIndex
        ].occupants.filter((o) => o !== occupantName)
        setBuildings(updatedBuildings)
      }
    }
  }

  const handleUpdateRoom = () => {
    if (!editingRoom || !editingBuilding) return

    const updatedBuildings = [...buildings]
    const buildingIndex = updatedBuildings.findIndex((b) => b.name === editingBuilding)

    if (buildingIndex !== -1) {
      const roomIndex = updatedBuildings[buildingIndex].rooms.findIndex((r) => r.id === editingRoom.id)
      if (roomIndex !== -1) {
        updatedBuildings[buildingIndex].rooms[roomIndex] = editingRoom
        setBuildings(updatedBuildings)
      }
    }

    setEditingRoom(null)
    setEditingBuilding(null)
    setDialogOpen(false)
  }

  const handleAddBuilding = () => {
    if (newBuilding.name.trim()) {
      setBuildings([...buildings, { ...newBuilding, name: newBuilding.name.trim() }])
      setNewBuilding({ name: "", rooms: [] })
      setBuildingDialogOpen(false)
    }
  }

  const handleAddRoom = () => {
    if (newRoom.id.trim() && selectedBuilding) {
      const updatedBuildings = [...buildings]
      const buildingIndex = updatedBuildings.findIndex((b) => b.name === selectedBuilding)

      if (buildingIndex !== -1) {
        updatedBuildings[buildingIndex].rooms.push({ ...newRoom, id: newRoom.id.trim() })
        setBuildings(updatedBuildings)
      }

      setNewRoom({ id: "", beds: 2, occupants: [], notes: "" })
      setNewRoomDialogOpen(false)
    }
  }

  // Render the building content based on the selected building
  const renderBuildingContent = () => {
    const building = buildings.find((b) => b.name === selectedBuilding)
    if (!building) return null

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
        {building.rooms.map((room) => (
          <div
            key={room.id}
            className={`border rounded-lg p-3 md:p-6 bg-white shadow-sm ${room.accessible ? "border-blue-300" : ""}`}
          >
            <div className="flex justify-between items-start mb-3 md:mb-4">
              <div>
                <h3 className="text-lg md:text-xl font-semibold">
                  Room {room.id}
                  {room.accessible && <span className="ml-2 text-blue-500">♿</span>}
                </h3>
                <p className="text-base md:text-lg">
                  {room.beds} {language === "en" ? "beds" : "lits"}
                </p>
                {room.notes && <p className="text-xs md:text-sm text-gray-500">{room.notes}</p>}
              </div>

              <div className="flex gap-1 md:gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingRoom(room)
                    setEditingBuilding(building.name)
                    setDialogOpen(true)
                  }}
                >
                  <Edit className="h-3 w-3 md:h-4 md:w-4" />
                </Button>

                <Select
                  onValueChange={(value) => handleAssignRoom(building.name, room.id, Number.parseInt(value))}
                  disabled={room.occupants.length >= room.beds}
                >
                  <SelectTrigger className="w-24 md:w-48 text-sm md:text-lg">
                    <SelectValue placeholder={language === "en" ? "Assign" : "Assigner"} />
                  </SelectTrigger>
                  <SelectContent>
                    {unassignedGroups.map((group) => (
                      <SelectItem
                        key={group.id}
                        value={group.id.toString()}
                        disabled={
                          group.members.length > room.beds - room.occupants.length ||
                          (group.needsAccessible && !room.accessible)
                        }
                      >
                        {group.name} ({group.members.length}){group.prefersSingle && " ⭐"}
                        {group.needsAccessible && " ♿"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-3 md:mt-4">
              <h4 className="font-medium text-base md:text-lg mb-1 md:mb-2">
                {language === "en" ? "Occupants" : "Occupants"}:
              </h4>
              {room.occupants.length > 0 ? (
                <ul className="space-y-1 md:space-y-2">
                  {room.occupants.map((occupant, idx) => (
                    <li key={idx} className="flex justify-between items-center">
                      <span className="text-sm md:text-lg truncate pr-2">{occupant}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveOccupant(building.name, room.id, occupant)}
                      >
                        <Trash2 className="h-3 w-3 md:h-4 md:w-4 text-red-500" />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-sm md:text-lg">
                  {language === "en" ? "No occupants assigned" : "Aucun occupant assigné"}
                </p>
              )}

              <p className="mt-2 text-sm md:text-lg">
                {room.occupants.length}/{room.beds} {language === "en" ? "beds filled" : "lits occupés"}
              </p>
            </div>
          </div>
        ))}
      </div>
    )
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
        <h1 className="text-3xl font-bold mb-6">{language === "en" ? "Room Assignments" : "Chambres"}</h1>
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
      <h1 className="text-3xl font-bold mb-6">{language === "en" ? "Room Assignments" : "Chambres"}</h1>

      <DataStatus language={language} />

      <div className="flex justify-between items-center mb-6">
        <Tabs value={selectedBuilding} onValueChange={setSelectedBuilding}>
          <TabsList className="mb-6 text-lg">
            {buildings.map((building) => (
              <TabsTrigger key={building.name} value={building.name} className="text-lg px-6 py-3">
                {building.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Move TabsContent inside the Tabs component */}
          {buildings.map((building) => (
            <TabsContent key={building.name} value={building.name}>
              {renderBuildingContent()}
            </TabsContent>
          ))}
        </Tabs>

        <div className="flex gap-2">
          <Dialog open={newRoomDialogOpen} onOpenChange={setNewRoomDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                {language === "en" ? "Add Room" : "Ajouter une chambre"}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="text-xl">
                  {language === "en" ? "Add New Room" : "Ajouter une nouvelle chambre"}
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="roomId">{language === "en" ? "Room ID" : "ID de la chambre"}</Label>
                  <Input
                    id="roomId"
                    value={newRoom.id}
                    onChange={(e) => setNewRoom({ ...newRoom, id: e.target.value })}
                    placeholder="e.g. A5"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="beds">{language === "en" ? "Number of Beds" : "Nombre de lits"}</Label>
                  <Input
                    id="beds"
                    type="number"
                    min="1"
                    value={newRoom.beds}
                    onChange={(e) => setNewRoom({ ...newRoom, beds: Number.parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="accessible"
                    checked={newRoom.accessible || false}
                    onCheckedChange={(checked) => setNewRoom({ ...newRoom, accessible: checked === true })}
                  />
                  <Label htmlFor="accessible">
                    {language === "en" ? "Wheelchair Accessible" : "Accessible en fauteuil roulant"}
                  </Label>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">{language === "en" ? "Notes" : "Notes"}</Label>
                  <Input
                    id="notes"
                    value={newRoom.notes}
                    onChange={(e) => setNewRoom({ ...newRoom, notes: e.target.value })}
                    placeholder={
                      language === "en" ? "Any special notes about this room" : "Notes spéciales sur cette chambre"
                    }
                  />
                </div>
                <Button onClick={handleAddRoom}>{language === "en" ? "Add Room" : "Ajouter la chambre"}</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={buildingDialogOpen} onOpenChange={setBuildingDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {language === "en" ? "Add Building" : "Ajouter un bâtiment"}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="text-xl">
                  {language === "en" ? "Add New Building" : "Ajouter un nouveau bâtiment"}
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="buildingName">{language === "en" ? "Building Name" : "Nom du bâtiment"}</Label>
                  <Input
                    id="buildingName"
                    value={newBuilding.name}
                    onChange={(e) => setNewBuilding({ ...newBuilding, name: e.target.value })}
                    placeholder="e.g. Building D"
                  />
                </div>
                <Button onClick={handleAddBuilding}>
                  {language === "en" ? "Add Building" : "Ajouter le bâtiment"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">{language === "en" ? "Unassigned Groups" : "Groupes non assignés"}</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {unassignedGroups.length > 0 ? (
            unassignedGroups.map((group) => (
              <div key={group.id} className="border rounded-lg p-4 bg-white shadow-sm">
                <h3 className="text-lg font-semibold">
                  {group.name}
                  {group.prefersSingle && <span className="ml-2 text-yellow-500">⭐</span>}
                  {group.needsAccessible && <span className="ml-2 text-blue-500">♿</span>}
                </h3>
                <p className="text-gray-600">
                  {group.members.length} {language === "en" ? "people" : "personnes"}
                </p>
                <ul className="list-disc ml-6 mt-2">
                  {group.members.map((member, idx) => (
                    <li key={idx}>{member}</li>
                  ))}
                </ul>
                {group.prefersSingle && (
                  <p className="text-sm text-yellow-600 mt-2">
                    {language === "en" ? "Prefers single room" : "Préfère une chambre individuelle"}
                  </p>
                )}
                {group.needsAccessible && (
                  <p className="text-sm text-blue-600 mt-2">
                    {language === "en" ? "Needs accessible room" : "Besoin d'une chambre accessible"}
                  </p>
                )}
              </div>
            ))
          ) : (
            <div className="col-span-full text-center p-8 bg-gray-50 rounded-lg">
              <p className="text-lg text-gray-500">
                {language === "en" ? "All groups have been assigned rooms" : "Tous les groupes ont été assignés"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Room Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {language === "en" ? `Edit Room ${editingRoom?.id}` : `Modifier la chambre ${editingRoom?.id}`}
            </DialogTitle>
          </DialogHeader>
          {editingRoom && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-roomId">{language === "en" ? "Room ID" : "ID de la chambre"}</Label>
                <Input
                  id="edit-roomId"
                  value={editingRoom.id}
                  onChange={(e) => setEditingRoom({ ...editingRoom, id: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-beds">{language === "en" ? "Number of Beds" : "Nombre de lits"}</Label>
                <Input
                  id="edit-beds"
                  type="number"
                  min="1"
                  value={editingRoom.beds}
                  onChange={(e) => setEditingRoom({ ...editingRoom, beds: Number.parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="edit-accessible"
                  checked={editingRoom.accessible || false}
                  onCheckedChange={(checked) => setEditingRoom({ ...editingRoom, accessible: checked === true })}
                />
                <Label htmlFor="edit-accessible">
                  {language === "en" ? "Wheelchair Accessible" : "Accessible en fauteuil roulant"}
                </Label>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-notes">{language === "en" ? "Notes" : "Notes"}</Label>
                <Input
                  id="edit-notes"
                  value={editingRoom.notes}
                  onChange={(e) => setEditingRoom({ ...editingRoom, notes: e.target.value })}
                />
              </div>
              <Button onClick={handleUpdateRoom}>
                {language === "en" ? "Save Changes" : "Enregistrer les modifications"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
