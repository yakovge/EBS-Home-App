# React Web to React Native Migration Plan (Expo)

You are tasked with creating a detailed plan to migrate an existing React web app to a React Native app using Expo, ensuring full support for iOS, Android, and Web platforms.

## 1. Audit of Web-Specific Code and Libraries
- Identify web-only code (e.g., DOM APIs, window/document usage) and incompatible libraries (e.g., browser-specific packages).
- Provide a checklist to detect and flag incompatible dependencies in the current codebase.

## 2. Component Conversion Strategy
- Outline how to convert React web components to React Native primitives (e.g., div to View, span to Text).
- Address handling custom components, animations, and platform-specific UI/UX considerations (e.g., native navigation gestures, responsive layouts).

## 3. Replacement Plan for Routing, Styling, and Browser APIs
- Recommend a React Native-compatible routing solution to replace the current web routing (e.g., React Navigation for React Native).
- Propose a styling approach to replace CSS-in-JS or CSS frameworks, considering Expo compatibility (e.g., StyleSheet, NativeWind).
- Identify browser-specific APIs (e.g., localStorage, window.alert) and suggest React Native equivalents (e.g., AsyncStorage, Alert).

## 4. Expo Project Setup and Code Migration
- Provide steps to initialize a clean Expo project configured for iOS, Android, and Web.
- Detail how to migrate existing React components, hooks, and logic into the Expo project while maintaining code organization.

## 5. Library Alternatives and Compatibility
- Map commonly used React web libraries to React Native/Expo-compatible alternatives (e.g., Axios to Fetch, Moment to date-fns).
- Highlight Expo-specific constraints (e.g., no custom native modules without ejecting).

## 6. Testing Strategy
- Outline a testing plan for iOS, Android, and Web, including tools (e.g., Jest for unit tests, Detox for E2E) and types of tests (unit, integration, end-to-end).
- Address platform-specific testing challenges (e.g., gestures, device compatibility).

## 7. Migration Roadmap
- Provide a clear, step-by-step roadmap for the migration process, prioritizing tasks and estimating effort for each phase (e.g., audit, setup, component migration, testing).
- Include milestones for incremental progress (e.g., functional iOS build, cross-platform testing).

## 8. Backend Compatibility Verification
- Verify that the existing REST API requires no changes for React Native integration.
- Check for potential issues (e.g., CORS, authentication, API response formats) and suggest fixes if needed to ensure seamless frontend-backend communication.

---

Deliver a concise, actionable plan in a structured format (e.g., numbered sections or bullet points). Assume the app is medium-sized with a modular component structure and standard REST API integration. Focus on Expo compatibility and cross-platform performance. Present the plan for review before any implementation.
