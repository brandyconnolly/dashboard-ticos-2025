import { NextResponse } from "next/server"

export async function GET() {
  // Check environment variables without exposing their values
  const envStatus = {
    GOOGLE_SERVICE_ACCOUNT_JSON: {
      set: !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
      valid: false,
      length: process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.length || 0,
    },
    SPREADSHEET_ID: {
      set: !!process.env.SPREADSHEET_ID,
      value: process.env.SPREADSHEET_ID || "",
    },
  }

  // Check if the service account JSON is valid
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      const parsed = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
      envStatus.GOOGLE_SERVICE_ACCOUNT_JSON.valid = !!(parsed.client_email && parsed.private_key)

      // Add partial email for verification (first 5 chars + last 10 chars)
      if (parsed.client_email) {
        const email = parsed.client_email
        const maskedEmail =
          email.length > 15 ? `${email.substring(0, 5)}...${email.substring(email.length - 10)}` : "too_short"
        envStatus.GOOGLE_SERVICE_ACCOUNT_JSON.email = maskedEmail
      }
    } catch (e) {
      envStatus.GOOGLE_SERVICE_ACCOUNT_JSON.valid = false
      envStatus.GOOGLE_SERVICE_ACCOUNT_JSON.error = "Invalid JSON format"
    }
  }

  return NextResponse.json(envStatus)
}
