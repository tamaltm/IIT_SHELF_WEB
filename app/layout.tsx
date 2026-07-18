import type React from "react"
import "./globals.css"

export const metadata = {
  title: "IITShelf - Digital Library",
  description: "Digital Library Management System",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
