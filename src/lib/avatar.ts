/**
 * Avatar utilities for generating user avatars with multiple fallback options
 */

import { createHash } from "crypto";

/**
 * Generate Gravatar URL for a given email
 * @param email - User's email address
 * @param size - Size of the avatar (default: 80)
 * @param defaultType - Default avatar type when no Gravatar exists (default: 'identicon')
 */
export function generateGravatarUrl(
  email: string,
  size = 80,
  defaultType:
    | "404"
    | "mp"
    | "identicon"
    | "monsterid"
    | "wavatar"
    | "retro"
    | "robohash"
    | "blank" = "identicon",
): string {
  const emailHash = createHash("md5")
    .update(email.toLowerCase().trim())
    .digest("hex");

  return `https://www.gravatar.com/avatar/${emailHash}?s=${size}&d=${defaultType}`;
}

/**
 * Generate initials from a user's name
 * @param name - User's full name
 * @returns String of initials (up to 2 characters)
 */
export function generateInitials(name: string): string {
  if (!name) return "";

  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }

  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

/**
 * Get the best available avatar URL with fallback logic
 * @param user - User object with potential image, name, and email
 * @param size - Avatar size for Gravatar (default: 80)
 * @returns Object with avatar URL and whether it's a fallback
 */
export function getAvatarUrl(
  user:
    | {
        image?: string | null;
        name?: string;
        email?: string;
      }
    | null
    | undefined,
  size = 80,
): {
  src: string;
  alt: string;
  fallback: string;
  isGravatar: boolean;
  isProfileImage: boolean;
} {
  // If user has a profile image (from OAuth), use it
  if (user?.image) {
    return {
      src: user.image,
      alt: user.name || user.email || "User avatar",
      fallback: generateInitials(user.name || ""),
      isGravatar: false,
      isProfileImage: true,
    };
  }

  // If user has email, try Gravatar
  if (user?.email) {
    return {
      src: generateGravatarUrl(user.email, size, "identicon"),
      alt: user.name || user.email,
      fallback: generateInitials(user.name || ""),
      isGravatar: true,
      isProfileImage: false,
    };
  }

  // Final fallback - use initials or a default
  const initials = generateInitials(user?.name || "");
  return {
    src: "", // Empty string will trigger the fallback
    alt: user?.name || "User",
    fallback: initials || "U",
    isGravatar: false,
    isProfileImage: false,
  };
}
