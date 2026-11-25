interface AthenaeumLogoProps {
  size?: 'sm' | 'md' | 'lg';
}

export function AthenaeumLogo({ size = 'md' }: AthenaeumLogoProps) {
  const boxClass =
    size === 'lg'
      ? 'w-11 h-11 rounded-2xl'
      : size === 'sm'
        ? 'w-7 h-7 rounded-lg'
        : 'w-8 h-8 rounded-xl';
  const iconClass = size === 'lg' ? 'w-6 h-6' : size === 'sm' ? 'w-4 h-4' : 'w-4.5 h-4.5';

  return (
    <div
      className={`${boxClass} relative flex items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 text-white shadow-sm shrink-0`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={iconClass}
      >
        <path d="M12 3L4 19h16L12 3z" />
        <path d="M8.5 14h7" />
        <circle cx="12" cy="9.5" r="1.2" fill="currentColor" stroke="none" />
      </svg>
    </div>
  );
}
