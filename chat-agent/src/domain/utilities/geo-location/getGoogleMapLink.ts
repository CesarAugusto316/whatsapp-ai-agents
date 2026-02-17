/**
 *
 * @description Returns a Google Maps link for the given latitude and longitude.
 */
export const getGoogleMapLink = (
  longitude: number,
  latitude: number,
): string => {
  // return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  return `https://www.google.com/maps/place/${latitude.toString().trim()},${longitude.toString().trim()}`.trim();
};
