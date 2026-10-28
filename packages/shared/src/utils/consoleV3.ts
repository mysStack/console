/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

/**
 * Build the absolute URL prefix of the embedded V3 console for a project.
 *
 * Every V3 embed appends its route to this value, and `ConsoleV3ResourceList`
 * only mounts when the result contains `/consolev3/`. A bare project path is
 * resolved by Wujie against the host origin, so the V3 embed renders nothing.
 */
export function getConsoleV3UrlPrefix(
  projectPrefix: string,
  host: string = typeof window === 'undefined' ? '' : window.location.host,
): string {
  return `//${host}/consolev3${projectPrefix}`;
}
