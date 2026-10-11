import type { MetadataRoute } from 'next';

// Lets Chrome on the counter's Android terminal install the board as an app:
// its own icon, full screen with no address bar, opening straight on orders.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Mr. Big Belly · Admin',
    short_name: 'BigBelly Admin',
    start_url: '/orders',
    scope: '/',
    display: 'standalone',
    background_color: '#FFFCF7',
    theme_color: '#145DA0',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
