
import React, { useState, useEffect } from 'react';
import { getVideoFromDB } from '../services/videoDB';

interface InstitutionalVideoProps {
  videoUrls: string[];
}

const InstitutionalVideo: React.FC<InstitutionalVideoProps> = ({ videoUrls }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playableUrls, setPlayableUrls] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [missingVideos, setMissingVideos] = useState<number>(0);

  // Effect to resolve video URLs (convert local IDs to Blob URLs)
  useEffect(() => {
    let isMounted = true;
    const resolveUrls = async () => {
      setIsLoading(true);
      setMissingVideos(0);
      const resolved: string[] = [];
      let missingCount = 0;

      for (const url of videoUrls) {
        if (url.startsWith('local-video-')) {
          try {
            const blob = await getVideoFromDB(url);
            if (blob) {
              const objectUrl = URL.createObjectURL(blob);
              resolved.push(objectUrl);
            } else {
                console.warn(`Vídeo local não encontrado no dispositivo: ${url}`);
                missingCount++;
            }
          } catch (error) {
            console.error(`Erro ao carregar vídeo local ${url}:`, error);
            missingCount++;
          }
        } else {
          // It's a normal HTTP URL
          resolved.push(url);
        }
      }

      if (isMounted) {
        setPlayableUrls(resolved);
        setMissingVideos(missingCount);
        setIsLoading(false);
        // Reset index if out of bounds or if list changed significantly
        setCurrentIndex(prev => (prev >= resolved.length ? 0 : prev));
      }
    };

    resolveUrls();

    return () => {
      isMounted = false;
      // Cleanup Object URLs to avoid memory leaks
      playableUrls.forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [videoUrls]); // Re-run when the list from Admin/LocalStorage changes


  const handleVideoEnded = () => {
    if (playableUrls.length > 1) {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % playableUrls.length);
    }
  };
  
  if (isLoading) {
      return (
        <div className="bg-black rounded-lg shadow-2xl h-full flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f58220]"></div>
            <p className="text-gray-400 mt-4">Carregando vídeos...</p>
        </div>
      )
  }
  
  // Se houver vídeos faltando (ex: sync em outro PC) e nenhum jogável
  if (playableUrls.length === 0 && missingVideos > 0) {
      return (
        <div className="bg-black rounded-lg shadow-2xl h-full flex flex-col items-center justify-center p-8 text-center">
            <span className="text-4xl mb-4">⚠️</span>
            <h3 className="text-white font-bold text-xl mb-2">Arquivo de vídeo não encontrado</h3>
            <p className="text-gray-400 text-sm">
                Os vídeos configurados são locais e não foram encontrados neste dispositivo.
            </p>
            <p className="text-gray-500 text-xs mt-4">
                Acesse o Painel Administrativo neste computador e faça o upload do vídeo novamente na aba "Vídeo Institucional".
            </p>
        </div>
      );
  }

  if (!playableUrls || playableUrls.length === 0) {
    return (
      <div className="bg-black rounded-lg shadow-2xl h-full flex flex-col relative overflow-hidden items-center justify-center">
        <p className="text-gray-400">Nenhum vídeo configurado.</p>
      </div>
    );
  }
  
  const currentVideoUrl = playableUrls[currentIndex];

  return (
    <div className="bg-black rounded-lg shadow-2xl h-full flex flex-col relative overflow-hidden">
      <video
        key={currentVideoUrl} // Add key to force re-render on URL change
        className="w-full h-full object-contain"
        src={currentVideoUrl}
        onEnded={handleVideoEnded}
        autoPlay
        loop={playableUrls.length === 1}
        muted
        playsInline
      >
        Seu navegador não suporta a tag de vídeo.
      </video>
    </div>
  );
};

export default InstitutionalVideo;
