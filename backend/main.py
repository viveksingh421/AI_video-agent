# main.py
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from faster_whisper import WhisperModel
from moviepy import VideoFileClip

import requests
import shutil
import uuid
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

app = FastAPI(title="AI Video Studio Pro", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
GENERATED_DIR = "generated"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(GENERATED_DIR, exist_ok=True)

app.mount("/generated", StaticFiles(directory=GENERATED_DIR), name="generated")
SESSIONS = {}

print("Loading Whisper Model...")
model = WhisperModel("small", device="cpu", compute_type="int8", cpu_threads=4)
print("Whisper Loaded Successfully")

def chunk_text(text, chunk_size=4000):
    return [text[i:i + chunk_size] for i in range(0, len(text), chunk_size)]

def save_text_file(filename, content):
    path = os.path.join(GENERATED_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    return path

def query_llm(system_prompt, user_prompt, temperature=0.4):
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": temperature
    }
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=120)
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM API Failure: {str(e)}")

class ChatRequest(BaseModel):
    session_id: str
    question: str

class ToolRequest(BaseModel):
    session_id: str
    task: str

@app.get("/")
def home():
    return {"status": "online"}

@app.post("/upload/")
def upload_video(file: UploadFile = File(...)):
    session_id = str(uuid.uuid4())
    extension = file.filename.split(".")[-1]
    filename = f"{session_id}.{extension}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    _, info = model.transcribe(filepath, beam_size=1)

    with VideoFileClip(filepath) as clip:
        duration = round(clip.duration, 2)

    SESSIONS[session_id] = {
        "file_path": filepath,
        "language": info.language,
        "duration": duration,
        "transcript": "",
        "translation": "",
        "summary": "",
        "created_at": str(datetime.now())
    }
    return {"success": True, "session_id": session_id, "language": info.language, "duration": duration}

@app.get("/transcript/{session_id}")
def generate_transcript(session_id: str):
    if session_id not in SESSIONS:
        return {"success": False, "error": "Invalid Session"}

    session = SESSIONS[session_id]
    filepath = session["file_path"]

    segments, _ = model.transcribe(filepath, beam_size=5)
    transcript_lines = [f"[{round(s.start,2)}s - {round(s.end,2)}s] {s.text.strip()}" for s in segments]
    transcript = "\n".join(transcript_lines)
    session["transcript"] = transcript

    translation = ""
    if session["language"] != "en":
        t_segments, _ = model.transcribe(filepath, beam_size=5, task="translate")
        t_lines = [f"[{round(s.start,2)}s - {round(s.end,2)}s] {s.text.strip()}" for s in t_segments]
        translation = "\n".join(t_lines)
        session["translation"] = translation

    save_text_file(f"{session_id}_transcript.txt", transcript)
    return {"success": True, "transcript": transcript, "translation": translation}

@app.get("/summary/{session_id}")
def generate_summary(session_id: str):
    if session_id not in SESSIONS:
        return {"success": False, "error": "Invalid Session"}

    session = SESSIONS[session_id]
    source = session["translation"] or session["transcript"]
    if not source:
        return {"success": False, "error": "No transcript available"}

    chunks = chunk_text(source)
    summaries = []
    for chunk in chunks:
        result = query_llm("You are an expert assistant.", f"Summarize this transcript section cleanly:\n\n{chunk}", temperature=0.3)
        summaries.append(result)

    final_summary = "\n\n".join(summaries)
    session["summary"] = final_summary
    return {"success": True, "summary": final_summary}

@app.post("/tools/")
def tools(payload: ToolRequest):
    if payload.session_id not in SESSIONS:
        return {"success": False, "error": "Invalid Session"}

    session = SESSIONS[payload.session_id]
    transcript = session["translation"] or session["transcript"]
    safe_transcript = transcript[:25000] 

    if payload.task == "notes":
        result = query_llm("You are an educator.", f"Create clear study notes and bullet points from this text:\n\n{safe_transcript}")
        return {"success": True, "result": result}

    elif payload.task == "clips":
        result = query_llm("You are a viral video editor.", f"Find the 10 most exciting or funny parts of this video. Give their exact timestamps and write down a brief description of what happens so I can cut them into vertical Reels or Shorts:\n\n{safe_transcript}", temperature=0.6)
        return {"success": True, "result": result}

    elif payload.task == "thumbnail":
        result = query_llm(
            "You are an expert AI Image Prompt Engineer.",
            f"Based on this video content, write a highly descriptive, cinematic single-paragraph image generation prompt for a YouTube thumbnail. Describe lighting, focal point, context, and aesthetic mood. Do not use quotes or markdown:\n\n{safe_transcript}",
            temperature=0.7
        )
        return {"success": True, "result": result}

    elif payload.task == "titles":
        result = query_llm("You are a marketing expert.", f"Generate 15 catchy, high-CTR video titles based on this transcript:\n\n{safe_transcript}", temperature=0.8)
        return {"success": True, "result": result}

    elif payload.task == "description":
        result = query_llm("You are an SEO writer.", f"Create an optimized video description with an introduction paragraph, key timestamps, and relevant trending hashtags:\n\n{safe_transcript}")
        return {"success": True, "result": result}

    return {"success": False, "error": "Unknown Task"}

@app.post("/chat/")
def chat(payload: ChatRequest):
    if payload.session_id not in SESSIONS:
        return {"answer": "Error: Invalid Session"}

    session = SESSIONS[payload.session_id]
    transcript = session["translation"] or session["transcript"]
    
    answer = query_llm(
        "You are a helpful assistant. Answer questions based on the video transcript, referencing timestamps if possible.",
        f"Transcript:\n{transcript[:25000]}\n\nQuestion:\n{payload.question}",
        temperature=0.3
    )
    return {"answer": answer}