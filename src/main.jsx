import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { bootstrapA11y } from '@/lib/a11y'

bootstrapA11y()

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
