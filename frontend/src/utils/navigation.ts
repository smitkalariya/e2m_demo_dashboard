/** Thin wrappers around window.location — jsdom doesn't allow spying on
 * Location's own getters/setters directly, so this indirection is what
 * makes hard-navigation side effects (e.g. forced logout redirects)
 * mockable in tests. */

export function getCurrentPathname(): string {
  return window.location.pathname;
}

export function hardNavigate(path: string): void {
  window.location.href = path;
}
