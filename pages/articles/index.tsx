import React from 'react'
import { Articles } from '../../articles'

export default function BlogList() {
  return (
    <>
      {Object.entries(Articles).map(([k, { metadata }]) => (
        <div key={metadata.title}>{metadata.title}</div>
      ))}
    </>
  )
}
