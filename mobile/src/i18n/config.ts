/**
 * i18n configuration for React Native internationalization.
 * Supports English and Hebrew languages with AsyncStorage persistence.
 */

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getLocales } from 'expo-localization'

import enTranslations from './locales/en.json'
import heTranslations from './locales/he.json'

const resources = {
  en: {
    translation: enTranslations,
  },
  he: {
    translation: heTranslations,
  },
}

// Detect device language
const deviceLanguage = getLocales()[0]?.languageCode || 'en'
const supportedLanguage = resources[deviceLanguage as keyof typeof resources] ? deviceLanguage : 'en'

// Language detection plugin for React Native
const languageDetector = {
  type: 'languageDetector',
  async: true,
  detect: async (callback: (lang: string) => void) => {
    try {
      // Try to get language from AsyncStorage first
      const savedLanguage = await AsyncStorage.getItem('user-language')
      if (savedLanguage && resources[savedLanguage as keyof typeof resources]) {
        callback(savedLanguage)
        return
      }
      
      // Fall back to device language
      callback(supportedLanguage)
    } catch (error) {
      console.error('Error detecting language:', error)
      callback('en')
    }
  },
  init: () => {},
  cacheUserLanguage: async (language: string) => {
    try {
      await AsyncStorage.setItem('user-language', language)
    } catch (error) {
      console.error('Error saving language:', error)
    }
  },
}

i18n
  .use(languageDetector as any)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: __DEV__, // Enable debug in development
    interpolation: {
      escapeValue: false, // React Native already escapes values
    },
    react: {
      useSuspense: false,
    },
    // React Native specific options
    compatibilityJSON: 'v3',
  })

export default i18n

// Helper function to change language
export const changeLanguage = async (language: 'en' | 'he') => {
  await i18n.changeLanguage(language)
}

// Helper function to get current language
export const getCurrentLanguage = () => i18n.language

// Helper function to check if RTL
export const isRTL = () => i18n.language === 'he'