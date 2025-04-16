"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, CheckCircle, AlertTriangle, ExternalLink } from "lucide-react"
import { fetchSheetData } from "@/lib/fetch-data"
import Link from "next/link"

// Import the storage utility functions
import {
  saveParticipantsToStorage,
  saveFamiliesToStorage,
  clearStoredData,
  getLastUpdatedFromStorage,
} from "@/lib/storage-utils"

// Import the parsing functions
import { parseParticipants, parseFamilies } from "@/lib/data-parser"

// Import the useLanguage hook
import { useLanguage } from "@/hooks/use-language"

interface DataStatusProps {
  language?: "en" | "fr"
  onDataUpdate?: (data: any) => void
}

// Update the component to include the last updated time from localStorage
export default function DataStatus({ language: propLanguage, onDataUpdate }: DataStatusProps) {
  const { language: hookLanguage } = useLanguage()
  const language = propLanguage || hookLanguage

  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [isConnected, setIsConnected] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    // Try to get the last updated time from localStorage
    const storedLastUpdated = getLastUpdatedFromStorage()
    if (storedLastUpdated) {
      setLastUpdated(storedLastUpdated)
      setIsConnected(true)
      setInitialLoadComplete(true)
    }
  }, [])

  const updateData = async () => {
    console.log("updateData called in DataStatus component")
    setIsUpdating(true)
    setError(null)

    try {
      // Clear stored data to force a fresh fetch
      clearStoredData()

      console.log("Fetching data from API...")
      const data = await fetchSheetData()

      if (!data) {
        throw new Error("No data returned from API")
      }

      console.log("Data fetched successfully:", data.length, "rows")

      // Parse the data
      const parsedParticipants = parseParticipants(data)
      const parsedFamilies = parseFamilies(data)

      // Save to localStorage
      saveParticipantsToStorage(parsedParticipants)
      saveFamiliesToStorage(parsedFamilies)

      // Update last updated time
      const now = new Date()
      setLastUpdated(now)

      setIsConnected(true)

      // Call the callback with the fetched data
      if (onDataUpdate) {
        try {
          console.log("Calling onDataUpdate callback with data")
          onDataUpdate(data)
        } catch (callbackError) {
          console.error("Error in onDataUpdate callback:", callbackError)
          setError(
            `Error processing data: ${callbackError instanceof Error ? callbackError.message : String(callbackError)}`,
          )
          setIsConnected(false)
        }
      } else {
        console.log("No onDataUpdate callback provided")
      }
    } catch (err) {
      console.error("Error updating data:", err)
      setIsConnected(false)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsUpdating(false)
      setInitialLoadComplete(true)
    }
  }

  // Fetch data on component mount
  useEffect(() => {
    if (isMounted && !initialLoadComplete && !isUpdating) {
      updateData()
    }
  }, [isMounted]) // eslint-disable-line react-hooks/exhaustive-deps

  const formattedDate = lastUpdated.toLocaleDateString(language === "en" ? "en-US" : "fr-FR", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  const formattedTime = lastUpdated.toLocaleTimeString(language === "en" ? "en-US" : "fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-gray-100 p-3 md:p-4 rounded-lg mb-4 md:mb-6">
      <div className="flex items-start mb-3 md:mb-0 w-full md:w-auto">
        {isConnected ? (
          <CheckCircle className="h-5 w-5 md:h-6 md:w-6 text-green-500 mr-2 mt-1 flex-shrink-0" />
        ) : (
          <AlertTriangle className="h-5 w-5 md:h-6 md:w-6 text-red-500 mr-2 mt-1 flex-shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-base md:text-lg font-medium truncate">
            {isConnected
              ? language === "en"
                ? "✅ Connected"
                : "✅ Connecté"
              : language === "en"
                ? "⚠️ Offline"
                : "⚠️ Hors ligne"}
          </p>
          <p className="text-xs md:text-sm text-gray-600 truncate">
            {language === "en"
              ? `Last Updated: ${formattedDate} - ${formattedTime}`
              : `Dernière mise à jour: ${formattedDate} - ${formattedTime}`}
          </p>
          {error && (
            <div className="mt-1">
              <p className="text-xs md:text-sm text-red-600 truncate">{error}</p>
              <Link href="/api-test" className="text-xs md:text-sm text-blue-600 flex items-center mt-1">
                <span>Go to API Test Page</span>
                <ExternalLink className="h-3 w-3 ml-1" />
              </Link>
            </div>
          )}
          {!initialLoadComplete && (
            <p className="text-xs md:text-sm text-blue-600 mt-1 truncate">
              {language === "en" ? "Initial data load in progress..." : "Chargement initial des données en cours..."}
            </p>
          )}
        </div>
      </div>
      <Button onClick={updateData} disabled={isUpdating} size="sm" className="text-sm md:text-lg w-full md:w-auto">
        <RefreshCw className={`mr-1 md:mr-2 h-4 w-4 md:h-5 md:w-5 ${isUpdating ? "animate-spin" : ""}`} />
        {language === "en" ? "Update Now" : "Mettre à jour"}
      </Button>
    </div>
  )
}
