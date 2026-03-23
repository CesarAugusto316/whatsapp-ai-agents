/**
 *
 * @description Returns a Google Maps link for the given latitude and longitude.
 */
export const getGoogleMapLink = (
  longitude: number,
  latitude: number,
): string => {
  // Use official Google Maps URL format with query parameters
  return `https://www.google.com/maps/search/?api=1&query=${latitude.toString().trim()},${longitude.toString().trim()}`.trim();
};
