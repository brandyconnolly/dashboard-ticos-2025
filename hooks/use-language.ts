"use client"

import { useState, useEffect } from "react"

export function useLanguage() {
  const [language, setLanguage] = useState<"en" | "fr">("en")

  // Load language preference from localStorage on component mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem("language")
    if (savedLanguage === "en" || savedLanguage === "fr") {
      setLanguage(savedLanguage)
    }
  }, [])

  // Function to change language and save to localStorage
  const changeLanguage = (newLanguage: "en" | "fr") => {
    setLanguage(newLanguage)
    localStorage.setItem("language", newLanguage)
  }

  return { language, changeLanguage }
}
