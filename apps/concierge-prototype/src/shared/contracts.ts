/** App-private synthetic contracts; these are not production API types. */
export const CATEGORIES = [
  "condo",
  "hotel",
  "airport_transfer",
  "car_with_driver",
  "private_driver",
  "bespoke",
] as const;
export type Category = (typeof CATEGORIES)[number];
export const REQUEST_STATES = [
  "draft",
  "details_captured",
  "consent_pending",
  "consented",
  "review_pending",
  "human_handoff_pending",
] as const;
export type RequestState = (typeof REQUEST_STATES)[number];
export type Locale = "th" | "en";
export const NOTICE_VERSION = "prototype-no-guarantee-v1";
export const CONSENT_VERSION = "prototype-demo-v1";
export const PROTOTYPE_FLAGS = {
  mock_data: true,
  prototype_only: true,
} as const;
export const SAFETY_FLAGS = {
  ...PROTOTYPE_FLAGS,
  production_publish: false,
  real_traffic: false,
  real_leads: false,
  paid_traffic: false,
  google_ads: false,
  dns_change: false,
  billing_change: false,
  real_customer_contact: false,
  external_notification: false,
} as const;
export type CondoDetails = {
  intent: "rent" | "buy";
  area_bts: string;
  budget: { min: number; max: number; currency: "THB" };
  bedrooms: number;
  move_timeframe: string;
};
export type HotelDetails = {
  location: string;
  check_in: string;
  check_out: string;
  guests: number;
  preferences: string[];
};
export type AirportDetails = {
  pickup: string;
  destination: string;
  date_time: string;
  passengers: number;
};
export type DriverDetails = {
  date_time: string;
  pickup: string;
  itinerary: string;
  passengers: number;
};
export type BespokeDetails = { description_fixture: string; timing: string };
export type DetailsByCategory = {
  condo: CondoDetails;
  hotel: HotelDetails;
  airport_transfer: AirportDetails;
  car_with_driver: DriverDetails;
  private_driver: DriverDetails;
  bespoke: BespokeDetails;
};
export type RequestDetails = DetailsByCategory[Category];
export type CategoryDetails = {
  [C in Category]: { category: C; details: DetailsByCategory[C] };
}[Category];
export interface RequestRecord {
  id: string;
  revision: number;
  category: Category;
  details: RequestDetails | null;
  contact_fixture_id: string | null;
  state: RequestState;
  notice: { version: string | null; acknowledged: boolean };
  consent: {
    state: "unset" | "accepted" | "declined";
    version: string | null;
    copy_status: "REVIEW_REQUIRED";
    recorded_at: string | null;
  };
  image_ids: string[];
  images: Array<{ id: string; image_fixture_id: string; mock_data: true }>;
  handoff: {
    operations_destination: null;
    status: "BLOCKED_OWNER_AUTHORIZATION";
    notification_sent: false;
  };
  mock_data: true;
  prototype_only: true;
}
export type RequestDTO = RequestRecord;
export interface BootstrapData {
  csrf_token: string;
  locale: Locale;
  request_ids: string[];
}
export const ERROR_CODES = [
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "INVALID_PAYLOAD",
  "MOCK_DATA_REQUIRED",
  "CSRF_INVALID",
  "ORIGIN_DENIED",
  "IDEMPOTENCY_REQUIRED",
  "IDEMPOTENCY_CONFLICT",
  "REVISION_CONFLICT",
  "INVALID_TRANSITION",
  "DETAILS_REQUIRED",
  "CONTACT_REQUIRED",
  "CONSENT_REQUIRED",
  "NOTICE_REQUIRED",
  "IMAGE_LIMIT",
  "BODY_TOO_LARGE",
  "UNSUPPORTED_MEDIA_TYPE",
  "METHOD_NOT_ALLOWED",
  "STORAGE_UNAVAILABLE",
  "INTERNAL_ERROR",
] as const;
export type ApiErrorCode = (typeof ERROR_CODES)[number];
export type Success<T> = { data: T; mock_data: true; prototype_only: true };
export type Failure = {
  error: { code: ApiErrorCode; message_key: string };
  mock_data: true;
  prototype_only: true;
};
