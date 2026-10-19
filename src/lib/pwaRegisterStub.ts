// Single-file build: there is no service worker (the file is already local).
export function registerSW(_opts?: unknown) {
  return (_reload?: boolean) => Promise.resolve()
}
