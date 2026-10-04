'use client';

import { useState } from 'react';

export default function DemoPage() {
  const [text, setText] = useState('Hello, this is a test of the cloned voice.');
  const [voiceId, setVoiceId] = useState('svc-6a67438d-5e48-44f2-8866-1b0b037a5de5');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const handleTestVoice = async () => {
    setLoading(true);
    setError(null);
    setAudioUrl(null);
    
    try {
      const res = await fetch('/api/demo-tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text, voice_id: voiceId })
      });
      
      const data = await res.json();
      
      if (data.error) {
        throw new Error(data.error.message || JSON.stringify(data.error));
      }
      
      const base64Audio = (data.audios && data.audios[0]) || data.audio || data.audio_b64;
      
      if (base64Audio) {
        // Convert to data URI for playback
        const uri = `data:audio/wav;base64,${base64Audio}`;
        setAudioUrl(uri);
      } else {
        throw new Error('No audio returned from API: ' + JSON.stringify(data));
      }
      
    } catch (err: any) {
      console.error("Demo TTS Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Cloned Voice Demo</h1>
          <p className="text-gray-500 mb-8">Test your Sarvam AI custom cloned voice easily.</p>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Voice ID</label>
              <input 
                type="text" 
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Text to Speak</label>
              <textarea 
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
              />
            </div>
            
            <button 
              onClick={handleTestVoice}
              disabled={loading}
              className={`w-full py-4 rounded-xl text-white font-bold text-lg transition-all shadow-md
                ${loading ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg active:scale-[0.98]'}`}
            >
              {loading ? 'Generating...' : 'Generate Voice'}
            </button>
          </div>
        </div>
        
        {(audioUrl || error) && (
          <div className={`p-8 border-t ${error ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
            {error ? (
              <div className="text-red-600 font-medium break-words">
                <span className="font-bold block mb-1">Error:</span> {error}
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <h3 className="text-green-800 font-bold mb-4">Success! Voice generated.</h3>
                <audio controls src={audioUrl || undefined} className="w-full rounded-lg" autoPlay />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
