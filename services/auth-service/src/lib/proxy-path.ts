/** Express mount strips the prefix; restore it for the upstream service. */
export function proxyPathRewrite(mountPath: string, path: string): string {
  return path === '/' ? mountPath : `${mountPath}${path}`;
}
