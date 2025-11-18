

import React, { useState, useEffect } from 'react';
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
  
  // Settings State
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Loading State
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Load all data from storage on initial render
  useEffect(() => {
    const muralData = loadData();
    setOpenEnrollments(muralData.openEnrollments);
    setOngoingCourses(muralData.ongoingCourses);
    setNewsItems(muralData.newsItems);
    setVideoUrls(muralData.videoUrls);
    setSettings(muralData.settings);

    const userData = loadUsers();
    setUsers(userData);

    setIsDataLoaded(true);
  }, []);

  // Save mural data whenever it changes
  useEffect(() => {
    if (isDataLoaded) { 
      saveData({ openEnrollments, ongoingCourses, newsItems, videoUrls, settings });
    }
  }, [isDataLoaded, openEnrollments, ongoingCourses, newsItems, videoUrls, settings]);
  
  // Save user data whenever it changes
  useEffect(() => {
      if(isDataLoaded) {
          saveUsers(users);
      }
  }, [isDataLoaded, users]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    setIsViewingMural(false); // Go to panel by default
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
                    onAdminClick={() => {}} // Not used when logged in
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