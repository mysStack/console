/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

const nativeWorkloadRoute = /(?:^|\/)(deployments|statefulsets|daemonsets)(?:\/|$)/;

export function shouldPreloadConsoleV3(pathname: string) {
  return !nativeWorkloadRoute.test(pathname);
}
