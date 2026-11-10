/**
 * "Area Move" destinations, like the Area Move list in the original game's menu.
 * Each spot was checked by script against every collider: free standing room,
 * on solid floor, not in water.
 */
export interface Area {
  id: string
  label: string
  x: number
  y: number
  z: number
  /** Which way the player faces after arriving, radians (0 = +Z). */
  yaw?: number
}

export const AREAS: Area[] = [
  { id: 'gate', label: 'School gate', x: -60, y: 0.05, z: -47 },
  { id: 'f1', label: '1F', x: -60, y: 0.05, z: -62 },
  { id: 'f2', label: '2F', x: -60, y: 4.05, z: -68 },
  { id: 'roof', label: 'Rooftop', x: -60, y: 8.05, z: -70 },
  { id: 'gym', label: 'Gym', x: -10, y: 0.05, z: -81 },
  { id: 'yard', label: 'School yard', x: -70, y: 0.05, z: -95 },
  { id: 'pool', label: 'Pool', x: 150, y: 0.35, z: 16 },
  { id: 'home', label: 'Home', x: 134, y: 0.05, z: 100 },
  { id: 'suburb', label: 'Suburb', x: 160, y: 0.05, z: 92 },
  { id: 'apartments', label: 'Apartments', x: -50, y: 0.05, z: 13 },
  { id: 'luxury', label: 'Luxury area', x: 97.7, y: 0.05, z: 34.5 },
  { id: 'conv', label: 'Convenience store', x: 57, y: 0.05, z: 0 },
  { id: 'supermarket', label: 'Supermarket', x: 70.4, y: 0.05, z: -7.1 },
  { id: 'restaurant', label: 'Restaurant', x: 75, y: 0.05, z: 0 },
  { id: 'clothes', label: 'Clothing shop', x: 93, y: 0.05, z: 0 },
  { id: 'cafe', label: 'Cafe', x: 111, y: 0.05, z: 0 },
  { id: 'shopping', label: 'Shopping street', x: 85, y: 0.05, z: -45 },
  { id: 'park', label: 'City park', x: 80, y: 0.05, z: 40 },
  { id: 'playground', label: 'Playground', x: 64, y: 0.05, z: 20 },
  { id: 'hospital', label: 'Hospital', x: 148, y: 0.05, z: -56 },
  { id: 'police', label: 'Police station', x: 184, y: 0.05, z: -51 },
  { id: 'shrine', label: 'Shrine', x: 150, y: 0.05, z: -130 },
  { id: 'industrial', label: 'Industrial district', x: -148, y: 0.05, z: -170 },
  { id: 'beach', label: 'Beach', x: 0, y: 0.05, z: 160 },
]
