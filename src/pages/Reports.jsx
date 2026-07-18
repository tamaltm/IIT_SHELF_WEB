"use client"

// Thin wrapper to keep existing routes working.
// Uses the original LibrarianReports component for both librarian/director views.
import LibrarianReports from "./LibrarianReports"

export default function Reports(props) {
  return <LibrarianReports {...props} />
}
