

import React, { useState, useEffect } from 'react';
import type { NewsItem, CarouselSettings } from '../types';
import { sanitizeHTML } from '../services/securityService';

interface NewsCarouselProps {
  newsItems: NewsItem[];
  settings: CarouselSettings;
  onEditNews?: (item: NewsItem) => void;
}

const NewsCarousel: React.FC<NewsCarouselProps> = ({ newsItems, settings, onEditNews }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const transitionDurationMs = settings.speed * 1000;

  useEffect(() => {
    if (!newsItems || newsItems.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % newsItems.length);
    }, transitionDurationMs);

    return () => clearInterval(interval);
  }, [newsItems, transitionDurationMs]);

  if (!newsItems || newsItems.length === 0) {
    return (
       <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-2xl h-full flex flex-col p-4">
         <h2 className="text-2xl font-bold mb-4 text-white uppercase tracking-wider border-b-2 border-[#f58220] pb-2">
            Notícias e Avisos
        </h2>
        <div className="flex-grow flex items-center justify-center">
            <p className="text-gray-300">Nenhuma notícia disponível no momento.</p>
        </div>
       </div>
    );
  }

  // Ensure currentIndex is valid
  const validIndex = currentIndex % newsItems.length;
  const currentItem = newsItems[validIndex];
  
  // The urgent flash animation should take priority. When an item is urgent, it should appear
  // immediately to grab attention, overriding the standard slide/fade entrance animation.
  const urgentClass = currentItem.urgent ? 'animate-flash-red' : 'border-transparent';
  const animationClass = currentItem.urgent ? '' : (settings.transition === 'fade' ? 'animate-fade-in' : 'animate-slide-in');


  const hasImage = currentItem.imageUrl && currentItem.imageUrl.trim() !== '';

  const itemStyle: React.CSSProperties = hasImage ? {
    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.65), rgba(0, 0, 0, 0.65)), url(${currentItem.imageUrl})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  } : {};


  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-2xl h-full flex flex-col p-4 relative overflow-hidden">
      <h2 className="text-2xl font-bold mb-4 text-white uppercase tracking-wider border-b-2 border-[#f58220] pb-2">
        Notícias e Avisos
      </h2>
      <div 
        className={`flex-grow flex flex-col justify-center items-center text-center m-2 p-2 rounded-lg transition-all duration-700 border-2 ${urgentClass} relative`}
        style={itemStyle}
      >
        {currentItem.urgent && onEditNews && (
            <button 
                onClick={() => onEditNews(currentItem)}
                className="absolute top-2 right-2 bg-[#f58220] hover:opacity-90 text-white font-bold py-1 px-3 rounded-md text-sm z-10 transition-transform hover:scale-105"
                aria-label={`Editar notícia: ${currentItem.title}`}
            >
                Editar
            </button>
        )}
        <div key={currentItem.id} className={`${animationClass} w-full`}>
          <h3 className="text-xl md:text-2xl font-bold text-[#f58220] mb-2">{currentItem.title}</h3>
          <div 
            className="text-base md:text-lg text-gray-200 px-4 news-content"
            dangerouslySetInnerHTML={{ __html: sanitizeHTML(currentItem.content) }} 
          />
        </div>
      </div>
      {newsItems.length > 1 && (
        <div className="absolute bottom-0 left-0 w-full h-1 bg-white/20">
            <div 
                key={validIndex} 
                className="h-full bg-[#f58220] animate-progress-bar"
                style={{ animationDuration: `${transitionDurationMs}ms` }}
            />
        </div>
      )}
    </div>
  );
};

export default NewsCarousel;