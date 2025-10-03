"use client";

import { Avatar, AvatarFallback, AvatarImage } from "ui/avatar";
import { getAvatarUrl } from "lib/avatar";
import { cn } from "lib/utils";

interface UserAvatarProps {
  user?: {
    image?: string | null;
    name?: string;
    email?: string;
  } | null;
  size?: number;
  className?: string;
  showGravatarTooltip?: boolean;
}

/**
 * UserAvatar component that handles all avatar display logic with automatic fallbacks
 *
 * Priority order:
 * 1. User's profile image (from OAuth providers like Google)
 * 2. Gravatar based on email address
 * 3. Initials from user's name
 * 4. Single letter fallback
 */
export function UserAvatar({
  user,
  size = 32,
  className,
  showGravatarTooltip = false,
}: UserAvatarProps) {
  const avatar = getAvatarUrl(user, size);

  return (
    <Avatar
      className={cn("rounded-full shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <AvatarImage
        src={avatar.src}
        alt={avatar.alt}
        className="object-cover"
        referrerPolicy="no-referrer"
      />
      <AvatarFallback
        className="text-xs font-medium"
        title={
          showGravatarTooltip && avatar.isGravatar ? "Gravatar" : undefined
        }
      >
        {avatar.fallback}
      </AvatarFallback>
    </Avatar>
  );
}

/**
 * Hook to get avatar information for a user
 * Useful when you need the avatar data but want to render it differently
 */
export function useUserAvatar(
  user?: {
    image?: string | null;
    name?: string;
    email?: string;
  } | null,
  size = 32,
) {
  return getAvatarUrl(user, size);
}
