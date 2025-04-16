"use client"

import { useState, useEffect } from "react"
import { AlertTriangle } from "lucide-react"
import Link from "next/link"

export default function TeamsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Simple timeout to simulate data loading
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-lg">Loading data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Team Assignments</h1>
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
      <h1 className="text-3xl font-bold mb-6">Team Assignments</h1>

      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <p className="text-lg">
          This is a simplified version of the Teams page. We're working on resolving the client-side exception.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-bold mb-4">Functional Teams</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Setup Crew</li>
            <li>Cleanup Crew</li>
            <li>Food Committee</li>
            <li>Transportation Team</li>
            <li>Prayer Team</li>
            <li>Worship Team</li>
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-bold mb-4">Color Teams</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Red Team</li>
            <li>Blue Team</li>
            <li>Green Team</li>
            <li>Yellow Team</li>
            <li>Purple Team</li>
            <li>Orange Team</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
