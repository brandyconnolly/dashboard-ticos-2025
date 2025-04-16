export type AgeGroup = "adult" | "student-15+" | "child-8-14" | "child-2-7" | "infant-0-2"

export type Role =
  | "prayer-team"
  | "food-crew"
  | "primary-contact"
  | "worship-team"
  | "setup-crew"
  | "cleanup-crew"
  | "activities-coordinator"
  | "transportation"
  | "custom"

export interface Attendance {
  fullAttendance: boolean
  days: {
    friday: boolean
    saturday: boolean
    sunday: boolean
  }
}

export interface Participant {
  id: string
  name: string
  ageGroup: AgeGroup
  age?: number
  familyId: number
  roles: Role[]
  customRole?: string
  colorTeam?: string
  checkedIn: boolean
  phone?: string
  email?: string
  isPrimaryContact: boolean
  comments?: string
  attendance?: Attendance
}

export interface Family {
  id: number
  name: string
  primaryContactId: string
  phone: string
  email: string
}
