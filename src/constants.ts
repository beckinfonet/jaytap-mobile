/**
 * App configuration constants.
 * Centralized here for easy domain/URL updates.
 *
 * Domain migration: bizdinkonush.com → moveinplatform.com (Mar 2025)
 * Deep link parsing supports both domains for backward compatibility with old shared links.
 */

/** Base URL for the property platform (used for share links and universal links) */
export const APP_BASE_URL = 'https://www.moveinplatform.com';

/** Generate a shareable property URL */
export const getPropertyShareUrl = (propertyId: string): string =>
  `${APP_BASE_URL}/property/${propertyId}`;
