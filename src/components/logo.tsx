import { cn } from "@/lib/utils";
import * as React from "react";

const Logo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M12 2a10 10 0 1 0 10 10" />
    <path d="M12 2a10 10 0 0 1 10 10" />
    <path d="M12 2v20" />
    <path d="M2 12h20" />
    <path d="M7 16l-1.3-1.3a1 1 0 0 0-1.4 0L3 16" />
    <path d="m7 16 3-3" />
    <path d="m14 8 3 3" />
    <path d="M21 8l-1.3 1.3a1 1 0 0 1-1.4 0L17 8" />
    <path d="m7 9 3-3" />
    <path d="m14 15 3 3" />
    <path d="M14 15l-3-3" />
    <path d="M20 18-3-3" />
    <path d="M20 6 9 17" />
    <path stroke="hsl(var(--background))" strokeWidth={3} d="m8 12.5 3 3L18 9" />
    <path d="m8 12.5 3 3L18 9" />
  </svg>
);

export default Logo;
