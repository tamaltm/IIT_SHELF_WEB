"use client"

import dynamic from "next/dynamic"

// Dynamically import the React app to avoid SSR issues
const App = dynamic(() => import("../src/App"), { ssr: false })

export default function Page() {
  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <App />
    </div>
  )
}
