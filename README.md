---
title: AI Video Agent
sdk: docker
---
# 🎬 AI Video Studio Dashboard

![Status](https://img.shields.io/badge/Status-Active-emerald?style=for-the-badge)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Whisper](https://img.shields.io/badge/Whisper_Core-black?style=for-the-badge)

**AI Video Studio** is an advanced video analysis and production workspace. It allows users to upload local media tracks into a server cache and utilize on-demand, high-yield asset generators to distill operational target analytics without reprocessing the physical media on disk. 

Engineered for speed and utility, the dashboard provides everything from structural transcripts to synthetic graphic thumbnails in a single, cinematic interface.

---

## ✨ Core Features & AI Tools Menu

### 📤 Media Ingestion & Processing
* **Multi-Format Support:** Seamlessly upload standard high-definition container profiles and audio formats, including **.MP4, .MOV, .MKV, .MP3, and .WAV**.
* **Initialize Video Cache:** Caches media locally for rapid processing across multiple AI pipelines without re-uploading.
* **Transcript Indices:** Instantly generates highly accurate transcripts for the uploaded media.
* **🌍 Dynamic Translation Pipeline:** The engine automatically detects the language of the uploaded media. If a non-English track is detected, a conditional "Translate to English" module dynamically renders in the UI, allowing for seamless 1-click localization.

### 🛠️ High-Yield Asset Generators
* **📝 Core Summary:** Condenses extensive video transcripts into highly readable, core summaries.
* **🏷️ Video Titles & SEO Description:** Automatically generates optimized titles and descriptions for YouTube/SEO ranking.
* **📚 High-Yield Study Notes:** Extracts key logic points and structural details into formatted study notes.
* **📱 10 Viral Reels Markers (Shorts & Clips):** Identifies and isolates top engaging moments to generate ideas for viral short-form content.
* **❤️ Highlight Peak Moments:** Scans the timeline to pinpoint the highest emotional or retention-heavy climax of the video.

### 🎨 AI Graphic Thumbnail & Synthesis Layer
* **Thumbnail Prompt Generation:** Analyzes the video context to write highly detailed compositional prompts (e.g., *“A solitary figure stands at the edge of a precipice, bathed in the warm golden light...”*).
* **Generative Synthesis Layer:** Renders the synthetic thumbnail directly within the dashboard's Output Console.
* **One-Click High-Res Export:** Save the generated poster framework directly as a `.jpg`.

### 💬 Contextual Conversational Agent
* **"Ask About Video":** A dedicated chat interface allowing users to query structural details, specific references, or logic points extracted directly from the mapped video transcript layout.

---

## 💻 Tech Stack
* **Frontend:** React (Dark-themed Dashboard UI)
* **Backend:** FastAPI Engine
* **AI & Processing:** Whisper Core for audio transcription, advanced LLMs for text synthesis, and Image Generative APIs for thumbnails.

---

## 🚀 Local Installation & Setup

### **1. Backend Setup (FastAPI Engine)**
1. Navigate to the backend directory:
   ```bash
   cd backend
