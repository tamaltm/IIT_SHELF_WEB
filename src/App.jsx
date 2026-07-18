"use client"

import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { useState, useEffect } from "react"
import { authApi } from "./api/auth"

// Pages
import Home from "./pages/Home"
import Login from "./pages/Login"
import Register from "./pages/Register"
import OTPVerification from "./pages/OTPVerification"
import ForgotPassword from "./pages/ForgotPassword"
import ResetPassword from "./pages/ResetPassword"
import RegistrationSuccess from "./pages/RegistrationSuccess"
import Dashboard from "./pages/Dashboard"
import Search from "./pages/Search"
import BookDetails from "./pages/BookDetails"
import MyBooks from "./pages/MyBooks"
import Payments from "./pages/Payments"
import MyFines from "./pages/MyFines"
import Profile from "./pages/Profile"
import Notifications from "./pages/Notifications"

import LibrarianDashboard from "./pages/LibrarianDashboard"
import LibrarianInventory from "./pages/LibrarianInventory"
import LibrarianReports from "./pages/LibrarianReports"
import LibrarianRequests from "./pages/LibrarianRequests"
import LibrarianReturnRequests from "./pages/LibrarianReturnRequests"
import LibrarianBookRequests from "./pages/LibrarianBookRequests"
import LibrarianHistory from "./pages/LibrarianHistory"
import LibrarianShelves from "./pages/LibrarianShelves"
import LibrarianCourses from "./pages/LibrarianCourses"
import DirectorDashboard from "./pages/DirectorDashboard"
import Reports from "./pages/Reports"

function App() {
  // Mock authentication state
  const [user, setUser] = useState(() => {
    try {
      const raw = sessionStorage.getItem("iitshelf_user")
      if (raw) {
        const parsedUser = JSON.parse(raw)
        // Ensure role is present and valid
        return parsedUser && parsedUser.role ? parsedUser : null
      }
      return null
    } catch (e) {
      console.error('Error loading user from sessionStorage:', e)
      return null
    }
  })
  
  const [userRole, setUserRole] = useState(() => {
    try {
      const raw = sessionStorage.getItem("iitshelf_user")
      if (raw) {
        const parsedUser = JSON.parse(raw)
        return parsedUser && parsedUser.role ? parsedUser.role : "student"
      }
      return "student"
    } catch (e) {
      return "student"
    }
  })

  const login = (userData, role) => {
    // Validate role
    const validRole = role && role.toLowerCase()
    if (!validRole) {
      console.error('Invalid role provided to login')
      return
    }
    
    // Attach role to user object for Header and other components
    // Map profile_image to avatar for consistency
    const newUser = { 
      ...userData, 
      role: validRole,
      avatar: userData.profile_image || userData.avatar
    }
    setUser(newUser)
    setUserRole(validRole)
    
    try {
      sessionStorage.setItem("iitshelf_user", JSON.stringify(newUser))
    } catch (e) {
      console.error('Error saving user to sessionStorage:', e)
    }
  }

  const logout = () => {
    setUser(null)
    setUserRole("student")
    try {
      sessionStorage.removeItem("iitshelf_user")
      sessionStorage.removeItem("userData") // Clean up old data
      sessionStorage.removeItem("userRole") // Clean up old data
      // Also clear localStorage for backward compatibility
      localStorage.removeItem("iitshelf_user")
      localStorage.removeItem("userData")
      localStorage.removeItem("userRole")
    } catch (e) {
      console.error('Error clearing sessionStorage:', e)
    }
  }

  const updateUser = (patch) => {
    const updated = { ...(user || {}), ...patch }
    // Preserve the role
    if (user && user.role && !patch.role) {
      updated.role = user.role
    }
    setUser(updated)
    try {
      sessionStorage.setItem("iitshelf_user", JSON.stringify(updated))
    } catch (e) {
      console.error('Error updating user in sessionStorage:', e)
    }
  }

  useEffect(() => {
    // Sync userRole with user object if it changes
    if (user && user.role) {
      if (userRole !== user.role) {
        console.log('Syncing userRole with user.role:', user.role)
        setUserRole(user.role)
      }
    } else if (user && !user.role) {
      // User object exists but has no role - this is an error state
      console.error('User object missing role, logging out')
      logout()
    }
  }, [user])

  // Fetch profile data including profile image on mount/when user changes
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user?.email) return
      
      try {
        const profileRes = await authApi.getProfile(user.email)
        if (profileRes.success && profileRes.user) {
          // Update user with profile image if available
          if (profileRes.user.profile_image && profileRes.user.profile_image !== user.avatar) {
            updateUser({ 
              avatar: profileRes.user.profile_image,
              name: profileRes.user.name || user.name
            })
          }
        }
      } catch (error) {
        console.error('Error fetching profile data:', error)
      }
    }

    fetchProfileData()
  }, [user?.email])

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login onLogin={login} />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-otp" element={<OTPVerification />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/registration-success" element={<RegistrationSuccess />} />

        {/* Protected Routes - Student/Professor */}
        <Route
          path="/dashboard"
          element={
            user ? (
              userRole === "librarian" ? (
                <Navigate to="/librarian/dashboard" />
              ) : userRole === "director" ? (
                <Navigate to="/director/dashboard" />
              ) : (
                <Dashboard user={user} userRole={userRole} onLogout={logout} />
              )
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/search"
          element={<Search user={user} userRole={userRole} onLogout={logout} />}
        />
        <Route
          path="/book/:id"
          element={<BookDetails user={user} userRole={userRole} onLogout={logout} />}
        />
        <Route
          path="/my-books"
          element={user ? <MyBooks user={user} userRole={userRole} onLogout={logout} /> : <Navigate to="/login" />}
        />
        <Route
          path="/payments"
          element={user ? <Payments user={user} userRole={userRole} onLogout={logout} /> : <Navigate to="/login" />}
        />
        <Route
          path="/fines"
          element={user ? <MyFines user={user} userRole={userRole} onLogout={logout} /> : <Navigate to="/login" />}
        />
        <Route
          path="/profile"
          element={
            user ? <Profile user={user} userRole={userRole} onLogout={logout} onUpdateUser={updateUser} /> : <Navigate to="/login" />
          }
        />
        <Route
          path="/notifications"
          element={
            user ? <Notifications user={user} userRole={userRole} onLogout={logout} /> : <Navigate to="/login" />
          }
        />

        <Route
          path="/librarian/dashboard"
          element={
            user && userRole === "librarian" ? (
              <LibrarianDashboard user={user} onLogout={logout} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/librarian/inventory"
          element={
            user && userRole === "librarian" ? (
              <LibrarianInventory user={user} onLogout={logout} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/librarian/reports"
          element={
            user && userRole === "librarian" ? (
              <Reports user={user} onLogout={logout} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/librarian/requests"
          element={
            user && userRole === "librarian" ? (
              <LibrarianRequests user={user} onLogout={logout} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/librarian/return-requests"
          element={
            user && userRole === "librarian" ? (
              <LibrarianReturnRequests user={user} onLogout={logout} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/librarian/book-requests"
          element={
            user && userRole === "librarian" ? (
              <LibrarianBookRequests user={user} onLogout={logout} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/librarian/history"
          element={
            user && userRole === "librarian" ? (
              <LibrarianHistory user={user} onLogout={logout} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/librarian/shelves"
          element={
            user && userRole === "librarian" ? (
              <LibrarianShelves user={user} onLogout={logout} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/librarian/courses"
          element={
            user && userRole === "librarian" ? (
              <LibrarianCourses user={user} onLogout={logout} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* Director Routes */}
        <Route
          path="/director/dashboard"
          element={
            user && userRole === "director" ? (
              <DirectorDashboard user={user} onLogout={logout} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/director/reports"
          element={
            user && userRole === "director" ? (
              <Reports user={user} onLogout={logout} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/director/history"
          element={
            user && userRole === "director" ? (
              <LibrarianHistory user={user} onLogout={logout} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
      </Routes>
    </Router>
  )
}

export default App
