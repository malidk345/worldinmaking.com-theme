"use client"

import React, { createContext, useContext, useState, ReactNode } from 'react'

interface InPageSearchContextType {
    searchQuery: string
    setSearchQuery: (query: string) => void
}

const InPageSearchContext = createContext<InPageSearchContextType>({
    searchQuery: '',
    setSearchQuery: () => { },
})

export const useInPageSearch = () => useContext(InPageSearchContext)

export const InPageSearchProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [searchQuery, setSearchQuery] = useState('')

    return (
        <InPageSearchContext.Provider value={{ searchQuery, setSearchQuery }}>
            {children}
        </InPageSearchContext.Provider>
    )
}
