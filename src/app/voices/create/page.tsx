'use client';

import { useState } from 'react';

export default function CreateVoicePage() {
  const [name, setName] = useState('my-voice');
  const [language, setLanguage] = useState('hi-IN'); // Commonly 'hi-IN' or 'en-IN' for Sarvam
  const [file, setFile] = useState<File | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a valid audio file (e.g., .wav, .mp3).");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Build form data exactly as the Sarvam API requires
      const formData = new FormData();
      formData.append('name', name);
      formData.append('language', language);
      formData.append('file', file);

      const res = await fetch('/api/voices/create', {
        method: 'POST',
        body: formData, // the browser sets multipart/form-data boundary automatically
      });

      const json = await res.json();

      if (json.error) {
        throw new Error(json.error.message || JSON.stringify(json.error));
      }

      // Check standard response paths based on documentation
      const voiceId = json.data?.voice_id || json.voice_id;
      
      if (voiceId) {
        setSuccess(`Voice cloned successfully! Your Voice ID is: ${voiceId}`);
        setName('');
        setFile(null);
        // Reset file input in UI
        const fileInput = document.getElementById('voiceFile') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        throw new Error("Could not find voice_id in response: " + JSON.stringify(json));
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        <div className="p-8">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-3xl font-bold text-gray-900">Clone a New Voice</h1>
            <a href="/voices" className="text-blue-600 hover:underline text-sm font-medium">← Back to Voices</a>
          </div>
          <p className="text-gray-500 mb-8">Upload a 10-15 second clean audio clip to clone a voice using Sarvam AI.</p>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Voice Name</label>
              <input 
                type="text" 
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="e.g., my-voice"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
              <select 
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
              >
                <option value="en-IN">English (en-IN)</option>
                <option value="hi-IN">Hindi (hi-IN)</option>
                <option value="ta-IN">Tamil (ta-IN)</option>
                <option value="te-IN">Telugu (te-IN)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Audio File</label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => document.getElementById('voiceFile')?.click()}>
                <div className="space-y-1 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="flex text-sm text-gray-600 justify-center">
                    <label htmlFor="voiceFile" className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                      <span>Upload a file</span>
                      <input 
                        id="voiceFile" 
                        name="voiceFile" 
                        type="file" 
                        accept="audio/*" 
                        className="sr-only" 
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    {file ? file.name : "WAV, MP3 up to 10MB"}
                  </p>
                </div>
              </div>
            </div>
            
            <button 
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-xl text-white font-bold text-lg transition-all shadow-md
                ${loading ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg active:scale-[0.98]'}`}
            >
              {loading ? 'Cloning Voice...' : 'Create Voice'}
            </button>
          </form>
        </div>
        
        {(success || error) && (
          <div className={`p-8 border-t ${error ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
            {error ? (
              <div className="text-red-600 font-medium break-words">
                <span className="font-bold block mb-1">Error:</span> {error}
              </div>
            ) : (
              <div className="flex flex-col items-center text-center">
                <h3 className="text-green-800 font-bold mb-2">Success!</h3>
                <p className="text-green-700">{success}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
