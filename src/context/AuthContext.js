import React, { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    login: () => {},
    logout: () => {},
    register: () => {},
})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [isLoggedIn, setIsLoggedIn] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    // Check for saved user on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedUser = localStorage.getItem('user')
            if (savedUser) {
                try {
                    const parsed = JSON.parse(savedUser)
                    setUser(parsed)
                    setIsLoggedIn(true)
                } catch (e) {
                    localStorage.removeItem('user')
                }
            }
        }
        setIsLoading(false)
    }, [])

    const login = (email, password) => {
        // Simple mock login - in production, this would hit an API
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // Check stored users
                const users = JSON.parse(localStorage.getItem('users') || '[]')
                const foundUser = users.find(u => u.email === email && u.password === password)
                
                if (foundUser) {
                    const userData = {
                        id: foundUser.id,
                        email: foundUser.email,
                        name: foundUser.name,
                        avatar: foundUser.avatar || null,
                        createdAt: foundUser.createdAt,
                    }
                    setUser(userData)
                    setIsLoggedIn(true)
                    localStorage.setItem('user', JSON.stringify(userData))
                    resolve(userData)
                } else {
                    reject(new Error('invalid email or password'))
                }
            }, 500)
        })
    }

    const register = (name, email, password) => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const users = JSON.parse(localStorage.getItem('users') || '[]')
                
                // Check if email exists
                if (users.find(u => u.email === email)) {
                    reject(new Error('email already registered'))
                    return
                }

                const newUser = {
                    id: Date.now().toString(),
                    name,
                    email,
                    password, // In production, hash this!
                    avatar: null,
                    createdAt: new Date().toISOString(),
                }

                users.push(newUser)
                localStorage.setItem('users', JSON.stringify(users))

                const userData = {
                    id: newUser.id,
                    email: newUser.email,
                    name: newUser.name,
                    avatar: null,
                    createdAt: newUser.createdAt,
                }
                setUser(userData)
                setIsLoggedIn(true)
                localStorage.setItem('user', JSON.stringify(userData))
                resolve(userData)
            }, 500)
        })
    }

    const logout = () => {
        setUser(null)
        setIsLoggedIn(false)
        localStorage.removeItem('user')
    }

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: isLoggedIn, isLoading, login, logout, register }}>
            {children}
        </AuthContext.Provider>
    )
}

export default AuthContext
