
import { OPEN_ENROLLMENTS_COURSES, ONGOING_COURSES_DATA, NEWS_ITEMS_DATA, DEFAULT_VIDEO_URLS, DEFAULT_SETTINGS } from '../constants';
import type { OpenEnrollmentCourse, OngoingCourse, NewsItem, User, AppSettings, CourseSchedule } from '../types';

const MURAL_DATA_KEY = 'senacMuralData';
const USER_DATA_KEY = 'senacMuralUsers';

interface AppData {
  openEnrollments: OpenEnrollmentCourse[];
  ongoingCourses: OngoingCourse[];
  newsItems: NewsItem[];
  videoUrls: string[];
  settings: AppSettings;
}

// --- Mural Data Management ---

export const loadData = (): AppData => {
  const defaultData: AppData = {
    openEnrollments: OPEN_ENROLLMENTS_COURSES,
    ongoingCourses: ONGOING_COURSES_DATA,
    newsItems: NEWS_ITEMS_DATA,
    videoUrls: DEFAULT_VIDEO_URLS,
    settings: DEFAULT_SETTINGS,
  };

  try {
    const storedData = localStorage.getItem(MURAL_DATA_KEY);
    if (storedData) {
      const parsedData = JSON.parse(storedData);

      // Add a robust check to ensure the loaded data is a valid object.
      if (typeof parsedData !== 'object' || parsedData === null || Array.isArray(parsedData)) {
        throw new Error("Stored data is not a valid object.");
      }
      
      const loadedSettings = parsedData.settings || {};
      // Rebuild settings from stored data, ensuring type safety and ignoring legacy properties.
      const settings: AppSettings = {
        layoutOrder: loadedSettings.layoutOrder && loadedSettings.layoutOrder.length === 4 ? loadedSettings.layoutOrder : DEFAULT_SETTINGS.layoutOrder,
        footerSettings: {
          ...DEFAULT_SETTINGS.footerSettings,
          ...(loadedSettings.footerSettings || {}),
        },
        openEnrollmentsCarousel: {
          ...DEFAULT_SETTINGS.openEnrollmentsCarousel,
          ...(loadedSettings.openEnrollmentsCarousel || {}),
        },
        newsCarousel: {
          ...DEFAULT_SETTINGS.newsCarousel,
          ...(loadedSettings.newsCarousel || {}),
        },
      };

      // --- Robust Data Sanitization & Migration ---
      // This ensures that any data loaded from localStorage is complete and conforms to the expected types,
      // preventing crashes from old or corrupted data structures by explicitly setting defaults.

      // Sanitize Open Enrollments
      const loadedOpenEnrollments = Array.isArray(parsedData.openEnrollments)
        ? parsedData.openEnrollments
            .filter(c => c && typeof c === 'object')
            .map((course: any): OpenEnrollmentCourse => ({
              id: String(course.id || crypto.randomUUID()),
              name: String(course.name || 'Curso'),
              workload: Number(course.workload || 0),
              startDate: String(course.startDate || ''),
              endDate: String(course.endDate || ''),
              schedule: String(course.schedule || ''),
              enrollmentUrl: String(course.enrollmentUrl || ''),
              vacancies: ['available', 'few', 'filled'].includes(course.vacancies) ? course.vacancies : 'available',
            }))
        : defaultData.openEnrollments;
        
      // Sanitize Ongoing Courses (including nested schedules)
      const loadedOngoingCourses = Array.isArray(parsedData.ongoingCourses)
        ? parsedData.ongoingCourses
            .filter(c => c && typeof c === 'object')
            .map((course: any): OngoingCourse => ({
              id: String(course.id || crypto.randomUUID()),
              room: String(course.room || ''),
              courseName: String(course.courseName || ''),
              block: String(course.block || 'A'),
              schedules: Array.isArray(course.schedules)
                ? course.schedules
                    .filter(s => s && typeof s === 'object')
                    .map((schedule: any): CourseSchedule => ({
                      dayOfWeek: Number(schedule.dayOfWeek ?? 1),
                      startTime: String(schedule.startTime || '00:00'),
                      endTime: String(schedule.endTime || '00:00'),
                    }))
                : [],
            }))
        : defaultData.ongoingCourses;

      // Sanitize News Items
      const loadedNewsItems = Array.isArray(parsedData.newsItems)
        ? parsedData.newsItems
            .filter(n => n && typeof n === 'object')
            .map((item: any): NewsItem => ({
              id: String(item.id || crypto.randomUUID()),
              title: String(item.title || ''),
              content: String(item.content || ''),
              urgent: !!item.urgent,
              imageUrl: item.imageUrl ? String(item.imageUrl) : undefined, // Keep undefined if falsy
            }))
        : defaultData.newsItems;

      // Sanitize Video URLs (and migrate from old single-URL format)
      let loadedVideoUrls = Array.isArray(parsedData.videoUrls)
        ? parsedData.videoUrls.filter((item: any) => typeof item === 'string' && item.trim())
        : defaultData.videoUrls;
        
      if (parsedData.videoUrl && !Array.isArray(parsedData.videoUrls)) {
        loadedVideoUrls = [parsedData.videoUrl].filter(Boolean);
      }

      const finalData: AppData = {
        openEnrollments: loadedOpenEnrollments,
        ongoingCourses: loadedOngoingCourses,
        newsItems: loadedNewsItems,
        videoUrls: loadedVideoUrls,
        settings: settings,
      };

      return finalData;
    }
  } catch (error) {
    console.error("Failed to load or parse mural data from localStorage. Clearing corrupted data.", error);
    localStorage.removeItem(MURAL_DATA_KEY); // Clear corrupted data to prevent reload loop
  }
  
  return defaultData;
};

export const saveData = (data: AppData) => {
  try {
    const dataToSave: AppData = {
      openEnrollments: data.openEnrollments || [],
      ongoingCourses: data.ongoingCourses || [],
      newsItems: data.newsItems || [],
      videoUrls: data.videoUrls || [],
      settings: data.settings || DEFAULT_SETTINGS,
    };
    const dataString = JSON.stringify(dataToSave);
    localStorage.setItem(MURAL_DATA_KEY, dataString);
  } catch (error) {
    console.error("Failed to save mural data to localStorage", error);
  }
};

// --- User Data Management ---

export const loadUsers = (): User[] => {
  const defaultAdminUser: User[] = [
    { id: 'default-admin', username: 'admin', password: 'admin123', role: 'admin' }
  ];
  
  try {
    const storedUsers = localStorage.getItem(USER_DATA_KEY);
    if (storedUsers) {
      const parsedUsers = JSON.parse(storedUsers);
      if (Array.isArray(parsedUsers) && parsedUsers.length > 0) {
        return parsedUsers;
      }
    }
  } catch (error) {
    console.error("Failed to load user data from localStorage", error);
  }

  // If no users are stored, or data is corrupted, return the default admin
  return defaultAdminUser;
};

export const saveUsers = (users: User[]) => {
  try {
    const usersString = JSON.stringify(users);
    localStorage.setItem(USER_DATA_KEY, usersString);
  } catch (error) {
    console.error("Failed to save user data to localStorage", error);
  }
};
