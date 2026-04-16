export default function TikoLogo({ className = "h-16 md:h-20" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 280 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Ticket shape - orange */}
      <rect x="4" y="12" width="72" height="56" rx="10" fill="hsl(var(--primary))" />
      {/* Ticket notches */}
      <circle cx="4" cy="32" r="6" fill="hsl(var(--background))" />
      <circle cx="4" cy="48" r="6" fill="hsl(var(--background))" />
      <circle cx="76" cy="32" r="6" fill="hsl(var(--background))" />
      <circle cx="76" cy="48" r="6" fill="hsl(var(--background))" />
      {/* Eyes */}
      <circle cx="28" cy="33" r="4.5" fill="white" />
      <circle cx="48" cy="33" r="4.5" fill="white" />
      {/* Smile */}
      <path
        d="M26 46 C30 54, 46 54, 50 46"
        stroke="white"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Text "Tiko Pass" - uses foreground color for dark mode adaptation */}
      <text
        x="92"
        y="52"
        fontFamily="'Space Grotesk', sans-serif"
        fontWeight="700"
        fontSize="32"
        fill="hsl(var(--foreground))"
        letterSpacing="-0.5"
      >
        Tiko Pass
      </text>
    </svg>
  );
}
