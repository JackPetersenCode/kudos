import type { Libraries } from "@react-google-maps/api";

export const googleMapsLibraries: Libraries = ["maps"];

export const googleMapsLoaderOptions = {
  id: "google-maps-script",
  googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  libraries: googleMapsLibraries,
};