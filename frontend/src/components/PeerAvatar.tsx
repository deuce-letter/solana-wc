import { useState } from "react";

interface PeerAvatarProps {
  name: string;
  icon: string | null;
  baseUrl?: string;
}

function resolveIconUrl(icon: string, baseUrl?: string): string | null {
  try {
    return baseUrl ? new URL(icon, baseUrl).href : new URL(icon).href;
  } catch {
    return null;
  }
}

export function PeerAvatar({ name, icon, baseUrl }: PeerAvatarProps) {
  const [failedIcon, setFailedIcon] = useState<string | null>(null);
  const resolvedIcon = icon ? resolveIconUrl(icon, baseUrl) : null;

  return (
    <div className="peer-avatar" aria-hidden="true">
      <span>{name.trim().charAt(0).toUpperCase() || "?"}</span>
      {resolvedIcon && failedIcon !== resolvedIcon && (
        <img
          src={resolvedIcon}
          alt=""
          onError={() => setFailedIcon(resolvedIcon)}
        />
      )}
    </div>
  );
}
