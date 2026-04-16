import { useEffect, useRef, useState } from 'react'
import { sendChat, getChatHistory, clearChat, uploadFile, getFiles } from '../api'
import { Send, Trash2, Upload, Loader2, Brain, Mic, VolumeX, Volume2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function Chat() {
  const [messages,  setMessages]  = useState([])
  const [input,     setInput]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [uploading, setUploading] = useState(false)
  const [files,     setFiles]     = useState([])
  
  // VOICE & AUDIO STATE
  const [isListening, setIsListening] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isMuted, setIsMuted] = useState(false) // Toggle for optional voice
  const [voices, setVoices] = useState([])
  
  const recognitionRef = useRef(null) 
  const bottomRef = useRef(null)
  const silenceTimerRef = useRef(null)
  const audioContextRef = useRef(null) // For volume detection

  useEffect(() => {
    fetchHistory()
    fetchFiles()
    const loadVoices = () => setVoices(window.speechSynthesis.getVoices())
    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices

    return () => {
      window.speechSynthesis.cancel();
      if (audioContextRef.current) audioContextRef.current.close();
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function fetchHistory() {
    const res = await getChatHistory()
    setMessages(res.data)
  }

  async function fetchFiles() {
    const res = await getFiles()
    setFiles(res.data)
  }

  // 🎤 SMART AUDIO RECORDING (Volume-based Auto-Stop)
  const toggleListening = async () => {
    if (isListening) {
      stopAndProcess();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Setup Volume Detection
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      audioContextRef.current = audioContext;

      const mediaRecorder = new MediaRecorder(stream);
      recognitionRef.current = mediaRecorder;
      const audioChunks = [];

      let lastSoundTime = Date.now();

      // Monitor volume every 100ms
      const checkVolume = () => {
        if (!isListening && mediaRecorder.state !== 'recording') return;
        
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
        let average = sum / bufferLength;

        // If volume is above threshold (adjust '15' if it's too sensitive)
        if (average > 15) {
          lastSoundTime = Date.now();
        }

        // If silent for 2 seconds, stop
        if (Date.now() - lastSoundTime > 2000) {
          console.log("Auto-stopping due to silence...");
          stopAndProcess();
          return;
        }

        if (mediaRecorder.state === 'recording') {
          requestAnimationFrame(checkVolume);
        }
      };

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        setIsListening(false);
        setIsTranscribing(true);
        if (audioContext) audioContext.close();

        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');

        try {
          const response = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
          });
          const data = await response.json();
          if (data.transcript) {
            setInput((prev) => (prev + " " + data.transcript).trim());
          }
        } catch (error) {
          console.error("Transcription error:", error);
        } finally {
          setIsTranscribing(false);
          stream.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start();
      setIsListening(true);
      requestAnimationFrame(checkVolume);
      
    } catch (err) {
      console.error("Mic access denied:", err);
      alert("Please allow microphone access.");
    }
  };

  const stopAndProcess = () => {
    if (recognitionRef.current && recognitionRef.current.state === 'recording') {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  // 🔊 TEXT-TO-SPEECH (Respects Mute Toggle)
  const speakResponse = (text) => {
    window.speechSynthesis.cancel();
    if (isMuted) return; // DON'T speak if muted

    const cleanText = text.replace(/[*#_\|]/g, ''); 
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const bestVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Premium')) || voices[0];
    
    if (bestVoice) utterance.voice = bestVoice;
    utterance.rate = 1.05; 

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }

  async function handleSend() {
    if (!input.trim() || loading || isTranscribing) return
    const question = input.trim()
    setInput('')

    const userMsg = { role: 'user', content: question }
    setMessages(m => [...m, userMsg])
    setLoading(true)

    const res = await sendChat({ question, history: messages })
    const amigoReply = res.data.response
    
    setMessages(m => [...m, { role: 'assistant', content: amigoReply }])
    setLoading(false)
    
    // Only speak if NOT muted
    if (!isMuted) speakResponse(amigoReply);
  }

  async function handleClear() {
    await clearChat()
    setMessages([])
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await uploadFile(fd)
    await fetchFiles()
    setUploading(false)
    const notice = res.data.was_client_data
      ? `📂 **${file.name}** uploaded — ${res.data.inserted} clients added.`
      : `📂 **${file.name}** uploaded and indexed.`
    setMessages(m => [...m, { role: 'assistant', content: notice }])
  }

  return (
    <div className="flex flex-col h-screen bg-white text-gray-900">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
            <Brain size={15} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-gray-900">Amigo AI</h1>
            <p className="text-xs text-gray-400">Business Intelligence</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* OPTIONAL VOICE TOGGLE (Mute/Unmute) */}
          <button 
            onClick={() => {
                setIsMuted(!isMuted);
                if (!isMuted) stopSpeaking();
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isMuted 
                ? 'bg-gray-100 text-gray-400' 
                : 'bg-blue-50 text-blue-600 border border-blue-100'
            }`}
          >
            {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            {isMuted ? 'Voice Off' : 'Voice On'}
          </button>

          {isSpeaking && (
            <button 
              onClick={stopSpeaking}
              className="flex items-center gap-1.5 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 transition-all animate-pulse"
            >
              <VolumeX size={12} />
              Stop
            </button>
          )}

          <label className={`flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 cursor-pointer transition-all ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
            {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
            Upload
            <input type="file" className="hidden" accept=".xlsx,.xls,.csv,.pdf,.pptx,.txt" onChange={handleFileUpload} />
          </label>

          <button onClick={handleClear} className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-red-50 hover:text-red-500 transition-all">
            <Trash2 size={12} /> Clear
          </button>
        </div>
      </div>

      {/* Memory Bar */}
      {files.length > 0 && (
        <div className="bg-gray-50 border-b border-gray-100 px-8 py-2 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-hide">
          <span className="text-xs font-medium text-gray-400 shrink-0 uppercase tracking-tighter">AI Knowledge:</span>
          {files.map((f, i) => (
            <span key={i} className="text-[11px] bg-white border border-gray-200 shadow-sm rounded-md px-2 py-0.5 text-gray-600 flex items-center gap-1.5">
              <span className="text-blue-500">●</span> {f.filename}
            </span>
          ))}
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-6">
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
            <Brain size={48} className="text-gray-100 mb-4" />
            <h3 className="text-gray-700 font-medium">Hello, I'm Amigo</h3>
            <p className="text-gray-400 text-sm max-w-sm">I'm ready. You can talk to me or type your request below.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-gray-900 text-white rounded-tr-sm'
                : 'bg-white border border-gray-100 shadow-sm text-gray-700 rounded-tl-sm'
            }`}>
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                    table: ({node, ...props}) => <div className="overflow-x-auto my-3"><table className="min-w-full divide-y divide-gray-200 border border-gray-100 rounded-lg" {...props} /></div>,
                    thead: ({node, ...props}) => <thead className="bg-gray-50" {...props} />,
                    th: ({node, ...props}) => <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b" {...props} />,
                    td: ({node, ...props}) => <td className="px-4 py-2 text-sm text-gray-700 border-b border-gray-50" {...props} />,
                    p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />
                }}
              >
                {msg.content}
              </ReactMarkdown>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-1.5 p-2">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" />
            <div className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce [animation-delay:0.2s]" />
            <div className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce [animation-delay:0.4s]" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-100 px-8 py-5 shrink-0">
        <div className="flex items-end gap-3 bg-gray-50 rounded-2xl border border-gray-200 px-4 py-3 focus-within:border-gray-900 focus-within:bg-white transition-all shadow-sm relative">
          
          <textarea
            rows={1}
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none max-h-32 py-1"
            placeholder={isTranscribing ? "Thinking..." : "Ask me anything..."}
            value={input}
            disabled={isTranscribing}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
          />
          
          <div className="flex items-center gap-2">
            <button
              onClick={toggleListening}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                isListening 
                ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-200' 
                : 'bg-white text-gray-400 border border-gray-200 hover:border-gray-900 shadow-sm'
              }`}
            >
              {isTranscribing ? <Loader2 size={16} className="animate-spin" /> : <Mic size={16} />}
            </button>
            
            <button
              onClick={handleSend}
              disabled={loading || !input.trim() || isTranscribing}
              className="w-9 h-9 bg-gray-900 rounded-xl flex items-center justify-center text-white hover:bg-black disabled:opacity-20 transition-all shadow-md"
            >
              <Send size={16} />
            </button>
          </div>

          {isListening && (
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest animate-bounce">
              Listening...
            </div>
          )}
        </div>
        <p className="text-[10px] text-gray-400 mt-3 text-center uppercase tracking-widest">
           Auto-Stop Active · Speak Clearly
        </p>
      </div>
    </div>
  )
}