import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebateStore } from '../store/store';

export function HomePage() {
  const navigate = useNavigate();
  const { createNewDebate } = useDebateStore();

  useEffect(() => {
    // Automatically create a new debate and redirect to it
    const createAndRedirect = async () => {
      try {
        await createNewDebate();
        // The createNewDebate function should handle navigation
        // but let's add a fallback just in case
      } catch (error) {
        console.error('Error creating new debate:', error);
        // If creation fails, redirect to debates list
        navigate('/debates');
      }
    };

    createAndRedirect();
  }, [createNewDebate, navigate]);

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