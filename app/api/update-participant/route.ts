import { NextResponse } from "next/server"
import type { Participant } from "@/lib/types"
import { google } from "googleapis"

export async function POST(request: Request) {
  try {
    // Parse the request body
    const participant = (await request.json()) as Participant

    if (!participant || !participant.id) {
      return NextResponse.json({ error: "Invalid participant data" }, { status: 400 })
    }

    console.log("Updating participant in spreadsheet:", participant)

    // Check if environment variables are set
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      console.error("GOOGLE_SERVICE_ACCOUNT_JSON environment variable is not set")
      return NextResponse.json({ error: "Google Service Account credentials not configured" }, { status: 500 })
    }

    if (!process.env.SPREADSHEET_ID) {
      console.error("SPREADSHEET_ID environment variable is not set")
      return NextResponse.json({ error: "Spreadsheet ID not configured" }, { status: 500 })
    }

    // Parse your service account credentials
    const keys = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)

    // Create a new client
    const client = new google.auth.JWT(keys.client_email, null, keys.private_key, [
      "https://www.googleapis.com/auth/spreadsheets",
    ])

    // Authorize the client
    await client.authorize()

    // Create a Sheets API client
    const sheets = google.sheets({ version: "v4", auth: client })
    const spreadsheetId = process.env.SPREADSHEET_ID

    // Get the sheet data to find the participant's row
    const sheetsResponse = await sheets.spreadsheets.get({
      spreadsheetId,
    })

    const firstSheetName = sheetsResponse.data.sheets?.[0].properties?.title

    if (!firstSheetName) {
      return NextResponse.json({ error: "No sheets found in the spreadsheet" }, { status: 404 })
    }

    // Get all data to find the participant
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${firstSheetName}!A1:CZ1000`,
    })

    if (!response.data.values || response.data.values.length === 0) {
      return NextResponse.json({ error: "No data found in the spreadsheet" }, { status: 404 })
    }

    // Extract the participant ID from the format "p{rowIndex}_{personNum}"
    const idParts = participant.id.match(/p(\d+)_(\d+)/)
    if (!idParts) {
      return NextResponse.json({ error: "Invalid participant ID format" }, { status: 400 })
    }

    const rowIndex = Number.parseInt(idParts[1])
    const personNum = Number.parseInt(idParts[2])

    if (isNaN(rowIndex) || isNaN(personNum) || rowIndex < 1) {
      return NextResponse.json({ error: "Invalid participant ID values" }, { status: 400 })
    }

    // Add a new column for tracking check-in status if it doesn't exist
    const headers = response.data.values[0]
    let checkedInColumnIndex = headers.findIndex((h) => h === "CheckedIn")
    let rolesColumnIndex = headers.findIndex((h) => h === "Roles")
    let colorTeamColumnIndex = headers.findIndex((h) => h === "ColorTeam")

    // If columns don't exist, create them
    const updates = []

    if (checkedInColumnIndex === -1) {
      checkedInColumnIndex = headers.length
      updates.push({
        range: `${firstSheetName}!${columnToLetter(checkedInColumnIndex + 1)}1`,
        values: [["CheckedIn"]],
      })
      headers.push("CheckedIn")
    }

    if (rolesColumnIndex === -1) {
      rolesColumnIndex = headers.length
      updates.push({
        range: `${firstSheetName}!${columnToLetter(rolesColumnIndex + 1)}1`,
        values: [["Roles"]],
      })
      headers.push("Roles")
    }

    if (colorTeamColumnIndex === -1) {
      colorTeamColumnIndex = headers.length
      updates.push({
        range: `${firstSheetName}!${columnToLetter(colorTeamColumnIndex + 1)}1`,
        values: [["ColorTeam"]],
      })
      headers.push("ColorTeam")
    }

    // If we added new columns, update the headers
    if (updates.length > 0) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          valueInputOption: "RAW",
          data: updates,
        },
      })
    }

    // Now update the participant data
    const dataUpdates = []

    // Update checked-in status
    dataUpdates.push({
      range: `${firstSheetName}!${columnToLetter(checkedInColumnIndex + 1)}${rowIndex + 1}`,
      values: [[participant.checkedIn ? "TRUE" : "FALSE"]],
    })

    // Update roles - make sure we're properly handling the case where roles are removed
    const rolesValue = participant.roles.length > 0 ? participant.roles.join(",") : ""
    dataUpdates.push({
      range: `${firstSheetName}!${columnToLetter(rolesColumnIndex + 1)}${rowIndex + 1}`,
      values: [[rolesValue]],
    })

    // Add more detailed console logs to help with debugging
    console.log(
      `Setting roles in spreadsheet cell ${columnToLetter(rolesColumnIndex + 1)}${rowIndex + 1} to: "${rolesValue}"`,
    )

    // Add more detailed console logs to help with debugging
    console.log(`Updating participant ${participant.id} (${participant.name}):`)
    console.log(`- Roles: ${participant.roles.length > 0 ? participant.roles.join(",") : "NONE"}`)
    console.log(`- Color Team: ${participant.colorTeam || "NONE"}`)
    console.log(`- Checked In: ${participant.checkedIn ? "YES" : "NO"}`)

    // Update color team
    dataUpdates.push({
      range: `${firstSheetName}!${columnToLetter(colorTeamColumnIndex + 1)}${rowIndex + 1}`,
      values: [[participant.colorTeam || ""]],
    })

    // Perform the updates
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: "RAW",
        data: dataUpdates,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Participant updated successfully in spreadsheet",
      participant,
    })
  } catch (error: any) {
    console.error("Error updating participant:", error)
    return NextResponse.json(
      {
        error: `Failed to update participant: ${error.message}`,
      },
      { status: 500 },
    )
  }
}

// Helper function to convert column number to letter (e.g., 1 -> A, 27 -> AA)
function columnToLetter(column: number): string {
  let temp,
    letter = ""
  while (column > 0) {
    temp = (column - 1) % 26
    letter = String.fromCharCode(temp + 65) + letter
    column = (column - temp - 1) / 26
  }
  return letter
}
