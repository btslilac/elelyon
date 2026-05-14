import Image from "next/image";
import { cn } from "@/lib/utils";

interface ClientAvatarProps {
  firstName: string;
  lastName: string;
  photoUrl?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export default function ClientAvatar({
  firstName,
  lastName,
  photoUrl,
  size = "md",
  className,
}: ClientAvatarProps) {
  const initials = `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();

  const sizeClasses = {
    sm: "size-8 text-10",
    md: "size-10 text-12",
    lg: "size-16 text-20",
    xl: "size-24 text-24",
  };

  return (
    <div
      className={cn(
        "relative flex-shrink-0 rounded-full flex items-center justify-center font-bold overflow-hidden border border-gray-100 bg-gray-50 text-gray-700",
        sizeClasses[size],
        className
      )}
    >
      {photoUrl ? (
        <Image
          src={photoUrl}
          alt={`${firstName} ${lastName}`}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}
