/**
 * Reusable photo upload component with drag-and-drop functionality.
 * Handles file validation, compression, and upload to Firebase Storage.
 */

import React, { useState, useRef } from 'react'
import {
  Box,
  Button,
  Typography,
  LinearProgress,
  Alert,
  IconButton,
  Card,
  CardMedia,
} from '@mui/material'
import {
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  PhotoCamera as PhotoCameraIcon,
} from '@mui/icons-material'

import { uploadService } from '@/services/uploadService'

interface PhotoUploadProps {
  onUploadComplete: (url: string) => void
  onUploadError: (error: string) => void
  onRemove?: () => void
  currentImageUrl?: string
  uploadPath: string
  maxSize?: number
  accept?: string
  label?: string
  disabled?: boolean
}

export default function PhotoUpload({
  onUploadComplete,
  onUploadError,
  onRemove,
  currentImageUrl,
  uploadPath,
  maxSize = 5 * 1024 * 1024, // 5MB
  accept = 'image/*',
  label = 'Upload Photo',
  disabled = false,
}: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragActive, setDragActive] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null)
  const [error, setError] = useState<string>('')
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  const handleFileSelect = async (file: File) => {
    try {
      setError('')
      setUploading(true)
      setUploadProgress(0)

      // Validate file
      const validation = uploadService.validateImageFile(file)
      if (!validation.valid) {
        throw new Error(validation.error)
      }

      // Compress image
      const compressedFile = await uploadService.compressImage(file)
      
      // Create preview
      const preview = URL.createObjectURL(compressedFile)
      setPreviewUrl(preview)

      // Upload to Firebase Storage
      const downloadURL = await uploadService.uploadPhoto(compressedFile, uploadPath, (progress) => {
        setUploadProgress(progress)
      })

      // Clean up preview URL
      URL.revokeObjectURL(preview)
      
      onUploadComplete(downloadURL)
      setPreviewUrl(downloadURL)
      
    } catch (err: any) {
      console.error('Upload failed:', err)
      const errorMessage = err.message || 'Upload failed'
      setError(errorMessage)
      onUploadError(errorMessage)
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    const files = e.dataTransfer.files
    if (files && files[0]) {
      handleFileSelect(files[0])
    }
  }

  const handleRemove = () => {
    setPreviewUrl(null)
    setError('')
    if (onRemove) {
      onRemove()
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  return (
    <Box>
      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Upload Area */}
      <Box
        ref={dropRef}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        sx={{
          border: '2px dashed',
          borderColor: dragActive ? 'primary.main' : 'grey.300',
          borderRadius: 2,
          p: 3,
          textAlign: 'center',
          backgroundColor: dragActive ? 'primary.50' : 'background.paper',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: disabled ? 'grey.300' : 'primary.main',
            backgroundColor: disabled ? 'background.paper' : 'primary.50',
          },
        }}
        onClick={disabled ? undefined : triggerFileInput}
      >
        {previewUrl ? (
          // Image Preview
          <Card sx={{ maxWidth: 300, mx: 'auto' }}>
            <CardMedia
              component="img"
              height="200"
              image={previewUrl}
              alt="Uploaded photo"
              sx={{ objectFit: 'cover' }}
            />
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Photo uploaded
              </Typography>
              <IconButton
                size="small"
                onClick={handleRemove}
                disabled={uploading}
                color="error"
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          </Card>
        ) : (
          // Upload Interface
          <Box>
            <CloudUploadIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {label}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Drag and drop an image here, or click to select
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Max size: {(maxSize / 1024 / 1024).toFixed(1)}MB • JPEG, PNG, WebP
            </Typography>
            
            <Button
              variant="outlined"
              startIcon={<PhotoCameraIcon />}
              sx={{ mt: 2 }}
              disabled={uploading || disabled}
            >
              Select Photo
            </Button>
          </Box>
        )}
      </Box>

      {/* Upload Progress */}
      {uploading && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Uploading... {uploadProgress}%
          </Typography>
          <LinearProgress variant="determinate" value={uploadProgress} />
        </Box>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
        disabled={disabled}
      />
    </Box>
  )
} 