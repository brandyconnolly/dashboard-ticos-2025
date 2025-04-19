// Utility function to fetch data from Google Sheets via our API
export async function fetchSheetData() {
  try {
    const response = await fetch("/api/update-data")

    if (!response.ok) {
      throw new Error(`Error fetching data: ${response.status}`)
    }

    const result = await response.json()
    return result.data
  } catch (error) {
    console.error("Error fetching sheet data:", error)
    throw error
  }
}

// Helper function to get column index by header name
function getColumnIndex(headers: string[], pattern: string | RegExp): number {
  if (!headers || headers.length === 0) {
    console.warn("No headers provided to getColumnIndex")
    return -1
  }

  try {
    if (typeof pattern === "string") {
      // Log what we're looking for to help debug
      console.log(`Looking for column with pattern: "${pattern}"`)
      const index = headers.findIndex((h) => h && h.includes(pattern))
      console.log(`Found at index: ${index}, value: ${index >= 0 ? headers[index] : "not found"}`)
      return index
    } else {
      // Log what we're looking for to help debug
      console.log(`Looking for regex pattern`)
      const index = headers.findIndex((h) => h && pattern.test(h))
      console.log(`Found at index: ${index}, value: ${index >= 0 ? headers[index] : "not found"}`)
      return index
    }
  } catch (error) {
    console.error("Error in getColumnIndex:", error)
    return -1
  }
}

// Parse participants from the complex party-based structure
export function parseParticipants(sheetData: string[][]) {
  console.log("Starting parseParticipants with", sheetData?.length || 0, "rows")

  if (!sheetData || sheetData.length <= 1) {
    console.error("No data or only headers found in sheet data")
    return []
  }

  try {
    const headers = sheetData[0]
    console.log("Headers length:", headers.length)

    const participants: any[] = []
    let familyIdCounter = 1

    // Get party size column index - this is different from what we expected
    const partySizeIndex = getColumnIndex(headers, "How many people are in your party")
    if (partySizeIndex === -1) {
      console.error("Could not find party size column")
      return []
    }

    // Process each row (each row is a party/family)
    for (let rowIndex = 1; rowIndex < sheetData.length; rowIndex++) {
      const row = sheetData[rowIndex]
      if (!row || row.length === 0) {
        console.log(`Skipping empty row ${rowIndex}`)
        continue
      }

      // Get party size
      const partySizeValue = row[partySizeIndex]
      console.log(`Row ${rowIndex} party size value: "${partySizeValue}"`)

      const partySize = Number.parseInt(partySizeValue || "1", 10)
      if (isNaN(partySize) || partySize <= 0) {
        console.log(`Skipping row ${rowIndex} due to invalid party size: ${partySizeValue}`)
        continue
      }

      // Create a unique family ID for this row
      const familyId = familyIdCounter++
      console.log(`Processing row ${rowIndex} with party size ${partySize}, assigned family ID ${familyId}`)

      // Process each party size (1-7)
      for (let partyType = 1; partyType <= 7; partyType++) {
        // Only process if this row is for this party size
        if (partySize === partyType) {
          console.log(`Processing party type ${partyType} for row ${rowIndex}`)

          // Extract primary contact info - FIXED PATTERN TO MATCH ACTUAL HEADERS
          const phoneIndex = getColumnIndex(headers, `Telephone\n(Party of ${partyType})`)
          const phone = phoneIndex >= 0 ? row[phoneIndex] || "" : ""

          const primaryFirstNameIndex = getColumnIndex(
            headers,
            `Primary Contact: First Name\n(Prénom)\n(Party of ${partyType})`,
          )
          const primaryLastNameIndex = getColumnIndex(
            headers,
            `Primary Contact: Last Name\n(Nom de famille)\n(Party of ${partyType})`,
          )
          const primaryAgeIndex = getColumnIndex(
            headers,
            `Primary Contact: Age Category\n(Quelle catégorie d'âge ?)\n(Party of ${partyType})`,
          )

          console.log(
            `Primary contact indices - First name: ${primaryFirstNameIndex}, Last name: ${primaryLastNameIndex}, Age: ${primaryAgeIndex}`,
          )

          if (primaryFirstNameIndex >= 0 && primaryLastNameIndex >= 0) {
            const primaryFirstName = row[primaryFirstNameIndex] || ""
            const primaryLastName = row[primaryLastNameIndex] || ""

            if (primaryFirstName || primaryLastName) {
              const primaryName = `${primaryFirstName} ${primaryLastName}`.trim()
              const primaryAge = primaryAgeIndex >= 0 ? row[primaryAgeIndex] || "Adult" : "Adult"

              console.log(`Adding primary contact: ${primaryName}, age: ${primaryAge}`)

              // Check if they need transportation
              const transportIndex = getColumnIndex(headers, "How are you getting to/from the retreat")
              const needsTransportation =
                transportIndex >= 0 &&
                (row[transportIndex]?.toLowerCase().includes("bus") ||
                  row[transportIndex]?.toLowerCase().includes("autobus") ||
                  row[transportIndex]?.toLowerCase().includes("shuttle") ||
                  row[transportIndex]?.toLowerCase().includes("navette"))

              // Add primary contact
              participants.push({
                id: `p${rowIndex}_1`,
                name: primaryName,
                ageGroup: mapAgeGroup(primaryAge),
                familyId: familyId,
                roles: [],
                checkedIn: false,
                phone: phone,
                email: row[getColumnIndex(headers, "Email Address")] || "",
                isPrimaryContact: true,
                needsTransportation: needsTransportation, // Add this flag but don't assign the role
              })

              // Add other people in the party
              for (let personNum = 2; personNum <= partyType; personNum++) {
                const personFirstNameIndex = getColumnIndex(
                  headers,
                  `Person ${personNum}: First Name\n(Prénom)\n(Party of ${partyType})`,
                )
                const personLastNameIndex = getColumnIndex(
                  headers,
                  `Person ${personNum}: Last Name\n(Nom de famille)\n(Party of ${partyType})`,
                )
                const personAgeIndex = getColumnIndex(
                  headers,
                  `Person ${personNum}: Age Category\n(Quelle catégorie d'âge ?)\n(Party of ${partyType})`,
                )

                console.log(
                  `Person ${personNum} indices - First name: ${personFirstNameIndex}, Last name: ${personLastNameIndex}, Age: ${personAgeIndex}`,
                )

                if (personFirstNameIndex >= 0 && personLastNameIndex >= 0) {
                  const personFirstName = row[personFirstNameIndex] || ""
                  const personLastName = row[personLastNameIndex] || ""

                  if (personFirstName || personLastName) {
                    const personName = `${personFirstName} ${personLastName}`.trim()
                    const personAge = personAgeIndex >= 0 ? row[personAgeIndex] || "Adult" : "Adult"

                    console.log(`Adding person ${personNum}: ${personName}, age: ${personAge}`)

                    participants.push({
                      id: `p${rowIndex}_${personNum}`,
                      name: personName,
                      ageGroup: mapAgeGroup(personAge),
                      familyId: familyId,
                      roles: [],
                      checkedIn: false,
                      isPrimaryContact: false,
                      needsTransportation: needsTransportation, // Inherit from primary contact
                    })
                  }
                }
              }
            }
          }

          // Process roles and other data
          const helpOrganizeIndex = getColumnIndex(headers, "Do you want to help organize the retreat")
          if (helpOrganizeIndex >= 0 && row[helpOrganizeIndex]?.toLowerCase().includes("help")) {
            // Assign role to primary contact
            const primaryParticipant = participants.find((p) => p.familyId === familyId && p.isPrimaryContact)
            if (primaryParticipant) {
              primaryParticipant.roles.push("setup-crew")
            }
          }

          // Break out of the loop since we've processed this party size
          break
        }
      }
    }

    console.log(`Finished parsing participants, found ${participants.length} participants`)
    return participants
  } catch (error) {
    console.error("Error in parseParticipants:", error)
    throw new Error(`Failed to parse participants: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// Map age categories from the form to our system
function mapAgeGroup(ageCategory: string): "adult" | "student-15+" | "child-8-14" | "child-2-7" | "infant-0-2" {
  if (!ageCategory) return "adult"

  const lowerCase = ageCategory.toLowerCase()

  if (lowerCase.includes("adult") || lowerCase.includes("adulte")) {
    return "adult"
  } else if (
    lowerCase.includes("teen") ||
    lowerCase.includes("ado") ||
    lowerCase.includes("15+") ||
    lowerCase.includes("student")
  ) {
    return "student-15+"
  } else if (lowerCase.includes("8-14") || lowerCase.includes("8 to 14")) {
    return "child-8-14"
  } else if (lowerCase.includes("2-7") || lowerCase.includes("2 to 7")) {
    return "child-2-7"
  } else if (
    lowerCase.includes("0-2") ||
    lowerCase.includes("0 to 2") ||
    lowerCase.includes("infant") ||
    lowerCase.includes("bébé")
  ) {
    return "infant-0-2"
  }

  // Default to adult if unknown
  return "adult"
}

// Parse families from the complex party-based structure
export function parseFamilies(sheetData: string[][]) {
  console.log("Starting parseFamilies with", sheetData?.length || 0, "rows")

  if (!sheetData || sheetData.length <= 1) {
    console.error("No data or only headers found in sheet data")
    return []
  }

  try {
    const headers = sheetData[0]
    const families: any[] = []
    let familyIdCounter = 1

    // Get party size column index
    const partySizeIndex = getColumnIndex(headers, "How many people are in your party")
    if (partySizeIndex === -1) {
      console.error("Could not find party size column")
      return []
    }

    // Process each row (each row is a party/family)
    for (let rowIndex = 1; rowIndex < sheetData.length; rowIndex++) {
      const row = sheetData[rowIndex]
      if (!row || row.length === 0) continue

      // Get party size
      const partySize = Number.parseInt(row[partySizeIndex] || "1", 10)
      if (isNaN(partySize) || partySize <= 0) continue

      // Create a unique family ID for this row
      const familyId = familyIdCounter++

      // Process each party size (1-7)
      for (let partyType = 1; partyType <= 7; partyType++) {
        // Only process if this row is for this party size
        if (partySize === partyType) {
          // Extract primary contact info - FIXED PATTERN TO MATCH ACTUAL HEADERS
          const phoneIndex = getColumnIndex(headers, `Telephone\n(Party of ${partyType})`)
          const phone = phoneIndex >= 0 ? row[phoneIndex] || "" : ""

          const primaryFirstNameIndex = getColumnIndex(
            headers,
            `Primary Contact: First Name\n(Prénom)\n(Party of ${partyType})`,
          )
          const primaryLastNameIndex = getColumnIndex(
            headers,
            `Primary Contact: Last Name\n(Nom de famille)\n(Party of ${partyType})`,
          )

          if (primaryFirstNameIndex >= 0 && primaryLastNameIndex >= 0) {
            const primaryFirstName = row[primaryFirstNameIndex] || ""
            const primaryLastName = row[primaryLastNameIndex] || ""

            if (primaryFirstName || primaryLastName) {
              const primaryName = `${primaryFirstName} ${primaryLastName}`.trim()
              const familyName = partySize > 1 ? `${primaryLastName} Family` : primaryName

              console.log(`Adding family: ${familyName}, primary contact: ${primaryName}`)

              families.push({
                id: familyId,
                name: familyName,
                primaryContactId: `p${rowIndex}_1`,
                phone: phone,
                email: row[getColumnIndex(headers, "Email Address")] || "",
              })
            }
          }

          // Break out of the loop since we've processed this party size
          break
        }
      }
    }

    console.log(`Finished parsing families, found ${families.length} families`)
    return families
  } catch (error) {
    console.error("Error in parseFamilies:", error)
    throw new Error(`Failed to parse families: ${error instanceof Error ? error.message : String(error)}`)
  }
}
