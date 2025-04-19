"use client"

import { useState, useEffect } from "react"
import DataStatus from "@/components/data-status"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Edit, Plus, Trash2, AlertTriangle, Save, Loader2 } from "lucide-react"
import Link from "next/link"
import { parseParticipants, parseFamilies } from "@/lib/fetch-data"
import type { Family } from "@/lib/types"
import { useLanguage } from "@/hooks/use-language"
import { toast } from "@/components/ui/use-toast"

// Room type definition
interface Room {
  id: string
  beds: number
  occupants: string[]
  accessible?: boolean
  firstFloor?: boolean
  notes?: string
}

// Floor type definition
interface Floor {
  name: string
  rooms: Room[]
}

// Unassigned group type
interface UnassignedGroup {
  id: number
  name: string
  members: string[]
  specialNeeds: {
    needsAccessible?: boolean
    needsFirstFloor?: boolean
    notes?: string
  }
}

// Room assignment storage key
const ROOM_ASSIGNMENTS_STORAGE_KEY = "retreat-room-assignments"
const SPECIAL_NEEDS_STORAGE_KEY = "retreat-special-needs"

export default function RoomsPage() {
  const { language } = useLanguage()
  const [floors, setFloors] = useState<Floor[]>([
    {
      name: "Floor 1",
      rooms: [
        { id: "101", beds: 4, occupants: [], notes: "Near elevator" },
        { id: "102", beds: 2, occupants: [], accessible: true, firstFloor: true, notes: "Wheelchair accessible" },
        { id: "103", beds: 4, occupants: [], firstFloor: true, notes: "" },
        { id: "104", beds: 2, occupants: [], firstFloor: true, notes: "" },
      ],
    },
    {
      name: "Floor 2",
      rooms: [
        { id: "201", beds: 4, occupants: [], notes: "" },
        { id: "202", beds: 4, occupants: [], notes: "" },
        { id: "203", beds: 6, occupants: [], notes: "" },
        { id: "204", beds: 2, occupants: [], notes: "" },
      ],
    },
    {
      name: "Floor 3",
      rooms: [
        { id: "301", beds: 4, occupants: [], notes: "" },
        { id: "302", beds: 6, occupants: [], notes: "Near restrooms" },
        { id: "303", beds: 4, occupants: [], notes: "" },
        { id: "304", beds: 2, occupants: [], notes: "" },
      ],
    },
  ])
  const [unassignedGroups, setUnassignedGroups] = useState<UnassignedGroup[]>([])
  const [selectedFloor, setSelectedFloor] = useState("Floor 1")
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [editingFloor, setEditingFloor] = useState<string | null>(null)
  const [newFloor, setNewFloor] = useState({ name: "", rooms: [] })
  const [newRoom, setNewRoom] = useState<Room>({ id: "", beds: 2, occupants: [], notes: "" })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [floorDialogOpen, setFloorDialogOpen] = useState(false)
  const [newRoomDialogOpen, setNewRoomDialogOpen] = useState(false)
  const [specialNeedsDialogOpen, setSpecialNeedsDialogOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<UnassignedGroup | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

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

        // Load saved room assignments if they exist
        const savedRoomAssignments = localStorage.getItem(ROOM_ASSIGNMENTS_STORAGE_KEY)
        if (savedRoomAssignments) {
          try {
            const parsedAssignments = JSON.parse(savedRoomAssignments)
            setFloors(parsedAssignments)
            console.log("Loaded saved room assignments")
          } catch (e) {
            console.error("Error parsing saved room assignments:", e)
          }
        }

        // Load saved special needs if they exist
        const savedSpecialNeeds = localStorage.getItem(SPECIAL_NEEDS_STORAGE_KEY)
        let specialNeeds: Record<number, { needsAccessible?: boolean; needsFirstFloor?: boolean; notes?: string }> = {}

        if (savedSpecialNeeds) {
          try {
            specialNeeds = JSON.parse(savedSpecialNeeds)
            console.log("Loaded saved special needs")
          } catch (e) {
            console.error("Error parsing saved special needs:", e)
          }
        }

        // Transform families into unassigned groups
        const transformedGroups: UnassignedGroup[] = parsedFamilies.map((family: Family) => {
          const familyMembers = parsedParticipants.filter((p) => p.familyId === family.id)
          const memberNames = familyMembers.map((m) => m.name)

          // Check if any family member has special needs from comments
          const hasSpecialNeeds = familyMembers.some(
            (m) =>
              m.comments &&
              (m.comments.toLowerCase().includes("wheelchair") ||
                m.comments.toLowerCase().includes("accessible") ||
                m.comments.toLowerCase().includes("first floor") ||
                m.comments.toLowerCase().includes("ground floor")),
          )

          // Get saved special needs for this family
          const savedNeeds = specialNeeds[family.id] || {}

          return {
            id: family.id,
            name: family.name,
            members: memberNames,
            specialNeeds: {
              needsAccessible: savedNeeds.needsAccessible || hasSpecialNeeds,
              needsFirstFloor: savedNeeds.needsFirstFloor || hasSpecialNeeds,
              notes: savedNeeds.notes || "",
            },
          }
        })

        // Filter out families that are already assigned to rooms
        const assignedOccupants = new Set<string>()
        floors.forEach((floor) =>
          floor.rooms.forEach((room) => room.occupants.forEach((occupant) => assignedOccupants.add(occupant))),
        )

        const filteredGroups = transformedGroups.filter(
          (group) => !group.members.every((member) => assignedOccupants.has(member)),
        )

        console.log("Transformed unassigned groups:", filteredGroups.length)
        setUnassignedGroups(filteredGroups)
        setIsLoading(false)
      } catch (err) {
        console.error("Error fetching data:", err)
        setError(err instanceof Error ? err.message : String(err))
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  // Save room assignments whenever they change
  useEffect(() => {
    if (!isLoading && floors.length > 0) {
      setHasUnsavedChanges(true)
    }
  }, [floors, isLoading])

  const saveChanges = () => {
    setIsSaving(true)
    try {
      // Save room assignments
      localStorage.setItem(ROOM_ASSIGNMENTS_STORAGE_KEY, JSON.stringify(floors))

      // Save special needs
      const specialNeeds: Record<number, { needsAccessible?: boolean; needsFirstFloor?: boolean; notes?: string }> = {}
      unassignedGroups.forEach((group) => {
        specialNeeds[group.id] = group.specialNeeds
      })
      localStorage.setItem(SPECIAL_NEEDS_STORAGE_KEY, JSON.stringify(specialNeeds))

      setHasUnsavedChanges(false)
      toast({
        title: language === "en" ? "Changes Saved" : "Modifications enregistrées",
        description:
          language === "en" ? "Room assignments have been saved" : "Les attributions de chambres ont été enregistrées",
      })
    } catch (e) {
      console.error("Error saving room assignments:", e)
      toast({
        variant: "destructive",
        title: language === "en" ? "Error" : "Erreur",
        description:
          language === "en"
            ? "Failed to save room assignments"
            : "Échec de l'enregistrement des attributions de chambres",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleAssignRoom = (floorName: string, roomId: string, groupId: number) => {
    const group = unassignedGroups.find((g) => g.id === groupId)
    if (!group) return

    // Update rooms
    const updatedFloors = [...floors]
    const floorIndex = updatedFloors.findIndex((b) => b.name === floorName)

    if (floorIndex !== -1) {
      const roomIndex = updatedFloors[floorIndex].rooms.findIndex((r) => r.id === roomId)
      if (roomIndex !== -1) {
        updatedFloors[floorIndex].rooms[roomIndex].occupants = [
          ...updatedFloors[floorIndex].rooms[roomIndex].occupants,
          ...group.members,
        ]
        setFloors(updatedFloors)
      }
    }

    // Remove from unassigned
    setUnassignedGroups(unassignedGroups.filter((g) => g.id !== groupId))
  }

  const handleRemoveOccupant = (floorName: string, roomId: string, occupantName: string) => {
    const updatedFloors = [...floors]
    const floorIndex = updatedFloors.findIndex((b) => b.name === floorName)

    if (floorIndex !== -1) {
      const roomIndex = updatedFloors[floorIndex].rooms.findIndex((r) => r.id === roomId)
      if (roomIndex !== -1) {
        updatedFloors[floorIndex].rooms[roomIndex].occupants = updatedFloors[floorIndex].rooms[
          roomIndex
        ].occupants.filter((o) => o !== occupantName)
        setFloors(updatedFloors)
      }
    }
  }

  const handleUpdateRoom = () => {
    if (!editingRoom || !editingFloor) return

    const updatedFloors = [...floors]
    const floorIndex = updatedFloors.findIndex((b) => b.name === editingFloor)

    if (floorIndex !== -1) {
      const roomIndex = updatedFloors[floorIndex].rooms.findIndex((r) => r.id === editingRoom.id)
      if (roomIndex !== -1) {
        updatedFloors[floorIndex].rooms[roomIndex] = editingRoom
        setFloors(updatedFloors)
      }
    }

    setEditingRoom(null)
    setEditingFloor(null)
    setDialogOpen(false)
  }

  const handleAddFloor = () => {
    if (newFloor.name.trim()) {
      setFloors([...floors, { ...newFloor, name: newFloor.name.trim() }])
      setNewFloor({ name: "", rooms: [] })
      setFloorDialogOpen(false)
    }
  }

  const handleAddRoom = () => {
    if (newRoom.id.trim() && selectedFloor) {
      const updatedFloors = [...floors]
      const floorIndex = updatedFloors.findIndex((b) => b.name === selectedFloor)

      if (floorIndex !== -1) {
        updatedFloors[floorIndex].rooms.push({ ...newRoom, id: newRoom.id.trim() })
        setFloors(updatedFloors)
      }

      setNewRoom({ id: "", beds: 2, occupants: [], notes: "" })
      setNewRoomDialogOpen(false)
    }
  }

  const handleUpdateSpecialNeeds = () => {
    if (!selectedGroup) return

    const updatedGroups = unassignedGroups.map((group) => (group.id === selectedGroup.id ? selectedGroup : group))

    setUnassignedGroups(updatedGroups)
    setSpecialNeedsDialogOpen(false)

    // Save special needs
    const specialNeeds: Record<number, { needsAccessible?: boolean; needsFirstFloor?: boolean; notes?: string }> = {}
    updatedGroups.forEach((group) => {
      specialNeeds[group.id] = group.specialNeeds
    })
    localStorage.setItem(SPECIAL_NEEDS_STORAGE_KEY, JSON.stringify(specialNeeds))
  }

  // Helper functions to get groups for specific rooms
  const getFloorRooms = (floorName: string) => {
    const floor = floors.find((b) => b.name === floorName)
    return floor ? floor.rooms : []
  }

  // Get the selected floor safely
  const selectedFloorData = floors.find((b) => b.name === selectedFloor)

  // Render the floor content based on the selected floor
  const renderFloorContent = () => {
    const floor = floors.find((b) => b.name === selectedFloor)
    if (!floor) return null

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
        {floor.rooms.map((room) => (
          <div
            key={room.id}
            className={`border rounded-lg p-3 md:p-6 bg-white shadow-sm ${
              room.accessible ? "border-blue-300" : ""
            } ${room.firstFloor ? "border-green-300" : ""}`}
          >
            <div className="flex justify-between items-start mb-3 md:mb-4">
              <div>
                <h3 className="text-lg md:text-xl font-semibold flex items-center gap-2">
                  Room {room.id}
                  {room.accessible && <span className="text-blue-500">♿</span>}
                  {room.firstFloor && <span className="text-green-500">1F</span>}
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
                    setEditingFloor(floor.name)
                    setDialogOpen(true)
                  }}
                >
                  <Edit className="h-3 w-3 md:h-4 md:w-4" />
                </Button>

                <Select
                  onValueChange={(value) => handleAssignRoom(floor.name, room.id, Number.parseInt(value))}
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
                          (group.specialNeeds.needsAccessible && !room.accessible) ||
                          (group.specialNeeds.needsFirstFloor && !room.firstFloor)
                        }
                      >
                        {group.name} ({group.members.length}){group.specialNeeds.needsAccessible && " ♿"}
                        {group.specialNeeds.needsFirstFloor && " 1F"}
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
                        onClick={() => handleRemoveOccupant(floor.name, room.id, occupant)}
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
        <h1 className="text-3xl font-bold mb-6">{language === "en" ? "Lodging" : "Hébergement"}</h1>
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
      <h1 className="text-3xl font-bold mb-6">{language === "en" ? "Lodging" : "Hébergement"}</h1>

      <DataStatus language={language} />

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Tabs value={selectedFloor} onValueChange={setSelectedFloor}>
            <TabsList className="mb-6 text-lg">
              {floors.map((floor) => (
                <TabsTrigger key={floor.name} value={floor.name} className="text-lg px-6 py-3">
                  {floor.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="flex gap-2">
            <Dialog open={newRoomDialogOpen} onOpenChange={setNewRoomDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
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
                    <Label htmlFor="roomId">{language === "en" ? "Room Number" : "Numéro de chambre"}</Label>
                    <Input
                      id="roomId"
                      value={newRoom.id}
                      onChange={(e) => setNewRoom({ ...newRoom, id: e.target.value })}
                      placeholder="e.g. 101"
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
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="firstFloor"
                      checked={newRoom.firstFloor || false}
                      onCheckedChange={(checked) => setNewRoom({ ...newRoom, firstFloor: checked === true })}
                    />
                    <Label htmlFor="firstFloor">
                      {language === "en" ? "First Floor Room" : "Chambre au premier étage"}
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

            <Dialog open={floorDialogOpen} onOpenChange={setFloorDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  {language === "en" ? "Add Floor" : "Ajouter un étage"}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="text-xl">
                    {language === "en" ? "Add New Floor" : "Ajouter un nouvel étage"}
                  </DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="floorName">{language === "en" ? "Floor Name" : "Nom de l'étage"}</Label>
                    <Input
                      id="floorName"
                      value={newFloor.name}
                      onChange={(e) => setNewFloor({ ...newFloor, name: e.target.value })}
                      placeholder="e.g. Floor 4"
                    />
                  </div>
                  <Button onClick={handleAddFloor}>{language === "en" ? "Add Floor" : "Ajouter l'étage"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Button
          onClick={saveChanges}
          disabled={isSaving || !hasUnsavedChanges}
          className={hasUnsavedChanges ? "bg-green-600 hover:bg-green-700" : ""}
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {language === "en" ? "Saving..." : "Enregistrement..."}
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {language === "en" ? "Save Changes" : "Enregistrer"}
            </>
          )}
        </Button>
      </div>

      {/* Floor Content */}
      <div className="mb-8">{selectedFloorData && renderFloorContent()}</div>

      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">{language === "en" ? "Unassigned Groups" : "Groupes non assignés"}</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {unassignedGroups.length > 0 ? (
            unassignedGroups.map((group) => (
              <div key={group.id} className="border rounded-lg p-4 bg-white shadow-sm">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  {group.name}
                  {group.specialNeeds.needsAccessible && <span className="text-blue-500">♿</span>}
                  {group.specialNeeds.needsFirstFloor && <span className="text-green-500">1F</span>}
                </h3>
                <p className="text-gray-600">
                  {group.members.length} {language === "en" ? "people" : "personnes"}
                </p>
                <ul className="list-disc ml-6 mt-2">
                  {group.members.map((member, idx) => (
                    <li key={idx}>{member}</li>
                  ))}
                </ul>
                {(group.specialNeeds.needsAccessible ||
                  group.specialNeeds.needsFirstFloor ||
                  group.specialNeeds.notes) && (
                  <div className="mt-2 text-sm">
                    {group.specialNeeds.needsAccessible && (
                      <p className="text-blue-600">
                        {language === "en" ? "Needs accessible room" : "Besoin d'une chambre accessible"}
                      </p>
                    )}
                    {group.specialNeeds.needsFirstFloor && (
                      <p className="text-green-600">
                        {language === "en" ? "Needs first floor room" : "Besoin d'une chambre au premier étage"}
                      </p>
                    )}
                    {group.specialNeeds.notes && (
                      <p className="text-gray-600 italic mt-1">{group.specialNeeds.notes}</p>
                    )}
                  </div>
                )}
                <div className="mt-3 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedGroup(group)
                      setSpecialNeedsDialogOpen(true)
                    }}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    {language === "en" ? "Special Needs" : "Besoins spéciaux"}
                  </Button>
                </div>
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
                <Label htmlFor="edit-roomId">{language === "en" ? "Room Number" : "Numéro de chambre"}</Label>
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
              <div className="flex items-center gap-2">
                <Checkbox
                  id="edit-firstFloor"
                  checked={editingRoom.firstFloor || false}
                  onCheckedChange={(checked) => setEditingRoom({ ...editingRoom, firstFloor: checked === true })}
                />
                <Label htmlFor="edit-firstFloor">
                  {language === "en" ? "First Floor Room" : "Chambre au premier étage"}
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

      {/* Special Needs Dialog */}
      <Dialog open={specialNeedsDialogOpen} onOpenChange={setSpecialNeedsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {language === "en" ? "Special Needs" : "Besoins spéciaux"} - {selectedGroup?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedGroup && (
            <div className="grid gap-4 py-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="needs-accessible"
                  checked={selectedGroup.specialNeeds.needsAccessible || false}
                  onCheckedChange={(checked) =>
                    setSelectedGroup({
                      ...selectedGroup,
                      specialNeeds: {
                        ...selectedGroup.specialNeeds,
                        needsAccessible: checked === true,
                      },
                    })
                  }
                />
                <Label htmlFor="needs-accessible">
                  {language === "en"
                    ? "Needs Wheelchair Accessible Room"
                    : "Besoin d'une chambre accessible en fauteuil roulant"}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="needs-firstFloor"
                  checked={selectedGroup.specialNeeds.needsFirstFloor || false}
                  onCheckedChange={(checked) =>
                    setSelectedGroup({
                      ...selectedGroup,
                      specialNeeds: {
                        ...selectedGroup.specialNeeds,
                        needsFirstFloor: checked === true,
                      },
                    })
                  }
                />
                <Label htmlFor="needs-firstFloor">
                  {language === "en" ? "Needs First Floor Room" : "Besoin d'une chambre au premier étage"}
                </Label>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="special-notes">
                  {language === "en" ? "Additional Notes" : "Notes supplémentaires"}
                </Label>
                <Input
                  id="special-notes"
                  value={selectedGroup.specialNeeds.notes || ""}
                  onChange={(e) =>
                    setSelectedGroup({
                      ...selectedGroup,
                      specialNeeds: {
                        ...selectedGroup.specialNeeds,
                        notes: e.target.value,
                      },
                    })
                  }
                  placeholder={language === "en" ? "Any special accommodation needs" : "Besoins d'hébergement spéciaux"}
                />
              </div>
              <Button onClick={handleUpdateSpecialNeeds}>{language === "en" ? "Save" : "Enregistrer"}</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
