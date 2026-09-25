import type { Category, CategoryDetails } from "./contracts.js";

export const PROPERTY_IDS = ["mock-property-1", "mock-property-2"] as const;
export const HOTEL_IDS = ["mock-hotel-1", "mock-hotel-2"] as const;
export const CONTACT_FIXTURES = [
  { id: "mock-contact-01", display_key: "fixture.contact.01", mock_data: true },
  { id: "mock-contact-02", display_key: "fixture.contact.02", mock_data: true },
] as const;
export const IMAGE_FIXTURES = ["01", "02", "03", "04", "05"].map((suffix) => ({
  id: `mock-image-${suffix}`,
  src: `/assets/fixtures/mock-image-${suffix}.svg`,
  label_key: `fixture.image.${suffix}`,
  mock_data: true as const,
}));
export type DetailPreset = CategoryDetails & {
  id: string;
  label_key: string;
  mock_data: true;
};
export const DETAIL_PRESETS: readonly DetailPreset[] = [
  {
    id: "condo-01",
    label_key: "fixture.condo.01",
    category: "condo",
    details: {
      intent: "rent",
      area_bts: "mock-bts-garden",
      budget: { min: 20000, max: 35000, currency: "THB" },
      bedrooms: 1,
      move_timeframe: "mock-next-month",
    },
    mock_data: true,
  },
  {
    id: "condo-02",
    label_key: "fixture.condo.02",
    category: "condo",
    details: {
      intent: "buy",
      area_bts: "mock-bts-riverside",
      budget: { min: 4000000, max: 6000000, currency: "THB" },
      bedrooms: 2,
      move_timeframe: "mock-three-months",
    },
    mock_data: true,
  },
  {
    id: "hotel-01",
    label_key: "fixture.hotel.01",
    category: "hotel",
    details: {
      location: "mock-riverside",
      check_in: "2030-02-01",
      check_out: "2030-02-04",
      guests: 2,
      preferences: ["mock-quiet-room"],
    },
    mock_data: true,
  },
  {
    id: "hotel-02",
    label_key: "fixture.hotel.02",
    category: "hotel",
    details: {
      location: "mock-garden-quarter",
      check_in: "2030-03-10",
      check_out: "2030-03-12",
      guests: 1,
      preferences: ["mock-garden-view"],
    },
    mock_data: true,
  },
  {
    id: "airport_transfer-01",
    label_key: "fixture.airport_transfer.01",
    category: "airport_transfer",
    details: {
      pickup: "mock-airport-a",
      destination: "mock-hotel-a",
      date_time: "2030-02-01T10:00:00+07:00",
      passengers: 2,
    },
    mock_data: true,
  },
  {
    id: "airport_transfer-02",
    label_key: "fixture.airport_transfer.02",
    category: "airport_transfer",
    details: {
      pickup: "mock-hotel-a",
      destination: "mock-airport-a",
      date_time: "2030-02-04T14:00:00+07:00",
      passengers: 1,
    },
    mock_data: true,
  },
  {
    id: "car_with_driver-01",
    label_key: "fixture.car_with_driver.01",
    category: "car_with_driver",
    details: {
      date_time: "2030-02-02T10:00:00+07:00",
      pickup: "mock-hotel-a",
      itinerary: "mock-city-half-day",
      passengers: 2,
    },
    mock_data: true,
  },
  {
    id: "car_with_driver-02",
    label_key: "fixture.car_with_driver.02",
    category: "car_with_driver",
    details: {
      date_time: "2030-03-11T09:00:00+07:00",
      pickup: "mock-garden-lobby",
      itinerary: "mock-city-full-day",
      passengers: 4,
    },
    mock_data: true,
  },
  {
    id: "private_driver-01",
    label_key: "fixture.private_driver.01",
    category: "private_driver",
    details: {
      date_time: "2030-02-02T10:00:00+07:00",
      pickup: "mock-hotel-a",
      itinerary: "mock-city-half-day",
      passengers: 2,
    },
    mock_data: true,
  },
  {
    id: "private_driver-02",
    label_key: "fixture.private_driver.02",
    category: "private_driver",
    details: {
      date_time: "2030-03-11T09:00:00+07:00",
      pickup: "mock-garden-lobby",
      itinerary: "mock-city-full-day",
      passengers: 4,
    },
    mock_data: true,
  },
  {
    id: "bespoke-01",
    label_key: "fixture.bespoke.01",
    category: "bespoke",
    details: {
      description_fixture: "mock-dinner-planning",
      timing: "mock-next-evening",
    },
    mock_data: true,
  },
  {
    id: "bespoke-02",
    label_key: "fixture.bespoke.02",
    category: "bespoke",
    details: {
      description_fixture: "mock-city-orientation",
      timing: "mock-next-week",
    },
    mock_data: true,
  },
];
export function presetsFor(category: Category): readonly DetailPreset[] {
  return DETAIL_PRESETS.filter((preset) => preset.category === category);
}
