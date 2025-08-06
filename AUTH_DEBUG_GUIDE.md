# Authentication Debug Guide

## Issue: "NoneType' object has no attribute 'user_id'"

This error occurs when `current_user` is None in the API endpoints, indicating authentication failure.

## Debugging Steps

### 1. Check if user is logged in
Open browser developer tools (F12) and check:
```javascript
// In browser console
localStorage.getItem('session_token')
```
- If this returns `null`, user is not logged in
- If this returns a token, proceed to step 2

### 2. Check token validity
In the Network tab, look for API requests to see:
- Is the `Authorization: Bearer <token>` header being sent?
- What is the server response for authentication?

### 3. Check backend logs
Look for middleware debug output in the backend console. You should see:
- `=== MIDDLEWARE: POST /api/bookings ===`
- Authentication flow messages
- Any error messages

### 4. Test authentication manually
Try logging out and logging in again:
1. Go to login page
2. Use Google Sign-In
3. Check if token is stored in localStorage
4. Try creating a booking again

## Fixed Issues

✅ **Dashboard current occupants**: Fixed API response structure parsing  
✅ **Exit checklist entries**: Fixed data processing and display  
✅ **Recent checklist display**: Working correctly  
✅ **Maintenance status**: Added proper validation  
✅ **Better error messages**: Added authentication checks  

## Authentication Flow

The app uses:
1. Google Sign-In → Google ID token
2. Backend validates Google token → Session token
3. Frontend stores session token in localStorage
4. Frontend sends session token in Authorization header
5. Backend validates session token → User object

If any step fails, authentication won't work.

## Quick Fix Attempts

1. **Clear all auth data**: 
   ```javascript
   localStorage.clear()
   ```
   Then log in again.

2. **Check Firebase credentials**: Ensure Firebase service account files exist in backend/

3. **Verify CORS**: Check if CORS is properly configured for your frontend URL

## If issue persists

The authentication middleware has extensive debugging enabled. Check the backend console output when making requests to identify exactly where the authentication is failing.