import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD 
    ? 'https://debatesf-production.up.railway.app/api'
    : 'http://localhost:3001/api');

export function HomePage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Create a new debate and redirect to it
    const createAndRedirect = async () => {
      try {
        setError(null);
        
        const response = await fetch(`${API_BASE}/debate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to create debate (${response.status})`);
        }
        
        const debate = await response.json();
        
        // Navigate to the new debate using React Router
        navigate(`/debate/${debate._id}`, { replace: true });
      } catch (error) {
        console.error('Error creating new debate:', error);
        setError(error instanceof Error ? error.message : 'Failed to create debate');
      }
    };

    createAndRedirect();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-bold mb-4 text-red-600">Error creating debate</div>
          <div className="mb-4 text-gray-600">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-sm font-medium sharp-corners"
            style={{
              backgroundColor: '#111111',
              color: '#FFFFFF'
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show loading while creating the debate
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-xl font-bold mb-4">Creating new debate...</div>
        <div className="animate-spin h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
      </div>
    </div>
  );
}