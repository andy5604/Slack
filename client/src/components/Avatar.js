import React from 'react';

export default function Avatar({ user, size = 36 }) {
  if (!user) return null;
  const initials = (user.display_name || user.username || '?')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: 4,
      background: user.avatar_color || '#4A154B',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontWeight: 700,
      fontSize: size * 0.38,
      flexShrink: 0,
      lineHeight: 1,
      fontFamily: 'inherit',
      userSelect: 'none',
    }}>
      {initials}
    </div>
  );
}
