
import React, { useState, useEffect } from 'react';
import type { OpenEnrollmentCourse, CarouselSettings } from '../types';

interface OpenEnrollmentsProps {
  courses: OpenEnrollmentCourse[];
  settings: CarouselSettings;
}

const VacancyIndicator: React.FC<{ status: 'available' | 'few' | 'filled' }> = ({ status }) => {
  const config = {
    available: { text: 'Vagas Disponíveis', color: 'bg-green-500' },
    few: { text: 'Poucas Vagas', color: 'bg-yellow-500' },
    filled: { text: 'Vagas Esgotadas', color: 'bg-red-600' },
  };

  const currentConfig = config[status];
  if (!currentConfig || status === 'filled') return null; // Do not show for filled

  return (
    <div className={`absolute top-[-1px] right-[-1px] text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg ${currentConfig.color}`}>
      {currentConfig.text}
    </div>
  );
};

const OpenEnrollments: React.FC<OpenEnrollmentsProps> = ({ courses, settings }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const transitionDurationMs = settings.speed * 1000;
  
  const availableCourses = courses.filter(c => c.vacancies !== 'filled');

  useEffect(() => {
    if (availableCourses.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % availableCourses.length);
    }, transitionDurationMs);

    return () => clearInterval(interval);
  }, [availableCourses.length, transitionDurationMs]);

  if (!availableCourses || availableCourses.length === 0) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-2xl h-full flex flex-col p-4">
        <h2 className="text-2xl font-bold mb-4 text-white uppercase tracking-wider border-b-2 border-[#f58220] pb-2">
          Matrículas Abertas
        </h2>
        <div className="flex-grow flex items-center justify-center">
          <p className="text-gray-300">Nenhum curso com matrícula aberta no momento.</p>
        </div>
      </div>
    );
  }
  
  // Ensure currentIndex is valid
  const validIndex = currentIndex % availableCourses.length;
  const currentCourse = availableCourses[validIndex];
  const animationClass = settings.transition === 'fade' ? 'animate-fade-in' : 'animate-slide-in';

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-2xl h-full flex flex-col p-4 relative overflow-hidden">
      <h2 className="text-2xl font-bold mb-4 text-white uppercase tracking-wider border-b-2 border-[#f58220] pb-2">
        Matrículas Abertas
      </h2>
      <div className="flex-grow flex flex-col justify-center">
        <div key={currentCourse.id} className={animationClass}>
          <div className="bg-[#004586]/50 p-4 rounded-md relative">
            <VacancyIndicator status={currentCourse.vacancies} />
            <div className="flex items-start justify-between gap-6 pt-5">
              {/* Text Section */}
              <div className="flex-grow">
                <h3 className="font-bold text-lg md:text-xl text-[#f58220] leading-tight mb-2">{currentCourse.name}</h3>
                <div className="text-sm text-gray-200 grid grid-cols-1 gap-y-1">
                  <p><span className="font-semibold">Carga Horária:</span> {currentCourse.workload}h</p>
                  <p><span className="font-semibold">Horário:</span> {currentCourse.schedule}</p>
                  <p><span className="font-semibold">Início:</span> {currentCourse.startDate}</p>
                  <p><span className="font-semibold">Término:</span> {currentCourse.endDate}</p>
                </div>
              </div>
              {/* QR Code Section */}
              <div className="flex-shrink-0 text-center">
                <div className="p-1 bg-white rounded-md shadow-md inline-block">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(currentCourse.enrollmentUrl)}`} 
                    alt={`QR Code para ${currentCourse.name}`}
                    className="w-24 h-24 md:w-28 md:h-28"
                    aria-label="QR Code para inscrição"
                  />
                </div>
                <p className="text-xs text-white mt-1">Aponte a câmera</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {availableCourses.length > 1 && (
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

export default OpenEnrollments;
