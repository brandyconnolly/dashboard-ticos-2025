"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Users,
  UserCheck,
  Home,
  Bus,
  Utensils,
  ClipboardCheck,
  Globe,
  Settings,
  Smartphone,
  Monitor,
  DollarSign,
  Menu,
  X,
} from "lucide-react"
import Image from "next/image"
import { useLanguage } from "@/hooks/use-language"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { getTranslation } from "@/lib/translations"

export default function Sidebar() {
  const pathname = usePathname()
  const { language, changeLanguage } = useLanguage()
  const [viewMode, setViewMode] = useLocalStorage<"desktop" | "mobile">("view-mode", "desktop")
  const [isMobileDevice, setIsMobileDevice] = useState(false)

  // Check if the device is mobile on component mount
  useEffect(() => {
    const checkIfMobile = () => {
      const userAgent = typeof window.navigator === "undefined" ? "" : navigator.userAgent
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
      return mobileRegex.test(userAgent)
    }

    setIsMobileDevice(checkIfMobile())
  }, [])

  // Auto-set view mode based on device on first load
  useEffect(() => {
    const savedViewMode = localStorage.getItem("view-mode")
    if (!savedViewMode) {
      setViewMode(isMobileDevice ? "mobile" : "desktop")
    }
  }, [isMobileDevice, setViewMode])

  const toggleLanguage = () => {
    changeLanguage(language === "en" ? "fr" : "en")
  }

  const toggleViewMode = () => {
    setViewMode(viewMode === "desktop" ? "mobile" : "desktop")
  }

  const tabs = [
    {
      name: getTranslation("participants", language),
      href: "/",
      icon: <Users className="h-6 w-6" />,
    },
    {
      name: getTranslation("roles", language),
      href: "/teams",
      icon: <UserCheck className="h-6 w-6" />,
    },
    {
      name: getTranslation("family", language),
      href: "/rooms",
      icon: <Home className="h-6 w-6" />,
    },
    {
      name: getTranslation("food-crew", language),
      href: "/food",
      icon: <Utensils className="h-6 w-6" />,
    },
    {
      name: getTranslation("transportation", language),
      href: "/transportation",
      icon: <Bus className="h-6 w-6" />,
    },
    {
      name: getTranslation("checked_in", language),
      href: "/checkin",
      icon: <ClipboardCheck className="h-6 w-6" />,
    },
    {
      name: getTranslation("payments", language),
      href: "/payments",
      icon: <DollarSign className="h-6 w-6" />,
    },
    {
      name: getTranslation("settings", language),
      href: "/settings",
      icon: <Settings className="h-6 w-6" />,
    },
  ]

  // Mobile sidebar is collapsed by default
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // For mobile view
  if (viewMode === "mobile") {
    return (
      <div className="bg-gray-800 text-white w-full">
        {/* Mobile header */}
        <div className="flex justify-between items-center p-3 border-b border-gray-700">
          <h1 className="text-lg font-bold truncate">
            {language === "en" ? "TICOS Retreat 2025" : "Retraite TICOS 2025"}
          </h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleLanguage}
              className="px-2 py-1 h-8 text-white border-gray-600 hover:bg-gray-700"
            >
              <Globe className="h-3 w-3 mr-1" />
              {language === "en" ? "EN" : "FR"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleViewMode}
              className="px-2 py-1 h-8 text-white border-gray-600 hover:bg-gray-700"
            >
              {viewMode === "desktop" ? <Monitor className="h-3 w-3" /> : <Smartphone className="h-3 w-3" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="px-2 py-1 h-8 text-white border-gray-600 hover:bg-gray-700"
            >
              {mobileMenuOpen ? <X className="h-3 w-3" /> : <Menu className="h-3 w-3" />}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <nav className="py-1 md:py-2">
            <ul className="space-y-1 px-2">
              {tabs.map((tab) => (
                <li key={tab.href}>
                  <Link href={tab.href} onClick={() => setMobileMenuOpen(false)}>
                    <div
                      className={`flex items-center px-3 py-2 text-sm md:text-base rounded-lg ${
                        pathname === tab.href ? "bg-gray-700 font-medium" : "hover:bg-gray-700"
                      }`}
                    >
                      <span className="mr-2">{tab.icon}</span>
                      <span className="truncate">{tab.name}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    )
  }

  // Desktop sidebar
  return (
    <div className="flex flex-col w-full md:w-64 bg-gray-800 text-white">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-xl font-bold truncate">
          {language === "en" ? "TICOS Retreat 2025" : "Retraite TICOS 2025"}
        </h1>
        <div className="flex gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleLanguage}
            className="flex-1 text-white border-gray-600 hover:bg-gray-700 hover:text-white"
          >
            <Globe className="mr-2 h-4 w-4" />
            {language === "en" ? "English" : "Français"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleViewMode}
            className="flex-1 text-white border-gray-600 hover:bg-gray-700 hover:text-white"
          >
            {viewMode === "desktop" ? (
              <>
                <Smartphone className="mr-2 h-4 w-4" />
                Mobile
              </>
            ) : (
              <>
                <Monitor className="mr-2 h-4 w-4" />
                Desktop
              </>
            )}
          </Button>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        <ul className="space-y-1 px-2">
          {tabs.map((tab) => (
            <li key={tab.href}>
              <Link href={tab.href}>
                <div
                  className={`flex items-center px-3 py-2 text-sm md:text-lg rounded-lg ${
                    pathname === tab.href ? "bg-gray-700 font-medium" : "hover:bg-gray-700"
                  }`}
                >
                  <span className="mr-2 md:mr-3">{tab.icon}</span>
                  <span className="truncate">{tab.name}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-2 md:p-4 border-t border-gray-700">
        <div className="text-center">
          <p className="text-xs md:text-sm mb-2">{getTranslation("registration_form", language)}</p>
          <a
            href="https://docs.google.com/forms/d/e/1FAIpQLSd-U0-RFpuZFVCjWU3W9f7ydbJx5-gq7gXzJ7r3ZMKKtNGgJg/viewform?usp=header"
            target="_blank"
            rel="noopener noreferrer"
            className="block mx-auto w-20 h-20 md:w-32 md:h-32 bg-white p-1 rounded-md"
          >
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Church%20Retreat%20QR%20Code-uAG2MDLrOGv4llkRTB77CdXlAKobL4.png"
              alt="Registration QR Code"
              width={128}
              height={128}
              className="w-full h-full"
            />
          </a>
        </div>
      </div>
    </div>
  )
}
