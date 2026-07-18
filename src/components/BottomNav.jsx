import { Link, useLocation } from "react-router-dom"
import "./BottomNav.css"

function BottomNav({ userRole }) {
  const location = useLocation()

  const isActive = (path) => location.pathname === path

  // Different navigation for different roles
  const studentNav = [
    { path: "/dashboard", icon: "🏠", label: "Home" },
    { path: "/search", icon: "🔍", label: "Search" },
    { path: "/my-books", icon: "📚", label: "My Books" },
    { path: "/payments", icon: "💳", label: "Payments" },
    { path: "/profile", icon: "👤", label: "Profile" },
  ]

  const librarianNav = [
    { path: "/librarian/dashboard", icon: "📊", label: "Dashboard" },
    { path: "/librarian/requests", icon: "📋", label: "Requests" },
    { path: "/librarian/borrowed-books", icon: "📚", label: "Borrowed" },
    { path: "/librarian/inventory", icon: "📦", label: "Inventory" },
    { path: "/librarian/shelves", icon: "🗂️", label: "Shelves" },
    { path: "/profile", icon: "👤", label: "Profile" },
  ]

  const directorNav = [
    { path: "/director/dashboard", icon: "🏠", label: "Home" },
    { path: "/search", icon: "🔍", label: "Search" },
    { path: "/director/reports", icon: "📊", label: "Reports" },
    { path: "/director/history", icon: "🧾", label: "Transactions" },
    { path: "/profile", icon: "👤", label: "Profile" },
  ]

  const guestNav = [
    { path: "/search", icon: "🔍", label: "Search Books" },
  ]

  const navItems = userRole === "librarian" ? librarianNav : userRole === "director" ? directorNav : userRole === "guest" ? guestNav : studentNav

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-container">
        {navItems.map((item) => (
          <Link key={item.path} to={item.path} className={`bottom-nav-item ${isActive(item.path) ? "active" : ""}`}>
            <span className="bottom-nav-icon">{item.icon}</span>
            <span className="bottom-nav-label">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}

export default BottomNav
