import { google } from "googleapis"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Check if environment variables are set
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      console.error("GOOGLE_SERVICE_ACCOUNT_JSON environment variable is not set")
      return NextResponse.json({ error: "Google Service Account credentials not configured" }, { status: 500 })
    }

    if (!process.env.SPREADSHEET_ID) {
      console.error("SPREADSHEET_ID environment variable is not set")
      return NextResponse.json({ error: "Spreadsheet ID not configured" }, { status: 500 })
    }

    // Log the spreadsheet ID to help with debugging
    console.log("Using SPREADSHEET_ID:", process.env.SPREADSHEET_ID)

    // Parse your service account credentials from an environment variable
    let keys
    try {
      keys = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)

      // Validate the parsed credentials
      if (!keys.client_email || !keys.private_key) {
        throw new Error("Invalid service account credentials format")
      }
    } catch (parseError) {
      console.error("Error parsing Google Service Account JSON:", parseError)
      return NextResponse.json({ error: "Invalid Google Service Account credentials format" }, { status: 500 })
    }

    console.log("Creating JWT client with email:", keys.client_email)

    // Create a new client with the necessary scope
    const client = new google.auth.JWT(keys.client_email, null, keys.private_key, [
      "https://www.googleapis.com/auth/spreadsheets",
    ])

    // Authorize the client
    console.log("Authorizing Google Sheets client...")
    try {
      await client.authorize()
      console.log("Authorization successful")
    } catch (authError: any) {
      console.error("Google Sheets authorization error:", authError)
      return NextResponse.json({ error: `Google Sheets authorization failed: ${authError.message}` }, { status: 500 })
    }

    // Create a Sheets API client
    const sheets = google.sheets({ version: "v4", auth: client })
    const spreadsheetId = process.env.SPREADSHEET_ID

    // First, get the sheet names
    try {
      const sheetsResponse = await sheets.spreadsheets.get({
        spreadsheetId,
      })

      const availableSheets = sheetsResponse.data.sheets?.map((sheet) => sheet.properties?.title) || []
      console.log("Available sheets:", availableSheets)

      // Try to get data from the first sheet
      const firstSheetName = availableSheets[0]
      if (!firstSheetName) {
        return NextResponse.json({ error: "No sheets found in the spreadsheet" }, { status: 404 })
      }

      // Use a wide range to capture all data
      const range = `${firstSheetName}!A1:CZ1000`
      console.log(`Fetching data from sheet: ${firstSheetName}, range: ${range}`)

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      })

      if (!response.data.values || response.data.values.length === 0) {
        return NextResponse.json({ error: "No data found in the spreadsheet" }, { status: 404 })
      }

      console.log(
        `Data fetched successfully. Rows: ${response.data.values.length}, Columns: ${response.data.values[0].length}`,
      )

      return NextResponse.json({ data: response.data.values })
    } catch (error: any) {
      console.error("Google Sheets fetch error:", error)

      // Check for specific Google API errors
      if (error.code === 404) {
        return NextResponse.json({ error: "Spreadsheet not found. Check your SPREADSHEET_ID." }, { status: 404 })
      } else if (error.code === 403) {
        return NextResponse.json(
          { error: "Permission denied. Make sure your service account has access to the spreadsheet." },
          { status: 403 },
        )
      }

      return NextResponse.json({ error: `Failed to fetch spreadsheet data: ${error.message}` }, { status: 500 })
    }
  } catch (error: any) {
    console.error("Unexpected API error:", error)
    return NextResponse.json({ error: `Unexpected error: ${error.message}` }, { status: 500 })
  }
}
