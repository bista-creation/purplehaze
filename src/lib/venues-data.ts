export interface VenueSpace {
  id: string;
  name: string;
  slug: string;
  capacity: number | null;
  capacityDisplay: string;
  suitableFor: string[];
  description: string;
  longDescription: string;
  image: string;
  gallery: string[];
  features: string[];
  sortOrder: number;
}

export const CANONICAL_VENUES: VenueSpace[] = [
  {
    id: "venue-banquet-hall",
    name: "Banquet Hall",
    slug: "banquet-hall",
    capacity: 300,
    capacityDisplay: "Up to 300 guests",
    suitableFor: [
      "Weddings",
      "Receptions",
      "Celebrations",
      "Large corporate events",
    ],
    description:
      "A grand indoor hall welcoming up to 300 guests for weddings, receptions, milestone celebrations, and large corporate events.",
    longDescription:
      "Step into our spacious banquet hall, where generous staging, refined indoor acoustics, and welcoming hospitality come together. Whether you are hosting an elaborate wedding reception, an anniversary gala, or an annual corporate dinner, the hall offers a dignified, expansive setting designed to make your guests feel celebrated from their first welcome drink to the evening's final toasts.",
    image: "/images/venues/banquet.jpg",
    gallery: [
      "/images/venues/banquet.jpg",
      "/images/venues/banquet-hall-setup.jpg",
      "/images/venues/Bighall.jpg",
      "/images/venues/hall-stage.jpg",
    ],
    features: [
      "Up to 300 guests",
      "Weddings & Receptions",
      "Celebrations & Galas",
      "Large Corporate Events",
      "Dedicated Stage & Presentation Area",
      "Flexible Dining Layouts",
    ],
    sortOrder: 1,
  },
  {
    id: "venue-meeting-hall-100",
    name: "Meeting Hall (100 Guests)",
    slug: "meeting-hall-100",
    capacity: 100,
    capacityDisplay: "Up to 100 guests",
    suitableFor: [
      "Corporate meetings",
      "Seminars",
      "Workshops",
      "Private gatherings",
    ],
    description:
      "A dedicated indoor hall tailored for corporate meetings, seminars, workshops, and private gatherings for up to 100 guests.",
    longDescription:
      "Designed for productive focus and professional events, this hall comfortably accommodates up to 100 attendees in theater, classroom, or banquet configurations. It is the natural choice for regional business conferences, company training sessions, academic seminars, and private group gatherings requiring an organized, distraction-free environment.",
    image: "/images/venues/meeting-hall.jpg",
    gallery: [
      "/images/venues/meeting-hall.jpg",
      "/images/venues/meeting.jpg",
    ],
    features: [
      "Up to 100 guests",
      "Corporate Meetings",
      "Seminars & Presentations",
      "Multi-Team Workshops",
      "Private Gatherings",
      "Flexible Seating Layouts",
    ],
    sortOrder: 2,
  },
  {
    id: "venue-meeting-hall-50",
    name: "Meeting Hall (50 Guests)",
    slug: "meeting-hall-50",
    capacity: 50,
    capacityDisplay: "Up to 50 guests",
    suitableFor: [
      "Smaller meetings",
      "Workshops",
      "Intimate events",
    ],
    description:
      "An intimate meeting space ideally proportioned for smaller meetings, focused workshops, and intimate private events of up to 50 guests.",
    longDescription:
      "When your gathering calls for closer collaboration and a personal atmosphere, this 50-guest hall provides the ideal setting. Perfectly scaled for departmental planning sessions, interactive team workshops, executive board meets, or intimate milestone dinners where every voice matters.",
    image: "/images/venues/mini-hall.jpg",
    gallery: [
      "/images/venues/mini-hall.jpg",
      "/images/venues/meeting.jpg",
    ],
    features: [
      "Up to 50 guests",
      "Smaller Meetings",
      "Collaborative Workshops",
      "Intimate Private Events",
      "Interactive Discussion Setup",
    ],
    sortOrder: 3,
  },
  {
    id: "venue-open-garden",
    name: "Open Garden",
    slug: "open-garden",
    capacity: null,
    capacityDisplay: "Flexible outdoor capacity",
    suitableFor: [
      "Weddings",
      "Outdoor celebrations",
      "Corporate gatherings",
      "Music events",
    ],
    description:
      "Our signature open-air garden space surrounded by greenery and evening lights, perfect for weddings, outdoor celebrations, corporate gatherings, and music events.",
    longDescription:
      "Experience the welcoming atmosphere of Purple Haze under the open Biratnagar sky. The lush garden provides an expansive natural backdrop that transitions seamlessly from sunlit daytime ceremonies to illuminated evening receptions, outdoor banquets, and vibrant musical gatherings. Capacity is tailored to your chosen layout and staging.",
    image: "/images/venues/garden-lawn.jpg",
    gallery: [
      "/images/venues/garden-lawn.jpg",
      "/images/venues/garden.jpg",
      "/images/venues/garden-sitting-area.jpg",
      "/images/venues/outdoor-party.jpg",
    ],
    features: [
      "Capacity on enquiry",
      "Outdoor Weddings",
      "Open-Air Celebrations",
      "Corporate Gatherings",
      "Live Music & Cultural Evenings",
      "Natural Garden Backdrop",
    ],
    sortOrder: 4,
  },
];
