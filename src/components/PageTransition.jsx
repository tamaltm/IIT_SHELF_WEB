import React from "react"
import "./PageTransition.css"

function PageTransition({ children, className = "page" }) {
  return (
    <div className={`page-transition ${className}`}>
      {children}
    </div>
  )
}

export default PageTransition
