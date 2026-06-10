# Project Guidelines

This project is a local-first German vocabulary learning web app based on Goethe vocabulary lists.

## Core principle
Prioritize the learning loop over visual polish.

Build in this order:
1. Local data storage
2. Vocabulary list and search
3. German pronunciation with Web Speech API
4. Test modes
5. Answer checking
6. StudyState updates
7. Review scheduling
8. Import/export
9. UI polish

## Tech stack
Use Vite, React, TypeScript, IndexedDB, and Dexie.js.
Do not add a backend, account system, cloud sync, or cloud TTS.

## MVP scope
Complete the A-series vocabulary first, meaning A1 and A2.
After the A-series data is complete, B1+ vocabulary may be added in level order.
Do not implement an AI tutor, pronunciation scoring, social features, or advanced analytics.

## Data model
Follow the Vocab, StudyState, TestSession, and AppSettings structures described in docs/PROJECT_SPEC.md.

## Development rule
At the start of every development session, read `DEVELOPMENT_LOG.md` first.
Use it to understand what has already been built, what was verified, known caveats, and the recommended next work.
After reading it, continue from the next unfinished item without asking the user to restate prior context unless the log is missing or contradictory.
Update `DEVELOPMENT_LOG.md` whenever meaningful development work is completed, verified, or intentionally deferred.
At the end of every development session, commit meaningful completed changes and always push the current branch to GitHub.

Implement one phase at a time.
After each phase, verify that the app runs locally and that data persists after refresh.

## Testing
When adding logic for answer checking, review scheduling, import/export, or German normalization, add simple unit tests where practical.
