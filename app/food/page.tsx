"use client"

import { useState, useEffect } from "react"
import DataStatus from "@/components/data-status"
import { Button } from "@/components/ui/button"
import { Printer, Edit, AlertTriangle } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { parseParticipants } from "@/lib/fetch-data"

// Meal type definition
interface Meal {
  meal: string
  adults: number
  students: number
  children814: number
  children27: number
  infants: number
  menu: string
  notes: string
}

export default function FoodPage() {
  const [language, setLanguage] = useState<"en" | "fr">("en")
  const [meals, setMeals] = useState<Meal[]>([
    {
      meal: "Saturday Lunch",
      adults: 0,
      students: 0,
      children814: 0,
      children27: 0,
      infants: 0,
      menu: "Sandwiches (Turkey, Ham, Vegetarian), Chips, Fruit, Cookies",
      notes: "Vegetarian options available. Gluten-free bread for those who requested it.",
    },
    {
      meal: "Saturday Dinner",
      adults: 0,
      students: 0,
      children814: 0,
      children27: 0,
      infants: 0,
      menu: "Pasta Bar (Spaghetti, Penne), Marinara and Meat Sauce, Garlic Bread, Salad, Ice Cream",
      notes: "Vegetarian sauce available. Gluten-free pasta option.",
    },
    {
      meal: "Sunday Breakfast",
      adults: 0,
      students: 0,
      children814: 0,
      children27: 0,
      infants: 0,
      menu: "Pancakes, Scrambled Eggs, Bacon, Fruit, Yogurt, Cereal",
      notes: "Vegan pancakes available upon request.",
    },
    {
      meal: "Sunday Lunch",
      adults: 0,
      students: 0,
      children814: 0,
      children27: 0,
      infants: 0,
      menu: "Tacos (Beef, Chicken), Rice, Beans, Toppings Bar",
      notes: "Vegetarian bean option available.",
    },
  ])
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [additionalNotes, setAdditionalNotes] = useState(
    "Desserts to be brought: 3 people will bring desserts, totaling ~25 servings.",
  )
  const [editingNotes, setEditingNotes] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch data directly in the component
  useEffect(() => {
    async function fetchData() {
      try {
        console.log("Fetching data for food page")
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
        console.log("Parsed participants:", parsedParticipants.length)

        // Count participants by age group
        const adultCount = parsedParticipants.filter((p) => p.ageGroup === "adult").length
        const studentCount = parsedParticipants.filter((p) => p.ageGroup === "student-15+").length
        const children814Count = parsedParticipants.filter((p) => p.ageGroup === "child-8-14").length
        const children27Count = parsedParticipants.filter((p) => p.ageGroup === "child-2-7").length
        const infantCount = parsedParticipants.filter((p) => p.ageGroup === "infant-0-2").length

        console.log("Counts by age group:", {
          adults: adultCount,
          students: studentCount,
          children814: children814Count,
          children27: children27Count,
          infants: infantCount,
        })

        // Update meal counts
        const updatedMeals = meals.map((meal) => ({
          ...meal,
          adults: adultCount,
          students: studentCount,
          children814: children814Count,
          children27: children27Count,
          infants: infantCount,
        }))

        setMeals(updatedMeals)
        setIsLoading(false)
      } catch (err) {
        console.error("Error fetching data:", err)
        setError(err instanceof Error ? err.message : String(err))
        setIsLoading(false)
      }
    }

    fetchData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const calculateTotal = (meal: Meal) => {
    return meal.adults + meal.students + meal.children814 + meal.children27 + meal.infants
  }

  const handlePrint = () => {
    window.print()
  }

  const handleUpdateMeal = () => {
    if (!editingMeal) return

    const updatedMeals = meals.map((meal) => (meal.meal === editingMeal.meal ? editingMeal : meal))
    setMeals(updatedMeals)
    setEditingMeal(null)
    setDialogOpen(false)
  }

  const handleUpdateNotes = () => {
    setEditingNotes(false)
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
        <h1 className="text-3xl font-bold mb-6">{language === "en" ? "Food" : "Repas"}</h1>
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
      <h1 className="text-3xl font-bold mb-6">{language === "en" ? "Food" : "Repas"}</h1>

      <DataStatus language={language} />

      <div className="flex justify-end mb-4">
        <Button onClick={handlePrint} size="lg" className="text-lg">
          <Printer className="mr-2 h-5 w-5" />
          {language === "en" ? "Print Meal Plan" : "Imprimer le plan de repas"}
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden responsive-table-container">
        <table className="w-full text-sm md:text-lg responsive-table">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left font-medium text-gray-500">
                {language === "en" ? "Meal Event" : "Repas"}
              </th>
              <th className="px-6 py-4 text-center font-medium text-gray-500">
                {language === "en" ? "Adults" : "Adultes"}
              </th>
              <th className="px-6 py-4 text-center font-medium text-gray-500">
                {language === "en" ? "Students (15+)" : "Étudiants (15+)"}
              </th>
              <th className="px-6 py-4 text-center font-medium text-gray-500">
                {language === "en" ? "Children 8-14" : "Enfants 8-14"}
              </th>
              <th className="px-6 py-4 text-center font-medium text-gray-500">
                {language === "en" ? "Children 2-7" : "Enfants 2-7"}
              </th>
              <th className="px-6 py-4 text-center font-medium text-gray-500">
                {language === "en" ? "Infants 0-2" : "Bébés 0-2"}
              </th>
              <th className="px-6 py-4 text-center font-medium text-gray-500">
                {language === "en" ? "Total" : "Total"}
              </th>
              <th className="px-6 py-4 text-center font-medium text-gray-500">
                {language === "en" ? "Actions" : "Actions"}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {meals.map((meal, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? "bg-gray-50" : ""}>
                <td className="px-6 py-4 font-medium">{meal.meal}</td>
                <td className="px-6 py-4 text-center font-bold">{meal.adults}</td>
                <td className="px-6 py-4 text-center font-bold">{meal.students}</td>
                <td className="px-6 py-4 text-center font-bold">{meal.children814}</td>
                <td className="px-6 py-4 text-center font-bold">{meal.children27}</td>
                <td className="px-6 py-4 text-center font-bold">{meal.infants}</td>
                <td className="px-6 py-4 text-center font-bold">{calculateTotal(meal)}</td>
                <td className="px-6 py-4 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingMeal(meal)
                      setDialogOpen(true)
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 md:mt-8 space-y-4 md:space-y-6">
        {meals.map((meal, idx) => (
          <div key={idx} className="bg-white p-4 md:p-6 rounded-lg shadow-sm border">
            <div className="flex justify-between items-start">
              <h2 className="text-lg md:text-xl font-bold mb-2">{meal.meal}</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingMeal(meal)
                  setDialogOpen(true)
                }}
              >
                <Edit className="h-3 w-3 md:h-4 md:w-4" />
              </Button>
            </div>
            <div className="mb-3 md:mb-4">
              <h3 className="text-base md:text-lg font-medium mb-1">{language === "en" ? "Menu" : "Menu"}</h3>
              <p className="text-sm md:text-lg">{meal.menu}</p>
            </div>
            {meal.notes && (
              <div>
                <h3 className="text-base md:text-lg font-medium mb-1">{language === "en" ? "Notes" : "Notes"}</h3>
                <p className="text-sm md:text-lg text-gray-700">{meal.notes}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex justify-between items-start">
          <h2 className="text-xl font-bold mb-4">
            {language === "en" ? "Additional Meal Information" : "Informations supplémentaires sur les repas"}
          </h2>
          <Button variant="ghost" size="sm" onClick={() => setEditingNotes(true)}>
            <Edit className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-lg">{additionalNotes}</p>
      </div>

      {/* Edit Meal Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {language === "en" ? `Edit ${editingMeal?.meal}` : `Modifier ${editingMeal?.meal}`}
            </DialogTitle>
          </DialogHeader>
          {editingMeal && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="menu">{language === "en" ? "Menu" : "Menu"}</Label>
                <Textarea
                  id="menu"
                  value={editingMeal.menu}
                  onChange={(e) => setEditingMeal({ ...editingMeal, menu: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">{language === "en" ? "Notes" : "Notes"}</Label>
                <Textarea
                  id="notes"
                  value={editingMeal.notes}
                  onChange={(e) => setEditingMeal({ ...editingMeal, notes: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-5 gap-4">
                <div>
                  <Label htmlFor="adults">{language === "en" ? "Adults" : "Adultes"}</Label>
                  <input
                    id="adults"
                    type="number"
                    min="0"
                    value={editingMeal.adults}
                    onChange={(e) => setEditingMeal({ ...editingMeal, adults: Number.parseInt(e.target.value) || 0 })}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <Label htmlFor="students">{language === "en" ? "Students" : "Étudiants"}</Label>
                  <input
                    id="students"
                    type="number"
                    min="0"
                    value={editingMeal.students}
                    onChange={(e) => setEditingMeal({ ...editingMeal, students: Number.parseInt(e.target.value) || 0 })}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <Label htmlFor="children814">{language === "en" ? "Children 8-14" : "Enfants 8-14"}</Label>
                  <input
                    id="children814"
                    type="number"
                    min="0"
                    value={editingMeal.children814}
                    onChange={(e) =>
                      setEditingMeal({ ...editingMeal, children814: Number.parseInt(e.target.value) || 0 })
                    }
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <Label htmlFor="children27">{language === "en" ? "Children 2-7" : "Enfants 2-7"}</Label>
                  <input
                    id="children27"
                    type="number"
                    min="0"
                    value={editingMeal.children27}
                    onChange={(e) =>
                      setEditingMeal({ ...editingMeal, children27: Number.parseInt(e.target.value) || 0 })
                    }
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <Label htmlFor="infants">{language === "en" ? "Infants 0-2" : "Bébés 0-2"}</Label>
                  <input
                    id="infants"
                    type="number"
                    min="0"
                    value={editingMeal.infants}
                    onChange={(e) => setEditingMeal({ ...editingMeal, infants: Number.parseInt(e.target.value) || 0 })}
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>
              <Button onClick={handleUpdateMeal}>
                {language === "en" ? "Save Changes" : "Enregistrer les modifications"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Additional Notes Dialog */}
      <Dialog open={editingNotes} onOpenChange={setEditingNotes}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {language === "en" ? "Edit Additional Notes" : "Modifier les notes supplémentaires"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="additionalNotes">
                {language === "en" ? "Additional Notes" : "Notes supplémentaires"}
              </Label>
              <Textarea
                id="additionalNotes"
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                rows={5}
              />
            </div>
            <Button onClick={handleUpdateNotes}>
              {language === "en" ? "Save Changes" : "Enregistrer les modifications"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
