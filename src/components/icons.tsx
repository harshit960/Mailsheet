interface IconProps {
  className?: string;
}

function base(className?: string) {
  return {
    width: 14,
    height: 14,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };
}

export function PlusIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M8 3.5v9M3.5 8h9" />
    </svg>
  );
}

export function SparkIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M8 2.5 9.3 6.2 13 7.5l-3.7 1.3L8 12.5 6.7 8.8 3 7.5l3.7-1.3z" />
    </svg>
  );
}

export function MailIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <rect x="2" y="3.5" width="12" height="9" rx="1.5" />
      <path d="m2.5 5 5 3.2a1 1 0 0 0 1 0L13.5 5" />
    </svg>
  );
}

export function TrashIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8h5.8l.6-8" />
    </svg>
  );
}

export function DownloadIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M8 2.5v7m0 0L5.5 7M8 9.5 10.5 7M3 12.5h10" />
    </svg>
  );
}

export function UploadIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M8 10V3m0 0L5.5 5.5M8 3l2.5 2.5M3 12.5h10" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="m4 4 8 8M12 4l-8 8" />
    </svg>
  );
}

export function CopyIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
      <path d="M10.5 5.5v-1a1.5 1.5 0 0 0-1.5-1.5H4a1.5 1.5 0 0 0-1.5 1.5v5A1.5 1.5 0 0 0 4 11h1" />
    </svg>
  );
}

export function SlidersIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M2.5 5h11M2.5 11h11" />
      <circle cx="6" cy="5" r="1.6" />
      <circle cx="10" cy="11" r="1.6" />
    </svg>
  );
}

export function FileTextIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M9 2.5H4.5A1.5 1.5 0 0 0 3 4v8a1.5 1.5 0 0 0 1.5 1.5h7A1.5 1.5 0 0 0 13 12V6.5z" />
      <path d="M9 2.5v4h4M5.5 9h5M5.5 11h3" />
    </svg>
  );
}

export function ExternalIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M9 3h4v4M13 3 7.5 8.5M12 9.5V12a1.5 1.5 0 0 1-1.5 1.5h-6A1.5 1.5 0 0 1 3 12V6a1.5 1.5 0 0 1 1.5-1.5H7" />
    </svg>
  );
}

export function StopIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <rect x="4" y="4" width="8" height="8" rx="1.5" />
    </svg>
  );
}

export function GithubIcon({ className }: IconProps) {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M8 .2a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38l-.01-1.34c-2.23.48-2.7-1.07-2.7-1.07-.36-.93-.89-1.18-.89-1.18-.73-.5.06-.49.06-.49.8.06 1.23.83 1.23.83.72 1.23 1.88.87 2.34.67.07-.52.28-.88.51-1.08-1.78-.2-3.64-.89-3.64-3.96 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.08-1.87 3.76-3.65 3.96.29.25.54.73.54 1.48l-.01 2.2c0 .21.15.46.55.38A8 8 0 0 0 8 .2Z" />
    </svg>
  );
}
