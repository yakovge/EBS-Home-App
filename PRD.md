# 🧾 Product Requirements Document (PRD)

## **Project Name:**  
**EBS Home** – A Family App for Managing a Shared Vacation House

---

## **Overview**
EBS Home is a mobile application designed for the **Eisenberg family** to collaboratively manage their shared vacation house in **Bat Shlomo, Israel**. The app will help the family stay organized around house maintenance, scheduling visits, and preserving order.

---

## **Platform & Stack**
- **Cross-platform**: Android & iOS (via Expo)
- **Tech Stack**:
  - React Native + Expo
  - TypeScript
  - Firebase:
    - Authentication (Google)
    - Firestore (Database)
    - Storage (Images)
    - Cloud Messaging (Push Notifications)
  - i18n: English + Hebrew support
  - UI: React Native Paper v5 (custom warm theme)

---

## **Core Goals**
- Report and track house maintenance issues  
- Manage a shared calendar of house occupancy  
- Maintain order via photo checklists and reminders  
- Ensure secure, private access using personal mobile devices

---

## **Key Features**

### 1. 🛠️ Maintenance Request System
- Any family member can:
  - Upload a photo
  - Add a description
  - Select a location
- The maintenance person receives a notification
- Once marked as fixed:
  - A notification is sent to **“Yaffa”**
  - Includes original issue + resolution date/time

### 2. 📅 Shared Booking Calendar
- Members mark their planned dates at the house
- Calendar shows both **Gregorian and Hebrew** dates
- Visible to all users for coordination

### 3. 📸 Exit Photo Checklist
- Upon leaving the house, users must upload:
  - 2 photos of the **refrigerator**
  - 2 photos of the **freezer**
  - 3 photos of the **closets**
- Each photo section includes a required **text note**:
  - What’s there / what’s missing
- Features:
  - Upload block until all required photos and notes are submitted
  - Store images in Firebase Storage
  - Store metadata in Firestore:
    - User
    - Timestamp
    - Photo type
    - Text notes
- History screen:
  - List previous uploads
  - Show who uploaded, when, and what

### 4. 🔔 Exit Reminders
- Based on booking calendar, detect user scheduled to leave today
- If they haven’t uploaded exit checklist:
  - Send **push notification**
  - Show **in-app reminder**

### 5. 🔐 Single Device Login
- A user can only log in from one phone
- On first login:
  - Store device ID in Firestore
- Block login attempts from other devices
- Use Expo Device API + Firebase Auth

---

## ✅ Development Guidelines
- Propose a clean, scalable **file/folder structure**
- Select and explain a state management strategy
- Set up Firebase services securely (start with placeholders)
- Define all types/interfaces (strict TypeScript)
- Follow OOP and SOLID principles 
- Ensure the code you build is modular
- Write in every file and folder what is the file's role in the project
- Avoid code duplication. Before you implement a functionality make sure it is not implemented elsewhere. If you find a functionality that need be implemented in two different places in the project, take the functionality out and use it whereever it needed. Be sure that every functionality is implemented in one and only one place in the project.

- Set up:
  - Navigation
  - i18n
  - Theming system

---

## ⚠️ Constraints
- No breaking changes
- No `any` or untyped code
- No hardcoded Firebase keys or strings
- No unvalidated or unsafe logic

---

## 🔄 First Step
Start by outlining:
- Architecture plan  
- File structure  
- Implementation steps  

**Wait for confirmation before beginning actual development.**


## Tools and Framworks
 - python for backend
 - react for frontend
 - Firebase for deployment

## Testing
 - Thorouwly test every functionality and module in the project.
 - maintain TEST_SUMMARY.md that summerize the testing coverage and status

 ## Git
  - commit after every change with detailed massage 
  - Add and maintain .gitignore file