# English Global Exam · 4º ESO

A static revision site for the 4º ESO English global exam (5 units).

## Features
- **Vocabulary** — list view, flashcards, and a translation quiz, by unit and section.
- **Grammar** — reference notes for present tenses, cleft sentences, inversion, the passive, participle clauses, past modals and emphatic comparatives.
- **Training** — mixed exercise sessions (gap-fill, multiple choice, transformation, translation, matching) with instant feedback.
- **Exam maker** — pick units and sections, choose how many of each exercise type, and download a printable PDF (with optional answer key).

## Run locally
Open `index.html` in a browser, or serve the folder:
```
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Deploy to GitHub Pages
1. Create an empty GitHub repo (e.g. `global-ingles`).
2. From this folder:
   ```
   git init
   git add .
   git commit -m "Initial revision site"
   git branch -M main
   git remote add origin git@github.com:<your-user>/global-ingles.git
   git push -u origin main
   ```
3. In your repo settings → **Pages**, set Source = `Deploy from a branch`, Branch = `main`, Folder = `/ (root)`.
4. Your site will be at `https://<your-user>.github.io/global-ingles/`.

## Structure
```
index.html      # entry point
styles.css      # all styling
app.js          # vocab / grammar / training / PDF generator
data/
  vocab.js      # word lists per unit and section
  grammar.js    # grammar reference content per unit
  exercises.js  # pre-made exercises tagged by unit/type/topic
.nojekyll       # tells GitHub Pages not to run Jekyll
```

## Adding more exercises
Each exercise in `data/exercises.js` looks like:
```js
{ type: "gap-fill", unit: 1, topic: "Present tenses",
  prompt: "He ___ (frequently / forget) to do his homework.",
  answer: "frequently forgets",
  alts: ["frequently forgets"] }
```
Types: `gap-fill`, `multiple-choice`, `transformation`, `translation`, `matching`. Drop new entries into the relevant `unitN` array and they appear automatically in training and the exam maker.
