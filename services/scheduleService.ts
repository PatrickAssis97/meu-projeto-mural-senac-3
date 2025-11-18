import type { OngoingCourse } from '../types';

const timesOverlap = (startA: string, endA: string, startB: string, endB: string): boolean => {
    return startA < endB && endA > startB;
};

/**
 * Checks for schedule conflicts for a given course against a list of existing courses.
 * @param courseToCheck - The course (new or being edited) to validate.
 * @param allCourses - The list of all other courses to check against.
 * @returns {OngoingCourse | null} - The first conflicting course found, or null if no conflicts.
 */
export const findScheduleConflict = (
  courseToCheck: OngoingCourse | Omit<OngoingCourse, 'id'>,
  allCourses: OngoingCourse[]
): OngoingCourse | null => {

  const coursesToCompare = 'id' in courseToCheck
    ? allCourses.filter(c => c.id !== courseToCheck.id) // Exclude self when editing
    : allCourses;                                    // Compare against all when adding

  for (const scheduleToCheck of courseToCheck.schedules) {
    for (const existingCourse of coursesToCompare) {
      if (existingCourse.room.trim().toLowerCase() === courseToCheck.room.trim().toLowerCase()) {
        for (const existingSchedule of existingCourse.schedules) {
          if (
            scheduleToCheck.dayOfWeek === existingSchedule.dayOfWeek &&
            timesOverlap(
              scheduleToCheck.startTime,
              scheduleToCheck.endTime,
              existingSchedule.startTime,
              existingSchedule.endTime
            )
          ) {
            return existingCourse; 
          }
        }
      }
    }
  }

  return null;
};
