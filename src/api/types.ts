export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown> | { errors?: Array<{ field: string; message: string }> };
    request_id?: string;
  };
}

export type UserRole = 'CUSTOMER' | 'GARAGE_OWNER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  account_status: 'ACTIVE' | 'SUSPENDED';
  is_verified?: boolean;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface OperatingHoursItem {
  day_of_week: number; // 1 = Monday ... 7 = Sunday
  is_closed: boolean;
  opening_time: string | null; // "09:00"
  closing_time: string | null; // "18:00"
}

export interface GarageAvailability {
  status: 'OPEN' | 'CLOSED' | 'TEMPORARILY_UNAVAILABLE';
  is_temporarily_unavailable: boolean;
  message?: string | null;
  timezone: string;
  local_time: string;
  next_status_change?: string | null;
}

export interface ServiceItem {
  id: string;
  name: string;
  is_predefined: boolean;
  created_by_user_id?: string | null;
}

export interface VehicleTypeItem {
  id: string;
  name: string;
  is_predefined: boolean;
}

export interface PhotoItem {
  id: string;
  url: string;
  caption?: string | null;
  display_order: number;
}

export interface GarageCardItem {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distance_km?: number | null;
  average_rating?: number | null;
  review_count: number;
  availability: GarageAvailability;
  phone: string;
  cover_photo_url?: string | null;
  address?: string;
  services?: ServiceItem[];
  vehicle_types?: VehicleTypeItem[];
}

export interface GarageDetail extends GarageCardItem {
  description: string;
  timezone: string;
  operating_hours: OperatingHoursItem[];
  photos: PhotoItem[];
  created_at: string;
}

export interface ReviewItem {
  id: string;
  customer: {
    display_name: string;
  };
  rating: number;
  comment?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface ReviewsResponse {
  items: ReviewItem[];
  average_rating: number | null;
  total_reviews: number;
  rating_distribution: Record<string, number>;
  page: number;
  limit: number;
  total_pages: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  related_entity_type?: string | null;
  related_entity_id?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  limit: number;
  total_items: number;
  total_pages: number;
}

export interface OwnerDashboardSummary {
  garage_id: string;
  name: string;
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  availability: GarageAvailability;
  total_profile_views: number;
  total_call_clicks: number;
  average_rating: number | null;
  review_count: number;
}

export interface GarageStaffItem {
  id: string;
  garage_id: string;
  full_name: string;
  phone: string;
  role_title: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoadsideCapability {
  id: string;
  garage_id: string;
  enabled: boolean;
  is_available: boolean;
  service_radius_km: number;
  availability_note: string | null;
  callback_phone: string | null;
  response_minutes: number;
  created_at: string;
  updated_at: string;
}

export type RoadsideRequestStatus =
  | 'PENDING' | 'ACCEPTED' | 'CONTACTED' | 'CONFIRMED' | 'IN_PROGRESS'
  | 'COMPLETED' | 'DECLINED' | 'EXPIRED' | 'CANCELLED' | 'UNABLE_TO_SERVE';

export interface RoadsideRequestEvent {
  from_status: RoadsideRequestStatus | null;
  to_status: RoadsideRequestStatus;
  created_at: string;
  safe_metadata: Record<string, string> | null;
}

export interface RoadsideRequestItem {
  id: string;
  request_code: string;
  garage_id: string;
  garage_name: string;
  customer_id: string | null;
  status: RoadsideRequestStatus;
  vehicle_type_id: string;
  service_id: string;
  problem_description: string;
  location_label?: string | null;
  coarse_latitude: number;
  coarse_longitude: number;
  exact_latitude: number | null;
  exact_longitude: number | null;
  address: string | null;
  contact_phone: string | null;
  quote_amount: string | null;
  quote_currency: string | null;
  eta_minutes: number | null;
  accepted_at: string | null;
  customer_contact_confirmed: boolean | null;
  customer_feedback_resolution: 'RESOLVED' | 'PARTIAL' | 'UNRESOLVED' | null;
  customer_feedback_rating: number | null;
  customer_feedback_comment: string | null;
  customer_feedback_at: string | null;
  owner_calling_at?: string | null;
  call_followup_failed?: boolean;
  decline_reason: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
  events: RoadsideRequestEvent[];
}

export interface GuestRoadsideRequestStatus {
  request_code: string;
  garage_name: string;
  status: RoadsideRequestStatus;
  decline_reason: string | null;
  quote_amount: string | null;
  quote_currency: string | null;
  eta_minutes: number | null;
  accepted_at: string | null;
  customer_contact_confirmed: boolean | null;
  customer_feedback_resolution: 'RESOLVED' | 'PARTIAL' | 'UNRESOLVED' | null;
  customer_feedback_rating: number | null;
  customer_feedback_comment: string | null;
  customer_feedback_at: string | null;
  owner_calling_at?: string | null;
  call_followup_failed?: boolean;
  updated_at: string;
}

export interface AdminDashboardCounts {
  total_users: number;
  total_customers: number;
  total_owners: number;
  total_suspended_users: number;
  total_garages: number;
  pending_registrations: number;
  pending_profile_changes: number;
  approved_garages: number;
  rejected_garages: number;
  suspended_garages: number;
  total_reviews: number;
  pending_review_reports: number;
  total_call_clicks: number;
  users_count?: number;
  garages_count?: number;
  pending_registrations_count?: number;
  pending_profile_changes_count?: number;
  pending_reports_count?: number;
  total_reviews_count?: number;
  call_clicks_count?: number;
}
