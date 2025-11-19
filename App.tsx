
import React, { useState, useEffect, useCallback } from 'react';
import Mural from './components/Mural';
import AdminLogin from './components/AdminLogin';
import AdminPanel from './components/AdminPanel';
import type { OpenEnrollmentCourse, OngoingCourse, NewsItem, UserRole, User, AppSettings } from './types';
import { loadData, saveData, loadUsers, saveUsers } from './services/dataService';
import { ToastProvider } from './context/ToastContext';
import { DEFAULT_SETTINGS } from './constants';

const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
};

const backgroundGradients = {
    morning: 'bg-gradient-to-br from-sky-400 via-blue-800 to-[#002b4f]',
    afternoon: 'bg-gradient-to-br from-blue-500 via-indigo-700 to-[#002b4f]',
    evening: 'bg-gradient-to-br from-orange-600 via-purple-900 to-[#002b4f]',
    night: 'bg-gradient-to-br from-indigo-900 via-slate-900 to-black',
};

const App: React.FC = () => {
  // Authentication & View State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isViewingMural, setIsViewingMural] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [newsItemToEdit, setNewsItemToEdit] = useState<NewsItem | null>(null);
  
  // Data State
  const [openEnrollments, setOpenEnrollments] = useState<OpenEnrollmentCourse[]>([]);
  const [ongoingCourses, setOngoingCourses] = useState<OngoingCourse[]>([]);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  
  // Settings State
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Loading State
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Helper to update local state from loaded data object
  const applyLoadedData = useCallback((data: any) => {
      setOpenEnrollments(data.openEnrollments);
      setOngoingCourses(data.ongoingCourses);
      setNewsItems(data.newsItems);
      setVideoUrls(data.videoUrls);
      setSettings(data.settings);
      if (data.lastUpdate) setLastUpdate(data.lastUpdate);
  }, []);

  // 1. Initial Load
  useEffect(() => {
    const muralData = loadData();
    applyLoadedData(muralData);

    const userData = loadUsers();
    setUsers(userData);

    setIsDataLoaded(true);
  }, [applyLoadedData]);

  // 2. Automatic Update Logic (The "Listener")
  // This ensures the Mural updates when Admin makes changes, even in another tab or window.
  useEffect(() => {
    const checkForUpdates = () => {
      // If we are actively editing in the Admin Panel, DON'T overwrite our work with background updates.
      // Only update if we are in Mural View (Presentation Mode) or logged out (Kiosk Mode).
      if (isLoggedIn && !isViewingMural) return;

      const dataOnDisk = loadData();
      
      // Check if the timestamp on disk is newer than what we have in memory
      if (dataOnDisk.lastUpdate && dataOnDisk.lastUpdate > lastUpdate) {
        console.log("New data detected! Updating mural...");
        applyLoadedData(dataOnDisk);
      }
    };

    // Check every 2 seconds (Polling) - Good for robust "Kiosk" mode
    const intervalId = setInterval(checkForUpdates, 2000);

    // Also listen for the immediate 'storage' event (Cross-tab sync)
    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === 'senacMuralData') {
        checkForUpdates();
      }
    };
    
    // Listen for same-tab events (custom event dispatched by saveData)
    const handleLocalEvent = () => checkForUpdates();

    window.addEventListener('storage', handleStorageEvent);
    window.addEventListener('localDataUpdated', handleLocalEvent);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('storage', handleStorageEvent);
      window.removeEventListener('localDataUpdated', handleLocalEvent);
    };
  }, [lastUpdate, isLoggedIn, isViewingMural, applyLoadedData]);


  // 3. Save Logic (The "Writer")
  // Only save when WE make changes from the Admin Panel/State
  useEffect(() => {
    if (isDataLoaded && isLoggedIn) { 
       // Note: We don't call saveData on every render, only when user explicitly changes things in AdminPanel.
       // AdminPanel calls setOpenEnrollments etc.
       // We need a way to trigger save only when these change via user interaction, not via loading.
       // To avoid infinite loops, we will let the AdminPanel explicitly handle 'Save' actions 
       // or use a debounced effect here. 
       
       // Ideally, AdminPanel should call saveData directly or we use a ref to track if change was local.
       // For simplicity in this architecture, we'll rely on `saveData` updating the timestamp,
       // and the `useEffect` above ignoring updates if `isLoggedIn && !isViewingMural`.
       
       // However, to prevent the "Writer" from saving stale data over new data,
       // we should save immediately when state changes.
       saveData({ openEnrollments, ongoingCourses, newsItems, videoUrls, settings });
    }
  }, [openEnrollments, ongoingCourses, newsItems, videoUrls, settings, isDataLoaded, isLoggedIn]);
  
  // Save users separately
  useEffect(() => {
      if(isDataLoaded && isLoggedIn) {
          saveUsers(users);
      }
  }, [users, isDataLoaded, isLoggedIn]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    setIsViewingMural(false);
    setIsAdminLoginOpen(false);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsLoggedIn(false);
    setIsViewingMural(false);
  };

  const handleEditNewsRequest = (item: NewsItem) => {
    setNewsItemToEdit(item);
    setIsViewingMural(false);
  };

  const handleEditingComplete = () => {
    setNewsItemToEdit(null);
  };
  
  const timeOfDay = getTimeOfDay();
  const backgroundClass = backgroundGradients[timeOfDay];
  
  const muralProps = {
        openEnrollments,
        ongoingCourses,
        newsItems,
        videoUrls,
        settings,
        setSettings
  };

  if (isLoggedIn && currentUser) {
    if (isViewingMural) {
        return (
             <div className={`font-sans ${backgroundClass}`}>
                <Mural
                    {...muralProps}
                    isLoggedIn={true}
                    onAdminClick={() => {}} 
                    onReturnToPanel={() => setIsViewingMural(false)}
                    onEditNews={handleEditNewsRequest}
                />
            </div>
        )
    }
    
    return (
      <ToastProvider>
        <div className={`font-sans ${backgroundClass} min-h-screen`}>
          <AdminPanel
            currentUser={currentUser}
            onLogout={handleLogout}
            onViewMural={() => setIsViewingMural(true)}
            openEnrollments={openEnrollments}
            setOpenEnrollments={setOpenEnrollments}
            ongoingCourses={ongoingCourses}
            setOngoingCourses={setOngoingCourses}
            newsItems={newsItems}
            setNewsItems={setNewsItems}
            videoUrls={videoUrls}
            setVideoUrls={setVideoUrls}
            users={users}
            setUsers={setUsers}
            settings={settings}
            setSettings={setSettings}
            initialNewsToEdit={newsItemToEdit}
            onEditingComplete={handleEditingComplete}
          />
        </div>
      </ToastProvider>
    );
  }

  return (
    <div className={`font-sans ${backgroundClass}`}>
      <Mural
        {...muralProps}
        isLoggedIn={false}
        onAdminClick={() => setIsAdminLoginOpen(true)}
      />
      <AdminLogin 
        isOpen={isAdminLoginOpen} 
        onClose={() => setIsAdminLoginOpen(false)}
        onLogin={handleLogin}
        users={users}
      />
    </div>
  );
};

export default App;
