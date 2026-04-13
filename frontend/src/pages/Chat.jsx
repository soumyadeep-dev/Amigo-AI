import { useEffect, useRef, useState } from 'react'
import { sendChat, getChatHistory, clearChat, uploadFile, getFiles } from '../api'
import { Send, Trash2, Upload, Loader2, Brain } from 'lucide-react'

export default function Chat() {
  const [messages,  setMessages]  = useState([])
  const [input,     setInput]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [uploading, setUploading] = useState(false)
  const [files,     setFiles]     = useState([])
  const bottomRef = useRef(null)

  useEffect(() => {
    fetchHistory()
    fetchFiles()
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

  async function handleSend() {
    if (!input.trim() || loading) return
    const question = input.trim()
    setInput('')

    const userMsg = { role: 'user', content: question }
    setMessages(m => [...m, userMsg])
    setLoading(true)

    const res = await sendChat({ question, history: messages })
    setMessages(m => [...m, { role: 'assistant', content: res.data.response }])
    setLoading(false)
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
      ? `📂 ${file.name} uploaded — ${res.data.inserted} clients added`
      : `📂 ${file.name} uploaded — ask me anything about it`
    setMessages(m => [...m, { role: 'assistant', content: notice }])
  }

  return (
    <div className="flex flex-col h-screen">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
            <Brain size={15} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-gray-900">Chat with your Brain</h1>
            <p className="text-xs text-gray-400">Ask anything about your clients and projects</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* File upload */}
          <label className={`flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
            {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
            Upload
            <input type="file" className="hidden" accept=".xlsx,.xls,.csv,.pdf,.pptx,.txt" onChange={handleFileUpload} />
          </label>

          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors"
          >
            <Trash2 size={12} />
            Clear
          </button>
        </div>
      </div>

      {/* Uploaded files bar */}
      {files.length > 0 && (
        <div className="bg-gray-50 border-b border-gray-100 px-8 py-2 flex items-center gap-2 overflow-x-auto shrink-0">
          <span className="text-xs text-gray-400 shrink-0">Files:</span>
          {files.map((f, i) => (
            <span key={i} className="text-xs bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-gray-600 shrink-0 whitespace-nowrap">
              📄 {f.filename}
            </span>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-4">
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <Brain size={24} className="text-gray-400" />
            </div>
            <h3 className="text-gray-700 font-medium mb-1">Ask me anything</h3>
            <p className="text-gray-400 text-sm max-w-sm">
              I know all your clients and projects. Ask about follow-ups, draft emails, get insights — anything.
            </p>
            <div className="flex flex-wrap gap-2 mt-6 justify-center">
              {[
                'Who has a pending payment?',
                'Which clients are stalled?',
                'What should I focus on today?',
                'Draft a follow up for my latest client',
              ].map(s => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="text-xs border border-gray-200 rounded-full px-3 py-1.5 text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 bg-gray-900 rounded-lg flex items-center justify-center mr-2.5 shrink-0 mt-0.5">
                <Brain size={13} className="text-white" />
              </div>
            )}
            <div className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-gray-900 text-white rounded-tr-sm'
                : 'bg-white border border-gray-100 shadow-sm text-gray-700 rounded-tl-sm'
            }`}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="w-7 h-7 bg-gray-900 rounded-lg flex items-center justify-center mr-2.5 shrink-0">
              <Brain size={13} className="text-white" />
            </div>
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-100 px-8 py-4 shrink-0">
        <div className="flex items-end gap-3 bg-gray-50 rounded-2xl border border-gray-200 px-4 py-3 focus-within:border-gray-400 transition-colors">
          <textarea
            rows={1}
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none max-h-32"
            placeholder="Ask your brain anything..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="w-8 h-8 bg-gray-900 rounded-xl flex items-center justify-center text-white hover:bg-gray-700 disabled:opacity-40 transition-colors shrink-0"
          >
            <Send size={14} />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  )
}
