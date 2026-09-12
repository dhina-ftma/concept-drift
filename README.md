# Concept Drift

> **How short can you make the conceptual connection between two unrelated things?**

Concept Drift is an experimental web game and interactive network visualization where players navigate a dynamic living web of ideas from a starting concept to an unrelated destination in as few steps as possible.

## Features

- **Living Conceptual Web**: Built with high-performance 2D HTML5 Canvas rendering hundreds of latent dust motes and organic glowing nodes.
- **Progressive Exploration**: Each step presents 3–5 semantically defensible neighbors. The graph grows dynamically as you explore.
- **Shortest-Path Logic**: True BFS graph search calculates the shortest path discovered in the conceptual graph.
- **Drift Scoring**: Tracks steps taken, theoretical minimum path, drift distance, and conceptual efficiency.
- **Backtracking**: Click any earlier concept in your breadcrumb journey to backtrack and explore alternative branches.
- **Dark, Controlled-Chaos Aesthetic**: Deep obsidian background, pulsing destination beacons, glowing conduit paths, and dynamic hover labels.
- **Generative Soundscape**: Ambient sub-bass resonance and crystalline micro-interaction chimes using Web Audio API.
- **Dual-Engine Architecture**: Runs 100% out-of-the-box with a rich built-in Semantic Knowledge Engine, with instant automatic upgrade to Google Gemini or OpenAI when an API key is provided.

## Quick Start

### 1. Launch the Server
Double-click `bin\run.bat` or run:
```cmd
cd c:\useless\concept-drift
.\bin\run.bat
```

### 2. Open in Browser
Visit [http://localhost:3000](http://localhost:3000)

### 3. (Optional) Configure Live AI API
```powershell
$env:GEMINI_API_KEY = "your_key_here"
# or
$env:OPENAI_API_KEY = "your_key_here"
node server/server.js
```
