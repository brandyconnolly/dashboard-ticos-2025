"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, DollarSign, Search } from "lucide-react"
import Link from "next/link"
import DataStatus from "@/components/data-status"
import { parseParticipants, parseFamilies } from "@/lib/fetch-data"
import type { Family, Participant } from "@/lib/types"
import { useLanguage } from "@/hooks/use-language"
import { getTranslation } from "@/lib/translations"

export default function PaymentsPage() {
  const { language } = useLanguage()
  const [participants, setParticipants] = useState<Participant[]>([])
  const [families, setFamilies] = useState<Family[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  // Mock payment data - in a real app, this would come from your database
  const [payments, setPayments] = useState<Record<string, { paid: boolean; amount: number; supportDonation: number }>>(
    {},
  )

  // Fetch data directly in the component
  useEffect(() => {
    async function fetchData() {
      try {
        console.log("Fetching data for payments page")
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

        // Initialize mock payment data
        const initialPayments: Record<string, { paid: boolean; amount: number; supportDonation: number }> = {}
        parsedParticipants.forEach((p) => {
          // Set random payment amounts based on age group
          let amount = 0
          switch (p.ageGroup) {
            case "adult":
              amount = 150
              break
            case "student-15+":
              amount = 100
              break
            case "child-8-14":
              amount = 75
              break
            case "child-2-7":
              amount = 50
              break
            case "infant-0-2":
              amount = 0
              break
          }

          initialPayments[p.id] = {
            paid: Math.random() > 0.7, // 30% chance of being unpaid
            amount,
            supportDonation: Math.random() > 0.8 ? Math.floor(Math.random() * 50) : 0, // 20% chance of donation
          }
        })

        // Update state
        setParticipants(parsedParticipants)
        setFamilies(parsedFamilies)
        setPayments(initialPayments)
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

  // Filter participants based on search term
  const filteredParticipants = participants
    .filter((participant) => {
      // Filter by search term
      return (
        searchTerm === "" ||
        participant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (participant.email && participant.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (participant.phone && participant.phone.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    })
    // Sort by family name or last name
    .sort((a, b) => {
      const familyA = families.find((f) => f.id === a.familyId)?.name || getLastName(a.name)
      const familyB = families.find((f) => f.id === b.familyId)?.name || getLastName(b.name)
      return familyA.localeCompare(familyB)
    })

  // Get family name for a participant
  const getFamilyName = (familyId: number) => {
    const family = families.find((f) => f.id === familyId)
    return family ? family.name : ""
  }

  // Calculate payment statistics
  const totalDue = Object.values(payments).reduce((sum, p) => sum + p.amount, 0)
  const totalPaid = Object.values(payments).reduce((sum, p) => sum + (p.paid ? p.amount : 0), 0)
  const totalUnpaid = totalDue - totalPaid
  const totalSupportDonations = Object.values(payments).reduce((sum, p) => sum + p.supportDonation, 0)

  // Mark participant as paid
  const markAsPaid = (participantId: string) => {
    setPayments((prev) => ({
      ...prev,
      [participantId]: {
        ...prev[participantId],
        paid: true,
      },
    }))
  }

  // Add support donation
  const addSupportDonation = (participantId: string, amount: number) => {
    setPayments((prev) => ({
      ...prev,
      [participantId]: {
        ...prev[participantId],
        supportDonation: prev[participantId].supportDonation + amount,
      },
    }))
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
        <h1 className="text-3xl font-bold mb-6">{getTranslation("payments", language)}</h1>
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
      <h1 className="text-3xl font-bold mb-6">{getTranslation("payments", language)}</h1>

      <DataStatus />

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium">Total Due</h3>
                <p className="text-3xl font-bold">${totalDue}</p>
              </div>
              <DollarSign className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium">Total Paid</h3>
                <p className="text-3xl font-bold text-green-600">${totalPaid}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium">Outstanding</h3>
                <p className="text-3xl font-bold text-red-600">${totalUnpaid}</p>
              </div>
              <DollarSign className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium">Support Donations</h3>
                <p className="text-3xl font-bold text-blue-600">${totalSupportDonations}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex justify-end mb-6">
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

      {/* Payments Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="w-full text-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left font-medium text-gray-500">Name</th>
              <th className="px-6 py-4 text-left font-medium text-gray-500">Family</th>
              <th className="px-6 py-4 text-left font-medium text-gray-500">Age Group</th>
              <th className="px-6 py-4 text-center font-medium text-gray-500">Amount Due</th>
              <th className="px-6 py-4 text-center font-medium text-gray-500">Status</th>
              <th className="px-6 py-4 text-center font-medium text-gray-500">Support Donation</th>
              <th className="px-6 py-4 text-center font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredParticipants.map((participant) => {
              const payment = payments[participant.id] || { paid: false, amount: 0, supportDonation: 0 }
              return (
                <tr key={participant.id} className="hover:bg-gray-50">
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
                  <td className="px-6 py-4 text-center">${payment.amount}</td>
                  <td className="px-6 py-4 text-center">
                    {payment.paid ? (
                      <Badge className="bg-green-100 text-green-800">Paid</Badge>
                    ) : (
                      <Badge variant="outline" className="text-red-500">
                        Unpaid
                      </Badge>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {payment.supportDonation > 0 ? (
                      <span className="text-blue-600">${payment.supportDonation}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {!payment.paid && (
                      <Button size="sm" onClick={() => markAsPaid(participant.id)}>
                        Mark as Paid
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="ml-2"
                      onClick={() => addSupportDonation(participant.id, 10)}
                    >
                      Add Donation
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
