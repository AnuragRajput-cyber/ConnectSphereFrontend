export function buildInitials(label: string): string {
  return label
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function buildAvatarDataUri(label: string, seed: string): string {
  const initials = buildInitials(label || 'User');
  const hue = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="hsl(${hue}, 78%, 68%)" />
          <stop offset="100%" stop-color="hsl(${(hue + 28) % 360}, 72%, 58%)" />
        </linearGradient>
      </defs>
      <rect width="96" height="96" rx="28" fill="url(#bg)" />
      <text x="48" y="53" text-anchor="middle" fill="white" font-size="28" font-family="Inter, Arial, sans-serif" font-weight="700">${initials}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
