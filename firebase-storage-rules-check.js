// Firebase Storage rules should be:
// rules_version = '2';
// service firebase.storage {
//   match /b/{bucket}/o {
//     match /{allPaths=**} {
//       allow read, write: if true; // TEMPORARY - for testing
//     }
//   }
// }