import type React from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import Sidebar from "@/components/sidebar"
import { Toaster } from "sonner"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "TICOS Church Retreat Dashboard",
  description: "Administrative dashboard for the 2025 TICOS Church Retreat",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <div className="flex flex-col md:flex-row h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-auto p-2 md:p-6">{children}</main>
          </div>
          <Toaster position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}


import './globals.css'