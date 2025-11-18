import React, { useState, useEffect } from 'react';

interface InstitutionalVideoProps {
  videoUrls: string[];
}

const InstitutionalVideo: React.FC<InstitutionalVideoProps> = ({ videoUrls }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleVideoEnded = () => {
    if (videoUrls.length > 1) {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % videoUrls.length);
    }
  };

  // Reset index if the list of videos changes to ensure it starts from the first one.
  useEffect(() => {
    setCurrentIndex(0);
  }, [videoUrls]);
  
  if (!videoUrls || videoUrls.length === 0) {
    return (
      <div className="bg-black rounded-lg shadow-2xl h-full flex flex-col relative overflow-hidden items-center justify-center">
        <p className="text-gray-400">Nenhum vídeo configurado.</p>
      </div>
    );
  }
  
  const currentVideoUrl = videoUrls[currentIndex];

  return (
    <div className="bg-black rounded-lg shadow-2xl h-full flex flex-col relative overflow-hidden">
      <video
        key={currentVideoUrl} // Add key to force re-render on URL change
        className="w-full h-full object-contain"
        src={currentVideoUrl}
        onEnded={handleVideoEnded}
        autoPlay
        loop={videoUrls.length === 1}
        muted
        playsInline
      >
        Seu navegador não suporta a tag de vídeo.
      </video>
    </div>
  );
};

export default InstitutionalVideo;