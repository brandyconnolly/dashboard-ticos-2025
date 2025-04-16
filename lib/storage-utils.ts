import type { Participant, Family } from "@/lib/types"

// Keys for localStorage
const PARTICIPANTS_STORAGE_KEY = "retreat-participants"
const FAMILIES_STORAGE_KEY = "retreat-families"
const LAST_UPDATED_KEY = "retreat-data-last-updated"

// Helper function to check if we're in a browser environment
const isBrowser = typeof window !== "undefined"

// Save participants to localStorage
export function saveParticipantsToStorage(participants: Participant[]): void {
  if (!isBrowser) return

  try {
    localStorage.setItem(PARTICIPANTS_STORAGE_KEY, JSON.stringify(participants))
    // Update the last updated timestamp
    localStorage.setItem(LAST_UPDATED_KEY, new Date().toISOString())
  } catch (error) {
    console.error("Error saving participants to localStorage:", error)
  }
}

// Save families to localStorage
export function saveFamiliesToStorage(families: Family[]): void {
  if (!isBrowser) return

  try {
    localStorage.setItem(FAMILIES_STORAGE_KEY, JSON.stringify(families))
    // Update the last updated timestamp
    localStorage.setItem(LAST_UPDATED_KEY, new Date().toISOString())
  } catch (error) {
    console.error("Error saving families to localStorage:", error)
  }
}

// Get participants from localStorage
export function getParticipantsFromStorage(): Participant[] | null {
  if (!isBrowser) return null

  try {
    const data = localStorage.getItem(PARTICIPANTS_STORAGE_KEY)
    return data ? JSON.parse(data) : null
  } catch (error) {
    console.error("Error getting participants from localStorage:", error)
    return null
  }
}

// Get families from localStorage
export function getFamiliesFromStorage(): Family[] | null {
  if (!isBrowser) return null

  try {
    const data = localStorage.getItem(FAMILIES_STORAGE_KEY)
    return data ? JSON.parse(data) : null
  } catch (error) {
    console.error("Error getting families from localStorage:", error)
    return null
  }
}

// Get last updated timestamp
export function getLastUpdatedFromStorage(): Date | null {
  if (!isBrowser) return null

  try {
    const timestamp = localStorage.getItem(LAST_UPDATED_KEY)
    return timestamp ? new Date(timestamp) : null
  } catch (error) {
    console.error("Error getting last updated timestamp from localStorage:", error)
    return null
  }
}

// Clear all stored data
export function clearStoredData(): void {
  if (!isBrowser) return

  try {
    localStorage.removeItem(PARTICIPANTS_STORAGE_KEY)
    localStorage.removeItem(FAMILIES_STORAGE_KEY)
    localStorage.removeItem(LAST_UPDATED_KEY)
  } catch (error) {
    console.error("Error clearing stored data:", error)
  }
}
