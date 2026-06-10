# GerGer Development Log

Last updated: 2026-06-11 02:20 KST

## Project Summary

GerGer is a local-first German vocabulary learning web app for Goethe A1/A2 vocabulary.

Current stack:
- Vite
- React
- TypeScript
- IndexedDB
- Dexie.js
- No backend, accounts, cloud sync, cloud TTS, or AI tutor

## Current Implementation Status

Completed from the project phase order:

1. Local data storage
   - Dexie database is defined in `src/db/appDb.ts`.
   - Tables exist for `vocabs`, `studyStates`, `testSessions`, `settings`, `datasetMeta`, and `importLogs`.
   - Sample A1/A2 vocabulary is seeded from `src/data/sampleVocabulary.ts`.
   - Default app settings are seeded and loaded through `seedAppData()`, `seedDefaultSettings()`, and `getAppSettings()`.

2. Vocabulary list and search
   - `src/pages/VocabularyPage.tsx` lists stored vocabulary from IndexedDB.
   - Search works across German display text, lemma, Korean glosses, examples, and tags.
   - Level filter supports `A1`, `A2`, and `A1+A2`.
   - Part-of-speech filter supports noun, verb, adjective, adverb, phrase, and other.
   - Each row shows level, part of speech, study count, and Leitner-style box.

3. German pronunciation with Web Speech API
   - `src/lib/speech.ts` wraps browser `speechSynthesis`.
   - Vocabulary rows include a pronunciation button.
   - Test listening mode can play the German prompt.
   - Default playback is slightly slower than before, and 0.5x playback is available from the adjusted base speed.
   - Vocabulary rows and listening tests both expose 0.5x playback controls.
   - TTS uses local browser speech synthesis only.

4. Test modes
   - `src/pages/TestPage.tsx` adds a usable practice page.
   - Supported modes:
     - German to Korean meaning
     - Korean to German spelling
     - Listening spelling
     - Article
     - Mixed
     - Learn new
     - Review wrong
   - After checking an answer, pressing Enter advances to the next question or summary.
   - Test sessions are persisted in `testSessions`.

5. Answer checking
   - `src/lib/answerChecking.ts` implements normalization and answer checks.
   - Korean meaning answers accept split glosses such as `거리, 도로`.
   - German answers support relaxed case and umlaut transliteration when settings allow it.
   - Article omission can be allowed or disallowed through settings.

6. StudyState updates
   - Submitting an answer updates `StudyState` in IndexedDB.
   - Counts are tracked for seen, correct, wrong, article, spelling, and listening results.
   - Vocabulary page reflects persisted study state after refresh.

7. Review scheduling
   - `src/lib/reviewScheduling.ts` updates `box`, `difficulty`, `lastStudiedAt`, and `nextReviewAt`.
   - Wrong answers reset the box to 0.
   - Correct answers advance the box up to 6.
   - Review mode prioritizes wrong and due words.

Not completed yet:
- Import/export
- Full Goethe A1/A2 dataset import pipeline
- UI polish beyond functional layout
- Settings screen for changing TTS/test preferences

## Files Added Or Changed

Added:
- `src/pages/TestPage.tsx`
- `src/lib/answerChecking.ts`
- `src/lib/reviewScheduling.ts`
- `src/lib/speech.ts`
- `tests/answerChecking.test.ts`
- `tests/reviewScheduling.test.ts`
- `tests/speech.test.ts`

Changed:
- `src/db/appDb.ts`
- `src/pages/VocabularyPage.tsx`
- `src/routes/AppRoutes.tsx`
- `src/App.tsx`
- `src/App.css`
- `package.json`

## Verification Performed

Commands that passed:

```sh
node --experimental-strip-types --test tests/*.test.ts
node_modules/.bin/tsc -b
node_modules/.bin/vite build
```

Browser verification performed at:

```text
http://127.0.0.1:5173/
```

Confirmed in the browser:
- Vocabulary list loads from IndexedDB.
- Vocabulary rows show normal and 0.5x pronunciation controls.
- Search filter works.
- Test page starts a session.
- Answer submission saves a result.
- After a result is shown, Enter advances to the next test question.
- Listening mode shows both `Play` and `0.5x` controls.
- `StudyState` persists after refresh.
- Browser console had no warnings or errors during the final check.

## Environment Notes

- The Codex shell had `node` available at `/Applications/Codex.app/Contents/Resources/node`.
- `npm`, `npx`, `pnpm`, and `yarn` were not available in PATH during the session.
- Use local binaries directly when needed, for example:

```sh
node_modules/.bin/tsc -b
node_modules/.bin/vite build
node_modules/.bin/vite --host 127.0.0.1
```

- Starting the Vite dev server required elevated approval because the sandbox blocked binding to `127.0.0.1:5173`.

## Current Dev Server

The local dev server was started successfully at:

```text
http://127.0.0.1:5173/
```

If a future session starts fresh, check whether a server is already running before starting another one.

## Recommended Next Work

Continue from the next uncompleted project phase:

1. Import/export
   - Add JSON export for `vocabs`, `studyStates`, `testSessions`, `settings`, `datasetMeta`, and `importLogs`.
   - Add JSON import with validation, counters for added/updated/skipped records, and `importLogs` entries.
   - Add simple unit tests for import validation and merge behavior where practical.

2. Settings screen
   - Let the user change default level, daily counts, TTS rate, repeat count, strict umlaut/case, and article omission.
   - Persist changes to the `settings` table.

3. Dataset expansion
   - Add or import a fuller A1/A2 Goethe vocabulary dataset.
   - Keep B1+ out of scope.

4. UI polish
   - Improve spacing, empty states, and mobile ergonomics after the learning loop and import/export are stable.

## Known Caveats

- `docs/PROJECT_SPEC.md` was referenced in `AGENTS.md`, but it was not present in the workspace during this session.
- A `.docx` planning document exists at the project root.
- The current vocabulary is still a small sample dataset, not the full Goethe A1/A2 list.
- Browser verification answers were submitted during testing, so the local browser profile may show increased counts for a few sample words.
