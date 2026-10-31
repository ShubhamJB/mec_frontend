export const CONTACT_EMAIL = 'hello@findyourmechanic.com';

export const ORIGIN = { lat: 27.7, lng: 85.315 };

export type GarageStatus = 'OPEN' | 'CLOSED' | 'PAUSED';

export const STATUS_LABEL: Record<GarageStatus, string> = {
  OPEN: 'Open now',
  CLOSED: 'Closed',
  PAUSED: 'Temporarily unavailable',
};

export interface SampleGarage {
  id: string;
  name: string;
  area: string;
  latitude: number;
  longitude: number;
  rating: number;
  reviews: number;
  status: GarageStatus;
  note: string;
}

export const SAMPLE_GARAGES: SampleGarage[] = [
  { id: 'himalayan', name: 'Himalayan Auto Care', area: 'Satdobato, Lalitpur', latitude: 27.6588, longitude: 85.3247, rating: 4.8, reviews: 31, status: 'OPEN', note: 'Closes 6:00 PM' },
  { id: 'patan', name: 'Patan Auto Works', area: 'Pulchowk, Lalitpur', latitude: 27.6788, longitude: 85.3188, rating: 4.5, reviews: 18, status: 'OPEN', note: 'Closes 5:30 PM' },
  { id: 'yeti', name: 'Yeti Auto Hub', area: 'Baneshwor, Kathmandu', latitude: 27.6915, longitude: 85.342, rating: 4.2, reviews: 9, status: 'CLOSED', note: 'Opens 8:00 AM' },
  { id: 'boudha', name: 'Boudha Car Care', area: 'Boudha, Kathmandu', latitude: 27.7215, longitude: 85.362, rating: 4.7, reviews: 12, status: 'OPEN', note: 'Closes 7:00 PM' },
  { id: 'everest', name: 'Everest Motor Workshop', area: 'Kalanki, Kathmandu', latitude: 27.6934, longitude: 85.2812, rating: 4.0, reviews: 22, status: 'PAUSED', note: 'Back at 3 PM' },
  { id: 'kanchenjunga', name: 'Kanchenjunga Garage', area: 'Chabahil, Kathmandu', latitude: 27.717, longitude: 85.347, rating: 4.6, reviews: 14, status: 'OPEN', note: 'Closes 6:30 PM' },
  { id: 'gongabu', name: 'Gongabu Bike Clinic', area: 'Gongabu, Kathmandu', latitude: 27.734, longitude: 85.305, rating: 4.4, reviews: 27, status: 'OPEN', note: 'Closes 6:00 PM' },
];

export const REVIEW_COUNTS = [9, 2, 1, 0, 0];

export const BUILT_TODAY = [
  'Map and list discovery with a 5 km search that widens to 10 km',
  'Open or closed status from each garage’s own weekly schedule',
  'Driver reviews, one per garage, with moderation and reporting',
  'Owner dashboard with profile views, call taps, schedule, photos and services',
  'Admin approval queue, suspension and a full audit log',
  'Email and in-app notifications for approvals and reviews',
];

export const NOT_IN_THIS_RELEASE = ['Booking', 'Payments', 'In-app messaging', 'Quotations'];

export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371.0088 * Math.asin(Math.sqrt(h));
}
