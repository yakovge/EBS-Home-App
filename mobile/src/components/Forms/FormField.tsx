/**
 * Reusable form field component with consistent styling.
 * Provides consistent form field appearance across the mobile app.
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { TextInput, Text, HelperText } from 'react-native-paper'
import { useTheme } from '../../contexts/ThemeContext'

interface FormFieldProps {
  label: string
  value: string
  onChangeText: (text: string) => void
  placeholder?: string
  multiline?: boolean
  numberOfLines?: number
  error?: string
  required?: boolean
  disabled?: boolean
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad'
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
  secureTextEntry?: boolean
  maxLength?: number
}

export default function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  numberOfLines = 1,
  error,
  required = false,
  disabled = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  secureTextEntry = false,
  maxLength,
}: FormFieldProps) {
  const { theme } = useTheme()

  return (
    <View style={styles.container}>
      <TextInput
        label={required ? `${label} *` : label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        multiline={multiline}
        numberOfLines={multiline ? numberOfLines : undefined}
        error={!!error}
        disabled={disabled}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        secureTextEntry={secureTextEntry}
        maxLength={maxLength}
        mode="outlined"
        style={styles.input}
        contentStyle={multiline ? styles.multilineContent : undefined}
      />
      
      {error && (
        <HelperText type="error" visible={!!error}>
          {error}
        </HelperText>
      )}
      
      {maxLength && (
        <HelperText type="info" visible={true} style={styles.characterCount}>
          {value.length}/{maxLength}
        </HelperText>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: 'transparent',
  },
  multilineContent: {
    paddingTop: 8,
  },
  characterCount: {
    textAlign: 'right',
    fontSize: 12,
    marginTop: 4,
  },
})