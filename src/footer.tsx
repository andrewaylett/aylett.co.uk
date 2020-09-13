import React from 'react'
import { getYear } from 'date-fns'

const Footer = ({ author, copyright }) => (
  <footer style={{ paddingTop: '1em' }}>
    Copyright © {author || 'Andrew Aylett'}, {copyright || getYear(Date.now())}
  </footer>
)

export default Footer
