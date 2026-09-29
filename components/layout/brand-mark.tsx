import Image from "next/image";
import { cn } from "@/lib/utils";

/** The MoveUp wordmark logo. Sized by height; width follows the 490:175 aspect. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <Image
      src="/logo/moveup-logo.png"
      alt="MoveUp — Elevating Potential"
      width={490}
      height={175}
      priority
      className={cn("h-10 w-auto max-w-full object-contain", className)}
    />
  );
}
