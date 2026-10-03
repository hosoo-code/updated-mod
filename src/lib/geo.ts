/**
 * Байршлын мэдээлэл — privacy-first.
 *
 * Шаардлагагүй бол яг координат биш, ЗӨВХӨН ойролцоо (coarse) байршил хадгална.
 * 2 аравтын орон ≈ 1.1км нарийвчлалтай — хот/аймгийн түвшинд хангалттай.
 * Public API-д координат ХЭЗЭЭ Ч илгээгдэхгүй, зөвхөн admin харна.
 */

export const COARSE_DECIMALS = 2;

export interface CoarseLocation {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  isCoarse: boolean;
}

export function coarsen(lat: number, lng: number, accuracy: number): CoarseLocation {
  const factor = Math.pow(10, COARSE_DECIMALS);
  return {
    latitude: Math.round(lat * factor) / factor,
    longitude: Math.round(lng * factor) / factor,
    accuracy: Math.round(accuracy),
    isCoarse: true,
  };
}

/** Ойролцоо координатын хүрээг тодорхойлох (хот/дүүргийн түвшин) */
export function coarseRangeDescription(lat: number | null, lng: number | null): string {
  if (lat === null || lng === null) return "Мэдээлэл алга";
  return `Ойролцоо: ${lat.toFixed(2)}, ${lng.toFixed(2)} (±1км)`;
}
