import React from 'react';
import { useNavigate } from 'react-router-dom';

export function HomePage() {
  const navigate = useNavigate();

  // Generate a temporary ID for new blank debate
  const createBlankDebate = () => {
    const tempId = 'temp_' + Date.now();
    navigate(`/debate/${tempId}`, { replace: true });
  };

  // Immediately redirect to a blank debate
  React.useEffect(() => {
    createBlankDebate();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-xl font-bold mb-4">Starting new debate...</div>
        <div className="animate-spin h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
      </div>
    </div>
  );
}