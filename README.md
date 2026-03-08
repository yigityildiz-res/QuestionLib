# Question Library

A fully **local** web application for organizing and reviewing video solutions for any question set. No internet connection is needed — everything runs on your machine.

---

## Features

| Feature | Description |
|---|---|
| **Library Mode** | Browse video solutions organized in a Course → Unit → Test hierarchy via an accordion sidebar menu |
| **Review Mode** | Randomly presents questions from your vault to test yourself |
| **Answer Checking** | Select an answer (A–E); the app checks it against the stored answer if one exists |
| **Question Images** | Optionally display a companion image alongside the question |
| **"Don't Show This Again"** | Hide individual questions to progressively narrow the review pool |
| **Save Slots** | Multiple independent save slots so you can start fresh sessions with different settings |
| **Course Filters** | Toggle entire courses on/off in review mode |
| **Vault History** | Recently opened vaults are remembered and listed for quick access |
| **Range Requests** | The local server supports HTTP Range requests, enabling proper video seeking |

---

## Requirements

- **Python 3.10+** (for the `str | None` union type syntax used in `server.py`)
- **tkinter** — included with most standard Python installations on Windows. Required only for the "Browse" folder picker button; everything else works without it.
- A modern web browser (Chrome, Edge, Firefox)

---

## Quick Start

### Option A — Double-click (Windows)
1. Open the `QuestionLib` project folder.
2. Double-click **`start.bat`**.
3. Your browser opens automatically at `http://localhost:8000`.
4. Select your vault folder and start browsing.

### Option B — Command line
```bash
# From the project root directory:
python server.py 8000
```
Then open `http://localhost:8000` in your browser.

> **Why a local server?** Browsers block direct `file://` access to local resources for security reasons. The Python server sidesteps this limitation without any external dependencies.

---

## Vault Structure

A **vault** is any folder that follows this directory layout:

```
MyVault/
├── Mathematics/
│   ├── Algebra/
│   │   ├── 001.mp4
│   │   ├── 001.png     ← optional companion image for the question
│   │   ├── 002.mp4
│   │   └── 003.mp4
│   └── Calculus/
│       ├── 001.mp4
│       └── 002.mp4
└── Physics/
    └── Mechanics/
        ├── 001.mp4
        └── 001.png
```

**Rules:**
- **Level 1** subdirectories → Courses (e.g. *Mathematics*, *Physics*)
- **Level 2** subdirectories → Units (e.g. *Algebra*, *Mechanics*)
- **Files** inside Level 2 → Questions (any of: `.mp4`, `.webm`, `.ogg`, `.mov`, `.mkv`, `.avi`)
- An image file (`.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`) with the **same stem** as a video file is automatically treated as that question's companion image.

The vault folder itself can be located **anywhere** on your filesystem — it does not need to be inside the project directory.

---

## Encoding Answers in Filenames

Review mode can check your answer against the correct one — but only if the correct answer is embedded in the video filename.

**Convention:** append `_<LETTER>` (A–E) at the end of the filename stem, just before the extension.

```
FIZ_BA_001_A.mp4    →  correct answer: A
MAT_LIM_005_C.mp4   →  correct answer: C
FIZ_OP_003_E.mp4    →  correct answer: E
FIZ_BA_002.mp4      →  no answer stored (only the solution video can be watched)
```

**How it works:**
- The server reads the `_X` suffix when scanning the vault and includes `"answer": "A"` in the JSON it sends to the browser.
- The answer letter is **stripped from the displayed title** in the UI, so the user never sees it before answering. `FIZ_BA_001_A.mp4` appears as `Question 1  [FIZ_BA_001]`.
- The suffix is **case-insensitive** — `_a` and `_A` both work.
- If no valid suffix is found, the question is still shown in review mode; selecting an answer will display an "no answer recorded — watch the solution" message.

---

## Project Structure

```
QuestionLib/
├── index.html        # Single-page application shell
├── server.py         # Python local HTTP server + /api/* endpoints
├── start.bat         # Windows launcher (starts server + opens browser)
├── css/
│   └── style.css     # All styles (dark theme, layout, components)
├── js/
│   └── app.js        # All application logic (vault scan, menu, review mode)
└── README.md
```

---

## API Endpoints

The Python server exposes three API routes in addition to serving static files:

| Endpoint | Method | Description |
|---|---|---|
| `GET /api/scan?path=<dir>` | GET | Scans a vault directory and returns the course/unit/question hierarchy as JSON |
| `GET /api/browse` | GET | Opens a native OS folder picker dialog (requires tkinter) and returns the selected path |
| `GET /api/file?p=<abs_path>` | GET | Proxies a file from an absolute path outside the project directory (used for vaults stored elsewhere) |

---

## Data Format

The `/api/scan` endpoint returns a JSON array. Example response:

```json
[
  {
    "id": "mathematics",
    "title": "Mathematics",
    "units": [
      {
        "id": "mathematics-algebra",
        "title": "Algebra",
        "tests": [
          {
            "id": "mathematics-algebra-t1",
            "title": "Algebra",
            "questions": [
              {
                "id": "mathematics-algebra-t1-001",
                "title": "Question 1  [001]",
                "video": "/api/file?p=C%3A%5CMyVault%5CMathematics%5CAlgebra%5C001.mp4",
                "image": "/api/file?p=C%3A%5CMyVault%5CMathematics%5CAlgebra%5C001.png"
              }
            ]
          }
        ]
      }
    ]
  }
]
```

---

## Troubleshooting

| Problem | Solution |
|---|---|
| **"No recognised video files found"** | Check that your folder follows the 3-level structure (Course/Unit/video.mp4). Files placed directly inside the vault root or at level 1 are ignored. |
| **Browse button doesn't work** | Make sure `tkinter` is installed. On some minimal Python distributions it may be missing. Install it or type the path manually. |
| **Video doesn't seek / jumps back** | This is usually caused by a missing `Accept-Ranges` header. Ensure you are using `server.py` and **not** Python's built-in `http.server` module. |
| **Port already in use** | Change the port: `python server.py 9000`, then go to `http://localhost:9000`. |
| **Browser doesn't open automatically** | `start.bat` uses the Windows `start` command. If it fails, open your browser and navigate to `http://localhost:8000` manually. |
