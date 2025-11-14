import React from 'react'

export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} />
}

export function SkeletonText({ lines = 3 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton h-4" />
      ))}
    </div>
  )
}

