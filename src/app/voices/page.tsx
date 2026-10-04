'use client';

import { useEffect, useState } from 'react';

type Voice = {
  id: string;
  name: string;
  status: string;
};

export default function VoicesPage() {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVoices() {
      try {
        const res = await fetch('/api/voices');
        const json = await res.json();
        
        if (json.error) {
          throw new Error(json.error.message || JSON.stringify(json.error));
        }

        // Handle variations in the response structure just in case
        if (json.data && json.data.voices) {
          setVoices(json.data.voices);
        } else if (json.voices) {
          setVoices(json.voices);
        } else if (Array.isArray(json)) {
          setVoices(json);
        } else {
          console.log("Raw JSON:", json);
          setVoices([]); // Or throw error
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchVoices();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-8">
      <div className="max-w-3xl w-full">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Your Cloned Voices</h1>
            <p className="text-gray-500 mt-1">List of all custom voices available in your Sarvam account.</p>
          </div>
          <a href="/demo" className="px-4 py-2 bg-white text-blue-600 font-semibold rounded-lg shadow border border-gray-200 hover:bg-gray-50 transition-colors">
            Test a Voice →
          </a>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl mb-6 shadow-sm">
            <span className="font-bold">Error:</span> {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : voices.length === 0 && !error ? (
          <div className="bg-white rounded-2xl shadow-md p-10 text-center border border-gray-100">
            <h3 className="text-xl font-medium text-gray-900 mb-2">No Voices Found</h3>
            <p className="text-gray-500">You don't have any cloned voices in this account, or the API structure didn't match.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Voice ID
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {voices.map((voice) => (
                  <tr key={voice.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{voice.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded inline-block">
                        {voice.id}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${voice.status?.toLowerCase() === 'ready' || voice.status?.toLowerCase() === 'completed' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'}`}>
                        {voice.status || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(voice.id);
                          alert('Copied ID to clipboard!');
                        }}
                        className="text-blue-600 hover:text-blue-900 bg-blue-50 px-3 py-1 rounded-md hover:bg-blue-100 transition-colors"
                      >
                        Copy ID
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
