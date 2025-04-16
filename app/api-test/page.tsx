"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { parseParticipants, parseFamilies } from "@/lib/fetch-data"

export default function ApiTestPage() {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [responseDetails, setResponseDetails] = useState<any>(null)
  const [envData, setEnvData] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("response")
  const [sheetStructure, setSheetStructure] = useState<any>(null)
  const [parsedData, setParsedData] = useState<any>(null)

  const testApi = async () => {
    setLoading(true)
    setError(null)
    setData(null)
    setResponseDetails(null)
    setSheetStructure(null)
    setParsedData(null)
    setActiveTab("response")

    try {
      const response = await fetch("/api/update-data")

      // Capture response details regardless of success/failure
      setResponseDetails({
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(
          `API returned status: ${response.status} ${response.statusText}${
            errorData?.error ? ` - ${errorData.error}` : ""
          }`,
        )
      }

      const result = await response.json()
      setData(result)

      // Analyze sheet structure if data is available
      if (result.data && Array.isArray(result.data) && result.data.length > 0) {
        analyzeSheetStructure(result.data)

        // Try to parse the data
        try {
          const participants = parseParticipants(result.data)
          const families = parseFamilies(result.data)

          setParsedData({
            participants,
            families,
          })

          setActiveTab("parsed")
        } catch (parseError) {
          console.error("Error parsing data:", parseError)
        }
      }
    } catch (err) {
      console.error("API test error:", err)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  const analyzeSheetStructure = (data: any[][]) => {
    if (!data || data.length === 0) return

    const headers = data[0]
    const structure = {
      rowCount: data.length,
      columnCount: headers.length,
      headers: headers,
      partySizeColumn: headers.findIndex((h) => h && h.includes("How many people are in your party")),
      sampleRows: data.slice(1, 4), // Get a few sample rows
    }

    setSheetStructure(structure)
  }

  const checkEnvVariables = async () => {
    setLoading(true)
    setError(null)
    setEnvData(null)
    setActiveTab("env")

    try {
      const response = await fetch("/api/check-env")
      const result = await response.json()
      setEnvData(result)
    } catch (err) {
      console.error("Environment check error:", err)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">API Test Page</h1>
      <p className="mb-4">Use this page to test the connection to the Google Sheets API and diagnose any issues.</p>

      <div className="flex flex-wrap gap-4 mb-6">
        <Button onClick={testApi} disabled={loading} variant="default">
          {loading ? "Testing..." : "Test Google Sheets API"}
        </Button>
        <Button onClick={checkEnvVariables} disabled={loading} variant="outline">
          {loading ? "Checking..." : "Check Environment Variables"}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="whitespace-pre-wrap">{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="response">API Response</TabsTrigger>
          <TabsTrigger value="details">Response Details</TabsTrigger>
          <TabsTrigger value="structure">Sheet Structure</TabsTrigger>
          <TabsTrigger value="parsed">Parsed Data</TabsTrigger>
          <TabsTrigger value="env">Environment</TabsTrigger>
        </TabsList>

        <TabsContent value="response">
          {data ? (
            <Card>
              <CardHeader>
                <CardTitle>API Response</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
                  <pre>{JSON.stringify(data, null, 2)}</pre>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p>Click "Test Google Sheets API" to see the API response.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="details">
          {responseDetails ? (
            <Card>
              <CardHeader>
                <CardTitle>Response Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
                  <pre>{JSON.stringify(responseDetails, null, 2)}</pre>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p>Click "Test Google Sheets API" to see response details.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="structure">
          {sheetStructure ? (
            <Card>
              <CardHeader>
                <CardTitle>Sheet Structure Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Sheet Overview</h3>
                    <p>Total rows: {sheetStructure.rowCount}</p>
                    <p>Total columns: {sheetStructure.columnCount}</p>
                    <p>Party size column index: {sheetStructure.partySizeColumn}</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-2">Headers (First 10)</h3>
                    <div className="bg-gray-100 p-4 rounded overflow-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr>
                            <th className="px-4 py-2 text-left">Column</th>
                            <th className="px-4 py-2 text-left">Header</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sheetStructure.headers.slice(0, 10).map((header: any, index: number) => (
                            <tr key={index} className="border-t">
                              <td className="px-4 py-2">{index}</td>
                              <td className="px-4 py-2">{header}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-2">Sample Data (First Row)</h3>
                    <div className="bg-gray-100 p-4 rounded overflow-auto">
                      {sheetStructure.sampleRows.length > 0 ? (
                        <div>
                          <p>Party Size: {sheetStructure.sampleRows[0][sheetStructure.partySizeColumn]}</p>
                          <p>Email: {sheetStructure.sampleRows[0][1]}</p>
                        </div>
                      ) : (
                        <p>No sample data available</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p>Click "Test Google Sheets API" to analyze the sheet structure.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="parsed">
          {parsedData ? (
            <Card>
              <CardHeader>
                <CardTitle>Parsed Data</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Participants ({parsedData.participants.length})</h3>
                    <div className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
                      <pre>{JSON.stringify(parsedData.participants, null, 2)}</pre>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-2">Families ({parsedData.families.length})</h3>
                    <div className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
                      <pre>{JSON.stringify(parsedData.families, null, 2)}</pre>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p>Click "Test Google Sheets API" to see parsed data.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="env">
          {envData ? (
            <Card>
              <CardHeader>
                <CardTitle>Environment Variables Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
                  <pre>{JSON.stringify(envData, null, 2)}</pre>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p>Click "Check Environment Variables" to see the status of your environment configuration.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Troubleshooting Tips</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            Make sure the <code>GOOGLE_SERVICE_ACCOUNT_JSON</code> environment variable is set with the full JSON
            content of your service account key.
          </li>
          <li>
            Verify that the <code>SPREADSHEET_ID</code> environment variable is set with the correct ID from your Google
            Sheet URL.
          </li>
          <li>
            Ensure your service account has been granted access to the Google Sheet (share the sheet with the service
            account email).
          </li>
          <li>
            Your sheet has a complex structure with party sizes. The parser will try to extract participants and
            families based on the party size column.
          </li>
        </ul>
      </div>
    </div>
  )
}
