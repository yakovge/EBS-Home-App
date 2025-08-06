#!/usr/bin/env python3
"""Create a simple test image for upload testing"""

from PIL import Image
import io

# Create a simple test image
img = Image.new('RGB', (100, 100), color='red')

# Save as JPEG bytes
img_bytes = io.BytesIO()
img.save(img_bytes, format='JPEG')
img_bytes.seek(0)

# Save to file for testing
with open('test-photo.jpg', 'wb') as f:
    f.write(img_bytes.getvalue())

print("Test image created: test-photo.jpg")