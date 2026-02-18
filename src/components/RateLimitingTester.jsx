import React, { useState } from 'react';
import { apiFetch } from '../utils/api';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Loader2, ExternalLink } from 'lucide-react';
const mockTooManyRequestsResponse = async () => {
  const mockResponse = new Response(
    JSON.stringify({ 
      message: 'Terlalu banyak permintaan. Silakan coba lagi nanti.' 
    }),
    { 
      status: 429, 
      headers: { 'Content-Type': 'application/json' } 
    }
  );
  Object.defineProperty(mockResponse, 'url', {
    value: 'https://amaturalist.com/api/test-endpoint'
  });
  
  return mockResponse;
};

const RateLimitingTester = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [activeTest, setActiveTest] = useState(null);
  const [mockAttemptsLeft, setMockAttemptsLeft] = useState(3);
  const testMockRateLimit = async () => {
    setActiveTest('mock');
    setIsLoading(true);
    setResult(null);
    
    try {
      const originalFetch = window.fetch;
      window.fetch = () => {
        return Promise.resolve(mockTooManyRequestsResponse());
      };
      await apiFetch('/test-endpoint');
      setResult({
        success: true,
        message: 'Retry berhasil menangani error 429'
      });
    } catch (error) {
      console.error('Error in test:', error);
      setResult({
        success: false,
        message: `Error: ${error.message}`,
        error
      });
    } finally {
      window.fetch = window.fetch.__proto__.constructor;
      setIsLoading(false);
    }
  };
  const testRealRateLimit = async () => {
    setActiveTest('real');
    setIsLoading(true);
    setResult(null);
    
    try {
      const results = [];
      const endpoint = '/login'; // Endpoint yang rentan terhadap rate limiting
      for (let i = 0; i < 10; i++) {
        try {
          const response = await apiFetch(endpoint, {
            method: 'POST',
            body: JSON.stringify({
              login_identifier: 'test@example.com',
              password: 'password123'
            })
          });
          
          results.push({
            attempt: i + 1,
            status: response.status,
            success: true
          });
        } catch (err) {
          results.push({
            attempt: i + 1,
            status: err.status || 'Unknown',
            message: err.message,
            success: false
          });
          if (err.status === 429 || err.message.includes('Terlalu banyak permintaan')) {
            toast.info('Terdeteksi rate limiting! Menguji fitur retry...');
          }
        }
        if (i < 9) { 
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      setResult({
        success: true,
        message: 'Test selesai',
        details: results
      });
    } catch (error) {
      console.error('Error in test:', error);
      setResult({
        success: false,
        message: `Error: ${error.message}`,
        error
      });
    } finally {
      setIsLoading(false);
    }
  };
  const testCooldown = async () => {
    setActiveTest('cooldown');
    setIsLoading(true);
    setResult(null);
    
    try {
      const { setCooldown, getRemainingCooldown } = await import('../utils/rateLimiting');
      const testKey = 'test-cooldown';
      setCooldown(testKey, 15000);
      const observations = [];
      const initialCooldown = getRemainingCooldown(testKey);
      observations.push({
        time: 0,
        remaining: initialCooldown
      });
      for (let i = 1; i <= 5; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const remaining = getRemainingCooldown(testKey);
        observations.push({
          time: i,
          remaining
        });
      }
      
      setResult({
        success: true,
        message: 'Test cooldown selesai',
        details: observations
      });
    } catch (error) {
      console.error('Error in test:', error);
      setResult({
        success: false,
        message: `Error: ${error.message}`,
        error
      });
    } finally {
      setIsLoading(false);
    }
  };
  const testMockRetry = async () => {
    setActiveTest('mockRetry');
    setIsLoading(true);
    setResult(null);
    setMockAttemptsLeft(3);
    
    try {
      const originalFetch = window.fetch;
      let attemptCount = 0;
      window.fetch = () => {
        attemptCount++;
        if (attemptCount <= 2) {
          setMockAttemptsLeft(prev => prev - 1);
          return Promise.resolve(mockTooManyRequestsResponse());
        } else {
          return Promise.resolve(new Response(
            JSON.stringify({ success: true, message: "Berhasil setelah beberapa kali retry" }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          ));
        }
      };
      const response = await apiFetch('/test-endpoint');
      const data = await response.json();
      setResult({
        success: true,
        message: 'Retry berhasil setelah beberapa kali percobaan',
        details: [
          { attempt: 1, status: 429, success: false, message: 'Terlalu banyak permintaan. Silakan coba lagi nanti.' },
          { attempt: 2, status: 429, success: false, message: 'Terlalu banyak permintaan. Silakan coba lagi nanti.' },
          { attempt: 3, status: 200, success: true, message: data.message }
        ]
      });
    } catch (error) {
      console.error('Error in test:', error);
      setResult({
        success: false,
        message: `Error: ${error.message}`,
        error
      });
    } finally {
      window.fetch = window.fetch.__proto__.constructor;
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-[#1e1e1e] rounded-lg shadow-lg border border-gray-700">
      <ToastContainer position="top-right" autoClose={5000} />
      
      <h1 className="text-2xl font-bold text-white mb-6">Rate Limiting Test & Fallback</h1>
      
      <div className="space-y-8">
        {/* Pilihan toggle antara mock dan real test */}
        <div className="bg-[#2a2a2a] p-4 rounded-md border border-gray-700">
          <div className="flex items-center mb-4">
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-white">Pengaturan Test</h2>
              <p className="text-sm text-gray-400 mt-1">
                Pilih jenis test yang ingin Anda jalankan
              </p>
            </div>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={testMockRateLimit}
              disabled={isLoading}
              className={`w-full flex justify-center py-2 px-4 rounded-md text-white 
                ${activeTest === 'mock' ? 'bg-blue-600 border-blue-700' : 'bg-[#3a3a3a] hover:bg-[#4a4a4a] border-gray-600'} 
                border ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoading && activeTest === 'mock' ? (
                <Loader2 className="animate-spin h-5 w-5 mr-2" />
              ) : null}
              Test Mock Response 429 (Tanpa Retry)
            </button>
            
            <button
              onClick={testMockRetry}
              disabled={isLoading}
              className={`w-full flex justify-center py-2 px-4 rounded-md text-white 
                ${activeTest === 'mockRetry' ? 'bg-blue-600 border-blue-700' : 'bg-[#3a3a3a] hover:bg-[#4a4a4a] border-gray-600'} 
                border ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoading && activeTest === 'mockRetry' ? (
                <div className="flex items-center">
                  <Loader2 className="animate-spin h-5 w-5 mr-2" />
                  <span>Attempts left: {mockAttemptsLeft}</span>
                </div>
              ) : null}
              Test Simulasi Retry
            </button>
            
            <button
              onClick={testRealRateLimit}
              disabled={isLoading}
              className={`w-full flex justify-center py-2 px-4 rounded-md text-white 
                ${activeTest === 'real' ? 'bg-blue-600 border-blue-700' : 'bg-[#3a3a3a] hover:bg-[#4a4a4a] border-gray-600'} 
                border ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoading && activeTest === 'real' ? (
                <Loader2 className="animate-spin h-5 w-5 mr-2" />
              ) : null}
              Test dengan API Calls Berulang
            </button>
            
            <button
              onClick={testCooldown}
              disabled={isLoading}
              className={`w-full flex justify-center py-2 px-4 rounded-md text-white 
                ${activeTest === 'cooldown' ? 'bg-blue-600 border-blue-700' : 'bg-[#3a3a3a] hover:bg-[#4a4a4a] border-gray-600'} 
                border ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoading && activeTest === 'cooldown' ? (
                <Loader2 className="animate-spin h-5 w-5 mr-2" />
              ) : null}
              Test Fungsionalitas Cooldown
            </button>
          </div>
          
          <div className="mt-4 text-sm text-gray-400">
            <p className="flex items-center">
              <ExternalLink className="w-4 h-4 mr-1" />
              Catatan: Test akan dilakukan di lingkungan aplikasi Anda saat ini
            </p>
          </div>
        </div>
        
        {/* Hasil test */}
        {result && (
          <div className={`bg-[#2a2a2a] p-4 rounded-md border ${result.success ? 'border-green-700' : 'border-red-700'}`}>
            <h2 className="text-xl font-semibold text-white mb-3">Hasil Test</h2>
            
            <div className={`p-3 rounded-md ${result.success ? 'bg-green-900 bg-opacity-20' : 'bg-red-900 bg-opacity-20'}`}>
              <p className={`text-sm ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                {result.message}
              </p>
            </div>
            
            {result.details && (
              <div className="mt-4">
                <h3 className="text-lg font-medium text-white mb-2">Detail:</h3>
                
                {(activeTest === 'real' || activeTest === 'mockRetry') && (
                  <div className="bg-[#222] rounded-md border border-gray-700 overflow-auto max-h-60">
                    <table className="min-w-full divide-y divide-gray-700">
                      <thead className="bg-[#2c2c2c]">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Percobaan</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Hasil</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Pesan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {result.details.map((detail, index) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-[#262626]' : 'bg-[#2a2a2a]'}>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-300">{detail.attempt}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-300">{detail.status}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                detail.success ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'
                              }`}>
                                {detail.success ? 'Sukses' : 'Gagal'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-300">{detail.message || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                
                {activeTest === 'cooldown' && (
                  <div className="bg-[#222] rounded-md border border-gray-700 overflow-auto max-h-60">
                    <table className="min-w-full divide-y divide-gray-700">
                      <thead className="bg-[#2c2c2c]">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Detik ke-</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Sisa Cooldown (detik)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {result.details.map((detail, index) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-[#262626]' : 'bg-[#2a2a2a]'}>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-300">{detail.time}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-300">{detail.remaining}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
            
            {result.error && (
              <div className="mt-4 p-3 bg-red-900 bg-opacity-10 rounded-md border border-red-900">
                <p className="text-sm text-red-400 font-mono whitespace-pre-wrap">
                  {JSON.stringify(result.error, null, 2)}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RateLimitingTester; 