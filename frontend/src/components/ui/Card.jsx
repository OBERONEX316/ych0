import React from 'react'

export default function Card({ className = '', children }) {
  return (
    <div className={`card shadow-sm hover:shadow-md transition-shadow ${className}`}>{children}</div>
  )
}

