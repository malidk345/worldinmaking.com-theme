import { createContext, useContext, useState } from 'react'

export const UserContext = createContext<any>(null)

export const useUser = () => {
    return useContext(UserContext) || { user: null, isLoading: false }
}
