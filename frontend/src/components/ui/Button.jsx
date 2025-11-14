import React from 'react'

const variants = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700',
  outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
  danger: 'bg-red-600 text-white hover:bg-red-700'
}

const sizes = {
  md: 'px-4 py-2',
  lg: 'px-6 py-3'
}

export default function Button({ as = 'button', variant = 'primary', size = 'md', className = '', children, ...props }) {
  const Comp = as
  return (
    <Comp className={`rounded-lg transition-colors ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </Comp>
  )
}

