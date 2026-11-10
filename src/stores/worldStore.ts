import { create } from 'zustand'

export type Weather = 'sunny' | 'cloudy' | 'rainy'

interface WorldState {
  /** Hours on a 24h clock, 0..24 */
  hour: number
  /** Real seconds for one full in-game day. 0 freezes time. */
  dayLengthSeconds: number
  weather: Weather
  setHour: (h: number) => void
  setWeather: (w: Weather) => void
  setDayLength: (s: number) => void
}

export const useWorld = create<WorldState>((set) => ({
  hour: 10,
  dayLengthSeconds: 600,
  weather: 'sunny',
  setHour: (hour) => set({ hour: ((hour % 24) + 24) % 24 }),
  setWeather: (weather) => set({ weather }),
  setDayLength: (dayLengthSeconds) => set({ dayLengthSeconds }),
}))

export function isNight(hour: number): boolean {
  return hour < 5.5 || hour >= 19
}
