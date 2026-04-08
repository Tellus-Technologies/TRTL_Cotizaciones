import { useMemo } from 'react'
import Holidays from 'date-holidays'
import { eachDayOfInterval, isWeekend, parseISO } from 'date-fns'

export function useWorkingDaysMX(startDate: string, endDate: string) {
  const hd = useMemo(() => new Holidays('MX'), [])

  const workingDays = useMemo(() => {
    if (!startDate || !endDate) return 0

    const start = parseISO(startDate)
    const end = parseISO(endDate)

    const days = eachDayOfInterval({ start, end })
    return days.filter(d => {
      return !isWeekend(d) && !hd.isHoliday(d)
    }).length
  }, [startDate, endDate, hd])

  return workingDays
}
