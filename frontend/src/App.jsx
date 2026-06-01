// App.jsx
import React, { useState, useRef } from "react";
import axios from "axios";
import { 
  FileVideo, Upload, Sparkles, MessageSquare, FileText, 
  Layers, Flame, Image as ImageIcon, FileDown, Send, HelpCircle, Copy, Check
} from "lucide-react";

const BACKEND_URL = "http://localhost:8000";

const CREATOR_QUOTES = [
  "Creativity is intelligence having fun.",
  "Content is King, but consistency is Queen.",
  "The secret to getting ahead is getting started.",
  "Your next viral moment is just moments away. AI is working...",
  "Don't wait for inspiration. Work while you wait.",
  "Making the world better, one frame at a time."
];

export default function App() {
  const [file, setFile] = useState(null);
  const [mediaUrl, setMediaUrl] = useState(""); 
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState("");
  const [activeQuote, setActiveQuote] = useState(""); 
  
  const [sessionId, setSessionId] = useState(null);
  const [detectedLanguage, setDetectedLanguage] = useState("");
  const [copied, setCopied] = useState(false); 
  
  const [transcript, setTranscript] = useState("");
  const [translation, setTranslation] = useState("");
  const [summary, setSummary] = useState("");
  
  const [activeTab, setActiveTab] = useState("transcript"); 
  const [toolResult, setToolResult] = useState("");
  const [activeTool, setActiveTool] = useState("");
  const [toolLoading, setToolLoading] = useState(false);
  
  const [chatInput, setChatInput] = useState("");
  const [chatLog, setChatLog] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);

  const fileInputRef = useRef(null);
  const mediaRef = useRef(null); 

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setMediaUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleUploadAndProcess = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    setUploading(true);
    setUploadProgress(0);
    setUploadStatusText("Uploading media file...");
    setActiveQuote(CREATOR_QUOTES[Math.floor(Math.random() * CREATOR_QUOTES.length)]);

    try {
      const response = await axios.post(`${BACKEND_URL}/upload/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percent);
          if (percent === 100) {
            setUploadStatusText("Transcribing & analyzing text...");
          }
        }
      });

      if (response.data.success) {
        setSessionId(response.data.session_id);
        setDetectedLanguage(response.data.language.toUpperCase());
        
        const transRes = await axios.get(`${BACKEND_URL}/transcript/${response.data.session_id}`);
        if (transRes.data.success) {
          setTranscript(transRes.data.transcript);
          setTranslation(transRes.data.translation);
        }
        setUploading(false);
        setActiveTab("transcript");
      }
    } catch (error) {
      console.error(error);
      alert("Upload failed. Check backend connection.");
      setUploading(false);
    }
  };

  const handleTimestampClick = (seconds) => {
    if (mediaRef.current) {
      mediaRef.current.currentTime = seconds;
      mediaRef.current.play().catch((err) => console.log("Playback interaction deferred:", err));
    }
  };

  const handleCopyId = () => {
    if (!sessionId) return;
    navigator.clipboard.writeText(sessionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderTextWithTimestamps = (text) => {
    if (!text) return "";
    const cleanMarkdownText = text.replace(/\*\*/g, "");
    const timestampRegex = /(\[\d+(?:\.\d+)?s?\s*(?:-\s*\d+(?:\.\d+)?s?)?\])/g;
    const parts = cleanMarkdownText.split(timestampRegex);

    return parts.map((part, index) => {
      const match = part.match(/\[(\d+(?:\.\d+)?)/);
      if (match) {
        const startTimeInSeconds = parseFloat(match[1]);
        return (
          <button
            key={index}
            onClick={() => handleTimestampClick(startTimeInSeconds)}
            className="px-1.5 py-0.5 mx-0.5 my-[2px] rounded bg-cyan-500/10 hover:bg-cyan-500/30 text-cyan-400 font-mono text-[11px] font-bold border border-cyan-500/20 active:scale-95 transition-all inline-block align-middle cursor-pointer"
          >
            {part}
          </button>
        );
      }
      return part;
    });
  };

  const triggerToolTask = async (taskName) => {
    if (!sessionId) return;
    setToolLoading(true);
    setActiveTool(taskName);
    setToolResult("");

    try {
      const response = await axios.post(`${BACKEND_URL}/tools/`, {
        session_id: sessionId,
        task: taskName
      });
      
      if (response.data.success) {
        setToolResult(response.data.result || response.data.prompt);
      }
    } catch (error) {
      setToolResult("An error occurred while generating content.");
    } finally {
      setToolLoading(false);
    }
  };

  const fetchSummary = async () => {
    if (!sessionId) return;
    if (summary) { setActiveTab("summary"); return; }
    setToolLoading(true);
    setActiveTool("summary"); // Track tool for loader text
    try {
      const response = await axios.get(`${BACKEND_URL}/summary/${sessionId}`);
      if (response.data.success) {
        setSummary(response.data.summary);
        setActiveTab("summary");
      }
    } catch (error) {
      alert("Failed to generate summary.");
    } finally {
      setToolLoading(false);
    }
  };

  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !sessionId) return;
    const userMsg = chatInput.trim();
    setChatLog((prev) => [...prev, { sender: "user", text: userMsg }]);
    setChatInput("");
    setChatLoading(true);

    try {
      const response = await axios.post(`${BACKEND_URL}/chat/`, {
        session_id: sessionId,
        question: userMsg
      });
      setChatLog((prev) => [...prev, { sender: "ai", text: response.data.answer }]);
    } catch (error) {
      setChatLog((prev) => [...prev, { sender: "ai", text: "Failed to get response." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const downloadTextFile = (content, defaultFilename) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = defaultFilename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getToolLabel = (id) => {
    if (id === "titles") return "Optimized Video Titles";
    if (id === "description") return "SEO Meta Description";
    if (id === "thumbnail") return "Thumbnail Generation Prompt";
    if (id === "notes") return "Academic Study Notes";
    if (id === "clips") return "Shorts & Reels Clips Idea";
    return id;
  };

  // DYNAMIC LOADING PHRASES BASED ON THE SELECTED ACTION
  const getLoadingMessage = (toolId) => {
    switch (toolId) {
      case "summary":
        return "Synthesizing deep video context and compiling summary layout...";
      case "titles":
        return "Analyzing video retention hooks to formulate click-worthy title options...";
      case "description":
        return "Generating SEO metadata structure and keyword-rich timeline chapters...";
      case "thumbnail":
        return "Drafting cinematic visual descriptions and engineering Midjourney prompts...";
      case "notes":
        return "Extracting technical concepts and organizing comprehensive study notes...";
      case "clips":
        return "Scanning timestamp patterns to isolate high-retention viral segments...";
      default:
        return "Executing neural network pipelines and organizing workspace frames...";
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col selection:bg-cyan-500 selection:text-black">
      
      {/* HEADER SECTION */}
      <header className="border-b border-zinc-800 bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-cyan-500 to-indigo-600 rounded-xl shadow-lg shadow-cyan-500/20">
            <Sparkles className="w-6 h-6 text-black stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white">AI VIDEO STUDIO</h1>
            <p className="text-[10px] text-cyan-400/80 tracking-widest font-mono uppercase">Dashboard</p>
          </div>
        </div>
        {sessionId && (
          <button 
            onClick={handleCopyId}
            className={`flex items-center gap-2 px-3 py-1.5 border rounded-full text-xs font-mono transition-all cursor-pointer group active:scale-95
              ${copied ? "bg-emerald-950/30 border-emerald-500/50 text-emerald-400" : "bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-300"}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${copied ? "bg-emerald-400" : "bg-cyan-400 animate-pulse"}`} />
            <span>ID: <span className={copied ? "text-emerald-400" : "text-cyan-400 font-bold"}>{sessionId.substring(0, 8)}</span></span>
            <span className="text-zinc-700">|</span>
            <span className="text-indigo-400 font-bold">{detectedLanguage}</span>
            <span className="ml-1 opacity-40 group-hover:opacity-100 transition-opacity">
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </span>
          </button>
        )}
      </header>

      {/* SYSTEM GRID WORKSPACE */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-6 flex flex-col lg:flex-row gap-6">
        
        {/* SIDEBAR CONTAINER */}
        <div className="w-full lg:w-[380px] flex flex-col gap-5 shrink-0">
          
          {/* MEDIA UPLOADER CARD */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 backdrop-blur-sm shadow-xl flex flex-col gap-4">
            <h2 className="text-sm font-bold tracking-wider uppercase text-zinc-400 flex items-center gap-2">
              <FileVideo className="w-4 h-4 text-cyan-400" /> Upload Video or Audio
            </h2>

            {!sessionId ? (
              <div className="flex flex-col gap-4">
                <div 
                  onClick={() => fileInputRef.current.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 group
                    ${file ? "border-cyan-500/50 bg-cyan-950/10" : "border-zinc-800 hover:border-zinc-700 bg-zinc-950/20"}`}
                >
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="video/*,audio/*" className="hidden" />
                  <div className="p-3 bg-zinc-900 rounded-xl group-hover:scale-110 transition-transform border border-zinc-800">
                    <Upload className="w-6 h-6 text-zinc-400 group-hover:text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-300">{file ? file.name : "Select Media File"}</p>
                    <p className="text-xs text-zinc-500 mt-1">Supports MP4, MP3, WAV, MKV</p>
                  </div>
                </div>

                {file && !uploading && (
                  <button 
                    onClick={handleUploadAndProcess}
                    className="w-full py-3 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-black font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 fill-black" /> Process Asset
                  </button>
                )}

                {uploading && (
                  <div className="space-y-3 mt-2 bg-zinc-950 p-4 border border-zinc-800 rounded-xl">
                    <div className="flex justify-between items-center text-xs font-mono">

  {uploadProgress === 100 ? (
    <>
      <span className="font-bold text-cyan-400">
        ⚡ AI Transcribing Audio...
      </span>

      <span className="font-bold text-pink-400 animate-pulse">
        Processing
      </span>
    </>
  ) : (
    <>
      <span className="font-bold text-cyan-400">
        📤 Uploading File...
      </span>

      <span className="text-zinc-500 text-[10px]">
        {uploadProgress}%
      </span>
    </>
  )}

</div>
                    
                    <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden p-[2px] border border-zinc-800 relative">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${uploadProgress === 100 ? "bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 animate-pulse" : "bg-gradient-to-r from-cyan-500 to-indigo-500"}`} 
                        style={{ width: uploadProgress === 100 ? "75%" : `${uploadProgress}%` }} 
                      />
                    </div>

                    {uploadProgress === 100 && (
                    <>
                    <p className="text-[10px] text-zinc-500 font-sans leading-tight animate-fade-in">
                    File transferred! Backend Whisper pipeline is now transcribing raw timestamps...
                    </p>
    
                    {/* HIGHLIGHTED CREATOR QUOTE COMPONENT */}
                  <div className="mt-4 p-3.5 bg-gradient-to-r from-purple-950/20 to-zinc-950 border border-zinc-800/60 border-l-2 border-l-purple-500 rounded-r-xl rounded-l-sm text-left shadow-lg">
                  <span className="block text-[9px] uppercase tracking-wider text-purple-400 font-bold font-mono mb-1">
                  💡 Inspiration while you wait
                  </span>

                  <p className="italic text-[12px] text-zinc-200 leading-relaxed font-medium">
                  "{activeQuote}"
                  </p>
                </div>
                </>
                )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-zinc-950 border border-zinc-850 rounded-xl flex flex-col gap-3">
                <div className="flex justify-between items-center bg-emerald-950/10 border border-emerald-500/20 p-2.5 rounded-lg">
                  <p className="text-xs font-medium text-emerald-400">✓ Content Loaded</p>
                  <button 
                    onClick={() => { setSessionId(null); setFile(null); setMediaUrl(""); setTranscript(""); setTranslation(""); setSummary(""); setToolResult(""); }} 
                    className="text-[11px] font-bold text-zinc-400 hover:text-white cursor-pointer"
                  >
                    ✨ Start New Analysis
                  </button>
                </div>

                {mediaUrl && (
                  <div className="overflow-hidden rounded-lg border border-zinc-800 bg-black/40 shadow-inner">
                    {file?.type?.startsWith("audio") ? (
                      <div className="p-2 bg-zinc-900/60 flex flex-col gap-1.5">
                        <p className="text-[10px] font-mono text-cyan-400 truncate px-1">🎵 {file.name}</p>
                        <audio ref={mediaRef} src={mediaUrl} controls className="w-full h-8 accent-cyan-500" />
                      </div>
                    ) : (
                      <div className="relative aspect-video w-full bg-black flex items-center">
                        <video ref={mediaRef} src={mediaUrl} controls className="w-full h-full object-contain" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI APPLICATION OPERATIONS DRAWER */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 backdrop-blur-sm shadow-xl flex flex-col gap-3">
            <h2 className="text-sm font-bold tracking-wider uppercase text-zinc-400 flex items-center gap-2 mb-1">
              <Layers className="w-4 h-4 text-indigo-400" /> AI Tools Menu
            </h2>
            
            <button 
              disabled={!sessionId || toolLoading} onClick={() => { setActiveTab("summary"); fetchSummary(); }}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between border ${activeTab === 'summary' ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-900/60 border-zinc-800/60 text-zinc-400 hover:text-white hover:bg-zinc-800/40'} disabled:opacity-40`}
            >
              <span className="flex items-center gap-2.5"><FileText className="w-4 h-4 text-amber-400" /> Summary</span>
              <span className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-500 font-mono">Core</span>
            </button>

            <div className="w-full h-px bg-zinc-800/60 my-1" />

            {[
              { id: "titles", label: "Video Titles", icon: Flame, color: "text-red-400" },
              { id: "description", label: "SEO Description", icon: FileText, color: "text-emerald-400" },
              { id: "thumbnail", label: "Thumbnail Prompt", icon: ImageIcon, color: "text-purple-400" },
              { id: "notes", label: "Study Notes", icon: HelpCircle, color: "text-cyan-400" },
              { id: "clips", label: "Shorts & Reels Clips Idea", icon: Layers, color: "text-pink-400" }
            ].map((tool) => (
              <button
                key={tool.id}
                disabled={!sessionId || toolLoading}
                onClick={() => { setActiveTab("tools"); triggerToolTask(tool.id); }}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between border disabled:opacity-40
                  ${activeTool === tool.id && activeTab === "tools" ? "bg-zinc-800 border-zinc-700 text-white" : "bg-zinc-900/60 border-zinc-800/60 text-zinc-400 hover:text-white hover:bg-zinc-800/40"}`}
              >
                <span className="flex items-center gap-2.5">
                  <tool.icon className={`w-4 h-4 ${tool.color}`} /> {tool.label}
                </span>
                {activeTool === tool.id && toolLoading && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />}
              </button>
            ))}
          </div>

        </div>

        {/* WORKSPACE VIEWPORT PANEL */}
        <div className="flex-1 bg-zinc-900/20 border border-zinc-800/60 rounded-3xl flex flex-col min-w-0 overflow-hidden shadow-2xl backdrop-blur-sm">
          
          {/* TAB BAR HEADER CONTAINER */}
          <div className="border-b border-zinc-800/80 bg-zinc-950/40 px-6 py-2.5 flex justify-between items-center overflow-x-auto gap-4">
            <div className="flex items-center gap-2">
              <button 
                disabled={!sessionId} onClick={() => setActiveTab("transcript")}
                className={`py-2 px-4 rounded-lg text-xs font-bold tracking-wide transition-all ${activeTab === "transcript" ? "bg-zinc-800 text-cyan-400 border border-zinc-700" : "text-zinc-400 hover:text-zinc-200"}`}
              >
                Transcript
              </button>
              <button 
                disabled={!sessionId} onClick={() => setActiveTab("chat")}
                className={`py-2 px-4 rounded-lg text-xs font-bold tracking-wide transition-all ${activeTab === "chat" ? "bg-zinc-800 text-indigo-400 border border-zinc-700" : "text-zinc-400 hover:text-zinc-200"}`}
              >
                Ask About Video
              </button>
              
              {activeTab === "summary" && (
                <button className="py-2 px-4 rounded-lg text-xs font-bold tracking-wide transition-all bg-zinc-800 text-amber-400 border border-zinc-700">
                  Core Summary
                </button>
              )}
              {activeTab === "tools" && (
                <button className="py-2 px-4 rounded-lg text-xs font-bold tracking-wide transition-all bg-zinc-800 text-purple-400 border border-zinc-700">
                  {getToolLabel(activeTool)}
                </button>
              )}
            </div>

            {sessionId && (activeTab === "transcript" || (activeTab === "tools" && toolResult) || (activeTab === "summary" && summary)) && (
              <button
                onClick={() => {
                  if (activeTab === "transcript") {
                    downloadTextFile(translation ? `--- ORIGINAL ---\n${transcript}\n\n--- TRANSLATION ---\n${translation}` : transcript, "transcript.txt");
                  } else if (activeTab === "summary") {
                    downloadTextFile(summary, "video_summary.txt");
                  } else {
                    downloadTextFile(toolResult, `${activeTool}_output.txt`);
                  }
                }}
                className="py-1.5 px-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5"
              >
                <FileDown className="w-3.5 h-3.5" /> Export Content
              </button>
            )}
          </div>

          {/* RENDERING ENGINE PANELS */}
          <div className="flex-1 p-6 overflow-y-auto min-h-[450px] max-h-[680px]">
            {!sessionId ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4 text-zinc-500">
                  <FileVideo className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-zinc-200">No Video Loaded</h3>
                <p className="text-xs text-zinc-500 max-w-sm mt-1">Please select and upload a video or audio file to start processing.</p>
              </div>
            ) : (
              <>
                {/* INTERACTIVE TRANSCRIPT DISPLAY TRACK */}
                {activeTab === "transcript" && (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-full items-start">
                    <div className="flex flex-col gap-2">
                      <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider px-1">Original Transcript</h4>
                      <div className="bg-zinc-950/60 border border-zinc-800/80 p-5 rounded-2xl font-mono text-xs leading-relaxed text-zinc-300 overflow-y-auto max-h-[510px] whitespace-pre-wrap select-text">
                        {transcript ? renderTextWithTimestamps(transcript) : "Transcribing text..."}
                      </div>
                    </div>

                    {translation && (
                      <div className="flex flex-col gap-2">
                        <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider px-1">English Translation</h4>
                        <div className="bg-indigo-950/10 border border-indigo-900/30 p-5 rounded-2xl font-mono text-xs leading-relaxed text-indigo-200 overflow-y-auto max-h-[510px] whitespace-pre-wrap select-text">
                          {renderTextWithTimestamps(translation)}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* AI CORE SUMMARY PANEL WITH LOADING GUARD */}
                {activeTab === "summary" && (
                  <div className="min-h-[200px]">
                    {toolLoading ? (
                      <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
                        <p className="text-xs font-mono text-zinc-500 animate-pulse">{getLoadingMessage("summary")}</p>
                      </div>
                    ) : (
                      <div className="bg-zinc-950/40 border border-zinc-800/80 p-6 rounded-2xl whitespace-pre-wrap font-sans text-sm leading-relaxed text-zinc-300 select-text">
                        {renderTextWithTimestamps(summary)}
                      </div>
                    )}
                  </div>
                )}

                {/* CREATOR TOOLS SCREEN LOGIC WITH CONTEXT LOADER UPDATES */}
                {activeTab === "tools" && (
                  <div className="h-full">
                    {toolLoading ? (
                      <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
                        {/* CONTEXT-AWARE PHRASE RENDERER */}
                        <p className="text-xs font-mono text-zinc-500 animate-pulse">{getLoadingMessage(activeTool)}</p>
                      </div>
                    ) : (
                      <>
                        {activeTool === "thumbnail" ? (
                          <div className="flex flex-col gap-5">
                            <div className="relative overflow-hidden rounded-2xl border border-dashed border-zinc-800 bg-gradient-to-br from-zinc-950 to-zinc-900 p-8 text-center flex flex-col items-center justify-center gap-3 group shadow-inner">
                              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-indigo-500/5 to-cyan-500/5 opacity-40 blur-xl" />
                              <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl text-purple-400 shadow-md relative z-10">
                                <Sparkles className="w-8 h-8 animate-pulse" />
                              </div>
                              <div className="relative z-10 max-w-md">
                                <h4 className="text-sm font-bold text-zinc-200 tracking-wide">
                                  Thumbnail Prompt Created
                                </h4>
                                <p className="text-xs text-zinc-500 mt-1">
                                  Your custom prompt is ready below. Copy and paste this into AI tools like Midjourney or DALL-E to generate your thumbnail image.
                                </p>
                              </div>
                            </div>
                            <div className="bg-zinc-950/60 border border-zinc-800/80 p-6 rounded-2xl text-xs font-mono leading-relaxed text-purple-300 shadow-xl relative select-text">
                              <div className="absolute top-3 right-3 text-[10px] font-bold text-purple-500/60 tracking-wider uppercase font-sans border border-purple-500/20 px-2 py-0.5 rounded-md">Engine Blueprint</div>
                              <span className="text-zinc-500 font-sans block font-bold text-[11px] uppercase tracking-wider mb-2">Prompt Output:</span>
                              {toolResult || "Generating prompt sequence code..."}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-zinc-950/40 border border-zinc-800/80 p-6 rounded-2xl whitespace-pre-wrap font-mono text-xs leading-relaxed text-zinc-300 select-text">
                            {toolResult ? renderTextWithTimestamps(toolResult) : "Select an option from the menu to generate content."}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* AGENTIC CONVERSATIONAL CHAT SCREEN CONTAINER */}
                {activeTab === "chat" && (
                  <div className="flex flex-col h-[520px] justify-between bg-zinc-950/40 border border-zinc-800/80 rounded-2xl overflow-hidden">
                    <div className="flex-1 p-4 overflow-y-auto space-y-4">
                      {chatLog.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center p-4">
                          <MessageSquare className="w-8 h-8 text-zinc-700 mb-2" />
                          <p className="text-xs text-zinc-500">Ask specific contextual queries, script edits, or reference content blocks inside this asset file node layer.</p>
                        </div>
                      )}
                      {chatLog.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-xs font-sans leading-relaxed shadow-sm select-text
                            ${msg.sender === "user" ? "bg-gradient-to-r from-cyan-600 to-indigo-600 text-white" : "bg-zinc-900 text-zinc-300 border border-zinc-800"}`}
                          >
                            {renderTextWithTimestamps(msg.text)}
                          </div>
                        </div>
                      ))}
                      {chatLoading && (
                        <div className="flex justify-start">
                          <div className="bg-zinc-900 border border-zinc-800 text-zinc-500 rounded-xl px-4 py-2.5 text-xs font-mono flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" />
                            Synthesizing...
                          </div>
                        </div>
                      )}
                    </div>

                    <form onSubmit={handleSendChatMessage} className="p-3 border-t border-zinc-800 bg-zinc-950/80 flex gap-2 items-center">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Ask a question about the video content..."
                        className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50 transition-all"
                      />
                      <button 
                        type="submit" 
                        disabled={!chatInput.trim() || chatLoading}
                        className="p-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl transition-all disabled:opacity-40 active:scale-95 cursor-pointer"
                      >
                        <Send className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    </form>
                  </div>
                )}
              </>
            )}
          </div>

          {/* SIGNATURE ACCENTED PROJECT FOOTER */}
          <footer className="border-t border-zinc-800/60 bg-zinc-950/30 px-6 py-3 text-center">
            <p className="text-[11px] font-mono tracking-widest text-zinc-600 uppercase">
              Engineered with ⚡ by <span className="text-cyan-400 font-bold hover:text-indigo-400 transition-colors duration-300 select-all">Vivek Kumar Singh</span>
            </p>
          </footer>

        </div>

      </main>
    </div>
  );
}