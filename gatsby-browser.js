import React from 'react'
import './src/styles/global.css'
import { WindowProvider } from './src/context/WindowContext'

export const wrapRootElement = ({ element }) => (
    <WindowProvider>
        {element}
    </WindowProvider>
)
