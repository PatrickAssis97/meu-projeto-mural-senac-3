import React, { useRef, useState } from 'react';
import OpenEnrollments from './OpenEnrollments';
import OngoingCourses from './OngoingCourses';
import NewsCarousel from './NewsCarousel';
import InstitutionalVideo from './InstitutionalVideo';
import Footer from './Footer';
import type { OpenEnrollmentCourse, OngoingCourse, NewsItem, AppSettings, MuralComponentId } from '../types';

interface MuralProps {
  openEnrollments: OpenEnrollmentCourse[];
  ongoingCourses: OngoingCourse[];
  newsItems: NewsItem[];
  videoUrls: string[];
  onAdminClick: () => void;
  isLoggedIn: boolean;
  onReturnToPanel?: () => void;
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  onEditNews?: (item: NewsItem) => void;
}

const Mural: React.FC<MuralProps> = ({ 
  openEnrollments, 
  ongoingCourses, 
  newsItems, 
  videoUrls, 
  onAdminClick,
  isLoggedIn,
  onReturnToPanel,
  settings,
  setSettings,
  onEditNews
}) => {
  const dragItem = useRef<MuralComponentId | null>(null);
  const dragOverItem = useRef<MuralComponentId | null>(null);
  const [dragOverId, setDragOverId] = useState<MuralComponentId | null>(null);

  const handleDragStart = (id: MuralComponentId) => {
    dragItem.current = id;
  };

  const handleDragEnter = (id: MuralComponentId) => {
    dragOverItem.current = id;
    setDragOverId(id);
  };
  
  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = () => {
    if (dragItem.current && dragOverItem.current && dragItem.current !== dragOverItem.current) {
      const newLayoutOrder = [...settings.layoutOrder];
      const dragItemIndex = newLayoutOrder.indexOf(dragItem.current);
      const dragOverItemIndex = newLayoutOrder.indexOf(dragOverItem.current);
      
      // Swap items
      [newLayoutOrder[dragItemIndex], newLayoutOrder[dragOverItemIndex]] = [newLayoutOrder[dragOverItemIndex], newLayoutOrder[dragItemIndex]];
      
      setSettings(prev => ({...prev, layoutOrder: newLayoutOrder }));
    }
    dragItem.current = null;
    dragOverItem.current = null;
    setDragOverId(null);
  };
  
  const components: Record<MuralComponentId, React.ReactNode> = {
    ongoing: <OngoingCourses courses={ongoingCourses} />,
    open: <OpenEnrollments courses={openEnrollments} settings={settings.openEnrollmentsCarousel} />,
    news: <NewsCarousel newsItems={newsItems} settings={settings.newsCarousel} onEditNews={onEditNews} />,
    video: <InstitutionalVideo videoUrls={videoUrls} />,
  };
  
  // Ensure we have a valid layout, even if settings are corrupt
  const validLayoutOrder: MuralComponentId[] = settings.layoutOrder?.length === 4 
    ? settings.layoutOrder 
    : ['ongoing', 'open', 'video', 'news'];

  return (
    <div className="flex flex-col h-screen w-screen text-white overflow-hidden">
      <main className="flex-1 grid grid-cols-1 md:grid-cols-2 grid-rows-2 p-4 gap-4 min-h-0">
        {validLayoutOrder.map((id, index) => (
          <div
            key={id}
            draggable={isLoggedIn}
            onDragStart={() => handleDragStart(id)}
            onDragEnter={() => handleDragEnter(id)}
            onDragLeave={handleDragLeave}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className={`flex flex-col min-h-0 opacity-0 animate-fade-in-up transition-all duration-300 ${isLoggedIn ? 'cursor-move' : ''} ${dragOverId === id ? 'drag-over' : ''}`}
            style={{ animationDelay: `${100 * (index + 1)}ms` }}
          >
            {components[id]}
          </div>
        ))}
      </main>

      <Footer 
        onAdminClick={onAdminClick} 
        isLoggedIn={isLoggedIn}
        onReturnToPanel={onReturnToPanel}
        settings={settings.footerSettings}
      />
    </div>
  );
};

export default Mural;