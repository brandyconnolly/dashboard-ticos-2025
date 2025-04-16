"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Database, Globe, Smartphone, Monitor, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/hooks/use-language"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { getTranslation } from "@/lib/translations"
// Import the storage utility function
import { clearStoredData } from "@/lib/storage-utils"

export default function SettingsPage() {
  const { language, changeLanguage } = useLanguage()
  const [viewMode, setViewMode] = useLocalStorage<"desktop" | "mobile">("view-mode", "desktop")
  const [debugResult, setDebugResult] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleRefreshData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/update-data")
      const data = await response.json()
      setDebugResult(JSON.stringify(data, null, 2))
    } catch (error) {
      setDebugResult(`Error: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCheckEnv = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/check-env")
      const data = await response.json()
      setDebugResult(JSON.stringify(data, null, 2))
    } catch (error) {
      setDebugResult(`Error: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Add a function to handle clearing all data
  const handleClearAllData = () => {
    if (window.confirm(getTranslation("confirm_clear_data", language))) {
      clearStoredData()
      window.location.reload() // Reload the page to fetch fresh data
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">{getTranslation("settings", language)}</h1>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="general">{getTranslation("general", language)}</TabsTrigger>
          <TabsTrigger value="debug">{getTranslation("debug", language)}</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{getTranslation("language", language)}</CardTitle>
                <CardDescription>{getTranslation("language_description", language)}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <Button
                    variant={language === "en" ? "default" : "outline"}
                    onClick={() => changeLanguage("en")}
                    className="flex-1"
                  >
                    <Globe className="mr-2 h-4 w-4" />
                    English
                  </Button>
                  <Button
                    variant={language === "fr" ? "default" : "outline"}
                    onClick={() => changeLanguage("fr")}
                    className="flex-1"
                  >
                    <Globe className="mr-2 h-4 w-4" />
                    Français
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{getTranslation("view_mode", language)}</CardTitle>
                <CardDescription>{getTranslation("view_mode_description", language)}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-5 w-5" />
                      <Label htmlFor="desktop-mode">{getTranslation("desktop_mode", language)}</Label>
                    </div>
                    <Switch
                      id="desktop-mode"
                      checked={viewMode === "desktop"}
                      onCheckedChange={() => setViewMode("desktop")}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-5 w-5" />
                      <Label htmlFor="mobile-mode">{getTranslation("mobile_mode", language)}</Label>
                    </div>
                    <Switch
                      id="mobile-mode"
                      checked={viewMode === "mobile"}
                      onCheckedChange={() => setViewMode("mobile")}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{getTranslation("data_management", language)}</CardTitle>
                <CardDescription>{getTranslation("data_management_description", language)}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <Button variant="destructive" onClick={handleClearAllData}>
                    {getTranslation("clear_all_data", language)}
                  </Button>
                  <p className="text-sm text-gray-500">{getTranslation("clear_data_warning", language)}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="debug">
          <Card>
            <CardHeader>
              <CardTitle>{getTranslation("debug_tools", language)}</CardTitle>
              <CardDescription>{getTranslation("debug_tools_description", language)}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="flex gap-2">
                  <Button onClick={handleRefreshData} disabled={isLoading} className="flex-1">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {getTranslation("refresh_data", language)}
                  </Button>
                  <Button onClick={handleCheckEnv} disabled={isLoading} variant="outline" className="flex-1">
                    <Database className="mr-2 h-4 w-4" />
                    {getTranslation("check_environment", language)}
                  </Button>
                </div>

                <Link href="/api-test">
                  <Button variant="outline" className="w-full">
                    {getTranslation("api_test_page", language)}
                  </Button>
                </Link>

                {debugResult && (
                  <div className="mt-4">
                    <h3 className="text-lg font-medium mb-2">{getTranslation("result", language)}</h3>
                    <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-96 text-sm">{debugResult}</pre>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
