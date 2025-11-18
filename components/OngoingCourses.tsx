import React, { useState, useEffect } from 'react';
import type { OngoingCourse, CourseSchedule } from '../types';

interface OngoingCoursesProps {
  courses: OngoingCourse[];
}

const getCurrentShift = (): 'morning' | 'afternoon' | 'night' => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'night';
};

const shiftTimes = {
  morning: { start: '05:00', end: '11:59' },
  afternoon: { start: '12:00', end: '17:59' },
  night: { start: '18:00', end: '23:59' },
};

const filterCoursesByShift = (courses: OngoingCourse[]): OngoingCourse[] => {
  const now = new Date();
  const currentDay = now.getDay();
  const currentShift = getCurrentShift();
  const { start, end } = shiftTimes[currentShift];

  return courses.filter(course =>
    course.schedules.some(schedule =>
      schedule.dayOfWeek === currentDay &&
      schedule.startTime >= start &&
      schedule.startTime <= end
    )
  );
};

const findActiveSchedule = (course: OngoingCourse): CourseSchedule | undefined => {
    const now = new Date();
    const currentDay = now.getDay();
    const currentShift = getCurrentShift();
    const { start, end } = shiftTimes[currentShift];

    return course.schedules.find(schedule =>
        schedule.dayOfWeek === currentDay &&
        schedule.startTime >= start &&
        schedule.startTime <= end
    );
};

const OngoingCourses: React.FC<OngoingCoursesProps> = ({ courses }) => {
  const [activeCourses, setActiveCourses] = useState(() => filterCoursesByShift(courses));
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);

  useEffect(() => {
      const intervalId = setInterval(() => {
          const currentlyActive = filterCoursesByShift(courses);
          // Simple check to see if the array content has changed
          if (JSON.stringify(currentlyActive) !== JSON.stringify(activeCourses)) {
            setActiveCourses(currentlyActive);
            setCurrentBlockIndex(0); // Reset carousel on data change
          }
      }, 60000); // Check every minute for shift changes

      return () => clearInterval(intervalId);
  }, [courses, activeCourses]);
  
  const shiftNames = {
    morning: 'Manhã',
    afternoon: 'Tarde',
    night: 'Noite'
  };
  const currentShiftName = shiftNames[getCurrentShift()];

  const groupedCourses = activeCourses.reduce((acc, course) => {
    const block = course.block || 'A';
    if (!acc[block]) acc[block] = [];
    acc[block].push(course);
    return acc;
  }, {} as Record<string, OngoingCourse[]>);

  const blockKeys = Object.keys(groupedCourses).sort();

  useEffect(() => {
    if (blockKeys.length <= 1) return;

    const carouselInterval = setInterval(() => {
      setCurrentBlockIndex(prev => (prev + 1) % blockKeys.length);
    }, 15000); // Change block every 15 seconds

    return () => clearInterval(carouselInterval);
  }, [blockKeys.length]);

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-2xl h-full flex flex-col p-4">
      <div className="flex justify-between items-baseline border-b-2 border-[#f58220] pb-2 mb-4">
        <h2 className="text-2xl font-bold text-white uppercase tracking-wider">
          Cursos em Andamento
        </h2>
        <span className="text-base font-semibold text-gray-200 bg-black/20 px-2 py-1 rounded">
          Turno: {currentShiftName}
        </span>
      </div>
      <div className="flex-grow flex flex-col justify-between">
        {blockKeys.length > 0 ? (
            (() => {
              const currentBlockKey = blockKeys[currentBlockIndex];
              const coursesForBlock = groupedCourses[currentBlockKey];
              return (
                <div key={currentBlockKey} className="animate-slide-in flex-grow">
                  <h3 className="text-xl font-bold text-[#f58220] border-b border-[#f58220]/50 pb-1 mb-2">
                    Bloco {currentBlockKey}
                  </h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                    {coursesForBlock.map((course) => {
                      const activeSchedule = findActiveSchedule(course);
                      return (
                        <div key={course.id} className="aspect-square bg-[#004586]/50 rounded-md flex flex-col items-center justify-center text-center p-1 transition-colors hover:bg-[#004586]">
                          <p className="font-bold text-sm sm:text-base text-white">{course.room}</p>
                          <p className="text-xs sm:text-sm text-gray-200 leading-tight my-1">{course.courseName}</p>
                          {activeSchedule && (
                            <p className="text-xs font-bold text-[#f58220] bg-black/30 px-1 rounded">
                              {activeSchedule.startTime} - {activeSchedule.endTime}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()
        ) : (
            <div className="flex items-center justify-center h-full">
                <p className="text-gray-300 text-lg">Nenhuma aula programada para este turno.</p>
            </div>
        )}
        
        {/* Pagination Dots */}
        {blockKeys.length > 1 && (
            <div className="flex justify-center items-center pt-2 mt-auto">
                {blockKeys.map((_, index) => (
                    <div
                        key={index}
                        className={`h-2 w-2 rounded-full mx-1 transition-all duration-300 ${
                            index === currentBlockIndex ? 'bg-[#f58220] w-4' : 'bg-white/40'
                        }`}
                    />
                ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default OngoingCourses;