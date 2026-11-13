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
  { id: 'gate', label: 'School gate', x: -38, y: 0.08, z: -52 },
  { id: 'f1', label: '1F', x: -38, y: 0.08, z: -66 },
  { id: 'f2', label: '2F', x: -38, y: 3.7, z: -70 },
  { id: 'roof', label: 'Rooftop', x: -37.2, y: 7.3, z: -78.2 },
  { id: 'courtyard', label: 'Courtyard', x: -39.3, y: 0.14, z: -92.8 },
  { id: 'gym', label: 'Gym', x: -20, y: 0.08, z: -172 },
  { id: 'yard', label: 'School yard', x: -54.5, y: 0.3, z: -170 },
  { id: 'track', label: 'Running track', x: -38, y: 0.09, z: -141 },
  { id: 'schoolpool', label: 'School pool', x: 18, y: 0.11, z: -105 },
  { id: 'maze', label: 'Hedge maze', x: -95, y: 0.08, z: -60 },
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
