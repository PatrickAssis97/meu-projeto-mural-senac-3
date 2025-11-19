
import { OPEN_ENROLLMENTS_COURSES, ONGOING_COURSES_DATA, NEWS_ITEMS_DATA, DEFAULT_VIDEO_URLS, DEFAULT_SETTINGS } from '../constants';
import type { OpenEnrollmentCourse, OngoingCourse, NewsItem, User, AppSettings, CourseSchedule } from '../types';

const MURAL_DATA_KEY = 'senacMuralData';
const USER_DATA_KEY = 'senacMuralUsers';

export interface AppData {
  openEnrollments: OpenEnrollmentCourse[];
  ongoingCourses: OngoingCourse[];
  newsItems: NewsItem[];
  videoUrls: string[];
  settings: AppSettings;
  lastUpdate?: number; // Carimbo de tempo para sincronização
}

// --- Mural Data Management ---

export const loadData = (): AppData => {
  const defaultData: AppData = {
    openEnrollments: OPEN_ENROLLMENTS_COURSES,
    ongoingCourses: ONGOING_COURSES_DATA,
    newsItems: NEWS_ITEMS_DATA,
    videoUrls: DEFAULT_VIDEO_URLS,
    settings: DEFAULT_SETTINGS,
    lastUpdate: Date.now(),
  };

  try {
    const storedData = localStorage.getItem(MURAL_DATA_KEY);
    if (storedData) {
      const parsedData = JSON.parse(storedData);

      if (typeof parsedData !== 'object' || parsedData === null || Array.isArray(parsedData)) {
        throw new Error("Stored data is not a valid object.");
      }
      
      const loadedSettings = parsedData.settings || {};
      
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

      // Sanitize Open Enrollments
      const loadedOpenEnrollments = Array.isArray(parsedData.openEnrollments)
        ? parsedData.openEnrollments
            .filter((c: any) => c && typeof c === 'object')
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
        
      // Sanitize Ongoing Courses
      const loadedOngoingCourses = Array.isArray(parsedData.ongoingCourses)
        ? parsedData.ongoingCourses
            .filter((c: any) => c && typeof c === 'object')
            .map((course: any): OngoingCourse => ({
              id: String(course.id || crypto.randomUUID()),
              room: String(course.room || ''),
              courseName: String(course.courseName || ''),
              block: String(course.block || 'A'),
              schedules: Array.isArray(course.schedules)
                ? course.schedules
                    .filter((s: any) => s && typeof s === 'object')
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
            .filter((n: any) => n && typeof n === 'object')
            .map((item: any): NewsItem => ({
              id: String(item.id || crypto.randomUUID()),
              title: String(item.title || ''),
              content: String(item.content || ''),
              urgent: !!item.urgent,
              imageUrl: item.imageUrl ? String(item.imageUrl) : undefined,
            }))
        : defaultData.newsItems;

      // Sanitize Video URLs
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
        lastUpdate: typeof parsedData.lastUpdate === 'number' ? parsedData.lastUpdate : Date.now(),
      };

      return finalData;
    }
  } catch (error) {
    console.error("Failed to load or parse mural data from localStorage. Clearing corrupted data.", error);
    localStorage.removeItem(MURAL_DATA_KEY);
  }
  
  return defaultData;
};

export const saveData = (data: Partial<AppData>) => {
  try {
    // Carrega dados atuais para garantir merge correto se passar apenas partial
    const currentData = loadData();
    
    const dataToSave: AppData = {
      openEnrollments: data.openEnrollments || currentData.openEnrollments,
      ongoingCourses: data.ongoingCourses || currentData.ongoingCourses,
      newsItems: data.newsItems || currentData.newsItems,
      videoUrls: data.videoUrls || currentData.videoUrls,
      settings: data.settings || currentData.settings,
      lastUpdate: Date.now(), // ATUALIZA O TIMESTAMP SEMPRE QUE SALVAR
    };
    
    const dataString = JSON.stringify(dataToSave);
    localStorage.setItem(MURAL_DATA_KEY, dataString);
    
    // Dispara evento customizado para notificar a mesma aba (além do evento 'storage' que avisa outras abas)
    window.dispatchEvent(new Event('localDataUpdated'));
    
  } catch (error: any) {
    if (error.name === 'QuotaExceededError' || error.code === 22) {
       alert("Erro: Espaço de armazenamento cheio! Tente remover imagens grandes das notícias ou diminuir a quantidade de itens.");
    }
    console.error("Failed to save mural data to localStorage", error);
  }
};

// --- Import / Export Functions ---

export const exportBackup = () => {
  const data = loadData();
  const dataStr = JSON.stringify(data, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  
  const date = new Date().toISOString().split('T')[0];
  const link = document.createElement('a');
  link.href = url;
  link.download = `backup_mural_senac_${date}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const importBackup = async (file: File): Promise<{ success: boolean, message: string }> => {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    
    // Validação básica simples
    if (!parsed.settings || !Array.isArray(parsed.openEnrollments)) {
      return { success: false, message: 'Arquivo inválido ou corrompido.' };
    }

    // Salva forçando update
    saveData(parsed);
    return { success: true, message: 'Backup restaurado com sucesso!' };
  } catch (e) {
    console.error(e);
    return { success: false, message: 'Erro ao ler o arquivo.' };
  }
};

// --- User Data Management ---

export const loadUsers = (): User[] => {
  const defaultAdminUser: User[] = [
    { id: 'default-admin', username: 'admin', password: '123', role: 'admin' }
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
