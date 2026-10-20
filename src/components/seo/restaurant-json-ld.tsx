import { SITE } from "@/lib/constants";

export function RestaurantJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "@id": `${SITE.url}/#restaurant`,
    name: SITE.name,
    description: SITE.description,
    url: SITE.url,
    telephone: SITE.phoneRaw,
    email: SITE.email,
    image: [
      `${SITE.url}/images/hero/restaurant.jpg`,
      `${SITE.url}/images/venues/garden.jpg`,
      `${SITE.url}/images/gallery/interior.jpg`,
    ],
    logo: `${SITE.url}/icons/icon-512.png`,
    priceRange: "Rs 200–1,500",
    servesCuisine: ["Nepali", "Indian", "Asian", "Continental"],
    currenciesAccepted: "NPR",
    paymentAccepted: "Cash, eSewa, Khalti",
    menu: `${SITE.url}/menu`,
    acceptsReservations: "True",
    hasMap: SITE.mapUrl,
    sameAs: [SITE.facebook],
    address: {
      "@type": "PostalAddress",
      streetAddress: SITE.address.line1,
      addressLocality: SITE.address.city,
      addressRegion: SITE.address.state,
      postalCode: "56613",
      addressCountry: "NP",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: SITE.coordinates.lat,
      longitude: SITE.coordinates.lng,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
        opens: "09:00",
        closes: "22:00",
      },
    ],
    amenityFeature: [
      { "@type": "LocationFeatureSpecification", name: "Outdoor garden" },
      { "@type": "LocationFeatureSpecification", name: "Banquet hall" },
      { "@type": "LocationFeatureSpecification", name: "Meeting rooms" },
      { "@type": "LocationFeatureSpecification", name: "Parking" },
      { "@type": "LocationFeatureSpecification", name: "Bar" },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
