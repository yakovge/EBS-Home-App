/**
 * Theme context for managing dark/light theme state in React Native.
 * Provides theme switching functionality with AsyncStorage persistence.
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useColorScheme } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { lightTheme, darkTheme, ThemeContextType } from '../theme/theme'
import type { MD3Theme } from 'react-native-paper'

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme()
  const [isDark, setIsDark] = useState(false)
  const [theme, setTheme] = useState<MD3Theme>(lightTheme)

  useEffect(() => {
    // Load saved theme preference on app start
    loadThemePreference()
  }, [])

  useEffect(() => {
    // Update theme when isDark changes
    setTheme(isDark ? darkTheme : lightTheme)
  }, [isDark])

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme-preference')
      
      if (savedTheme === 'dark') {
        setIsDark(true)
      } else if (savedTheme === 'light') {
        setIsDark(false)
      } else {
        // No saved preference, use system theme
        setIsDark(systemColorScheme === 'dark')
      }
    } catch (error) {
      console.error('Error loading theme preference:', error)
      // Fall back to system theme
      setIsDark(systemColorScheme === 'dark')
    }
  }

  const toggleTheme = async () => {
    const newIsDark = !isDark
    setIsDark(newIsDark)
    
    try {
      await AsyncStorage.setItem('theme-preference', newIsDark ? 'dark' : 'light')
    } catch (error) {
      console.error('Error saving theme preference:', error)
    }
  }

  const setThemePreference = async (darkMode: boolean) => {
    setIsDark(darkMode)
    
    try {
      await AsyncStorage.setItem('theme-preference', darkMode ? 'dark' : 'light')
    } catch (error) {
      console.error('Error saving theme preference:', error)
    }
  }

  const value: ThemeContextType = {
    theme,
    isDark,
    toggleTheme,
    setTheme: setThemePreference,
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}