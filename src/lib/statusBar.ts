// The phone's status bar colour: the night colour on hub screens (and the splash), the table's felt in rooms

export const NIGHT_BAR = '#120b2e';

/** sets <meta name="theme-color"> from <html data-ui> and the table's bar colour (data-bar) */
export function syncStatusBar(): void {
  const root = document.documentElement;
  const color = root.dataset.ui === 'night' ? NIGHT_BAR : root.dataset.bar || NIGHT_BAR;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
}
