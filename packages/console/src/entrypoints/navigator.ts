import './navigator.css';
import { hasPermission } from '../../../shared/src/utils/nav';

const PREFIX = '/project-console';
const root = document.getElementById('root')!;
const zh = String((window as any).globals.user?.lang || navigator.language).startsWith('zh');
const text = zh
  ? {
      home: '项目导航',
      full: '完整控制台',
      spaces: '企业空间管理',
      projects: '项目',
      settings: '企业空间设置',
      clusters: '集群管理',
      accounts: '用户和角色管理',
      extensions: '扩展中心',
      workloads: '工作负载',
      apps: '应用商店',
      market: '扩展市场',
      logout: '退出',
      loading: '正在加载…',
      retry: '重试',
      cluster: '集群',
      empty: '没有可访问的资源',
      previous: '上一页',
      next: '下一页',
      forbidden: '没有权限查看这些资源',
      unavailable: '资源暂时不可用',
      overview: '完整概览',
    }
  : {
      home: 'Project navigator',
      full: 'Full console',
      spaces: 'Workspaces',
      projects: 'Projects',
      settings: 'Workspace settings',
      clusters: 'Clusters',
      accounts: 'Users and roles',
      extensions: 'Extensions',
      workloads: 'Workloads',
      apps: 'App Store',
      market: 'Marketplace',
      logout: 'Log out',
      loading: 'Loading…',
      retry: 'Retry',
      cluster: 'Cluster',
      empty: 'No accessible resources',
      previous: 'Previous',
      next: 'Next',
      forbidden: 'Access denied',
      unavailable: 'Resources are unavailable',
      overview: 'Full overview',
    };
let generation = 0;
let controller = new AbortController();

function element<K extends keyof HTMLElementTagNameMap>(tag: K, label = '') {
  const node = document.createElement(tag);
  node.textContent = label;
  return node;
}
function link(href: string, label: string) {
  const node = element('a', label);
  node.href = href;
  if (href.startsWith(PREFIX + '/')) node.dataset.navigatorLink = '';
  return node;
}
function nameOf(item: any): string {
  return item.metadata?.name || item.name || '';
}
async function read(url: string) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    signal: controller.signal,
    cache: 'no-store',
  });
  if (response.status === 401) {
    location.assign('/logout');
    throw Error('401');
  }
  if (!response.ok) throw Error(String(response.status));
  return response.json();
}
function itemsOf(body: any) {
  return Array.isArray(body) ? body : body.items || [];
}
function header() {
  const nav = element('nav');
  nav.setAttribute('aria-label', text.home);
  nav.append(
    link(PREFIX + '/dashboard', text.home),
    link('/dashboard', text.full),
    link('/apps', text.apps),
    link('/extensions/marketplace', text.market),
    link('/logout', text.logout),
  );
  return nav;
}
function overview(workspace: string, cluster?: string, namespace?: string) {
  const section = element('section');
  if (!namespace) {
    section.append(element('h1', workspace));
    const menu = element('div');
    menu.className = 'navigator-menu';
    menu.append(
      link(PREFIX + '/workspaces/' + encodeURIComponent(workspace) + '/projects', text.projects),
    );
    menu.append(link('/workspaces/' + encodeURIComponent(workspace) + '/overview', text.overview));
    menu.append(link('/workspaces/' + encodeURIComponent(workspace) + '/base-info', text.settings));
    section.append(menu);
  } else {
    section.append(element('h1', namespace));
    const path =
      '/' +
      encodeURIComponent(workspace) +
      '/clusters/' +
      encodeURIComponent(cluster!) +
      '/projects/' +
      encodeURIComponent(namespace);
    const menu = element('div');
    menu.className = 'navigator-menu';
    menu.append(
      link('/consolev3' + path + '/deployments', text.workloads),
      link(path + '/overview', text.overview),
      link(path + '/deployments', text.full),
    );
    section.append(menu);
  }
  return section;
}
function dashboard() {
  const section = element('section');
  section.append(element('h1', text.home));
  const cards = element('div');
  cards.className = 'navigator-cards';
  const user = (window as any).globals.user;
  if (
    hasPermission({ module: 'workspaces', action: 'global-view-workspaces' }) ||
    hasPermission({ module: 'workspaces', action: 'global-create-workspaces' }) ||
    user.workspaces?.length
  )
    cards.append(link(PREFIX + '/access/workspaces', text.spaces));
  if (
    hasPermission({ module: 'clusters', action: 'global-view-clusters' }) ||
    user.clusters?.length
  )
    cards.append(link('/clusters', text.clusters));
  if (
    hasPermission({ module: 'roles', action: 'global-view-roles' }) ||
    hasPermission({ module: 'users', action: 'global-view-users' })
  )
    cards.append(link('/access/accounts', text.accounts));
  if (hasPermission({ module: 'platform-settings', action: 'global-manage-platform-settings' }))
    cards.append(link('/extensions/management', text.extensions));
  section.append(cards);
  return section;
}
async function listing(section: HTMLElement, epoch: number, workspace?: string) {
  const parameters = new URL(location.href).searchParams;
  const page = Math.max(1, Number(parameters.get('page')) || 1);
  const limit = 20;
  section.append(element('h1', workspace ? text.projects + ' · ' + workspace : text.spaces));
  const status = element('p', text.loading);
  status.setAttribute('role', 'status');
  section.append(status);
  let cluster = '';
  if (workspace) {
    const clusters = itemsOf(
      await read(
        '/kapis/tenant.kubesphere.io/v1beta1/workspaces/' +
          encodeURIComponent(workspace) +
          '/clusters',
      ),
    );
    if (epoch !== generation) return;
    cluster = parameters.get('cluster') || nameOf(clusters[0] || {});
    if (!cluster || !clusters.some((item: any) => nameOf(item) === cluster)) throw Error('403');
    const label = element('label', text.cluster + ' ');
    const select = element('select');
    select.setAttribute('aria-label', text.cluster);
    for (const item of clusters) {
      const option = element('option', nameOf(item));
      option.value = nameOf(item);
      select.append(option);
    }
    select.value = cluster;
    select.onchange = () =>
      navigate(
        PREFIX +
          '/workspaces/' +
          encodeURIComponent(workspace) +
          '/projects?cluster=' +
          encodeURIComponent(select.value),
      );
    label.append(select);
    section.insertBefore(label, status);
  }
  const workspaceModule =
    (window as any).globals.clusterRole === 'host' ? 'workspacetemplates' : 'workspaces';
  const url = workspace
    ? '/clusters/' +
      encodeURIComponent(cluster) +
      '/kapis/tenant.kubesphere.io/v1beta1/workspaces/' +
      encodeURIComponent(workspace) +
      '/namespaces'
    : '/kapis/tenant.kubesphere.io/v1beta1/' + workspaceModule;
  const query = new URLSearchParams({
    limit: String(limit),
    page: String(page),
    sortBy: 'name',
    ascending: 'true',
  });
  if (workspace) query.set('labelSelector', 'kubesphere.io/managed=true');
  const body = await read(url + '?' + query);
  if (epoch !== generation) return;
  const items = itemsOf(body);
  status.remove();
  const list = element('ul');
  list.className = 'navigator-list';
  for (const item of items) {
    const name = nameOf(item);
    if (!name) continue;
    const href = workspace
      ? PREFIX +
        '/' +
        encodeURIComponent(workspace) +
        '/clusters/' +
        encodeURIComponent(cluster) +
        '/projects/' +
        encodeURIComponent(name) +
        '/overview'
      : PREFIX + '/workspaces/' + encodeURIComponent(name) + '/overview';
    const row = element('li');
    row.append(link(href, name));
    list.append(row);
  }
  section.append(list);
  if (!items.length) section.append(element('p', text.empty));
  const controls = element('div');
  controls.className = 'navigator-pagination';
  const previous = element('button', text.previous);
  previous.disabled = page === 1;
  const next = element('button', text.next);
  next.disabled =
    body.totalItems === undefined ? items.length < limit : page * limit >= Number(body.totalItems);
  function go(number: number) {
    const url = new URL(location.href);
    url.searchParams.set('page', String(number));
    navigate(url.pathname + url.search);
  }
  previous.onclick = () => go(page - 1);
  next.onclick = () => go(page + 1);
  controls.append(previous, element('span', String(page)), next);
  section.append(controls);
}
function navigate(path: string) {
  history.pushState(null, '', path);
  render();
}
async function render() {
  controller.abort();
  controller = new AbortController();
  const epoch = ++generation;
  const main = element('main');
  root.replaceChildren(header(), main);
  try {
    const pathname = location.pathname;
    let match;
    if (pathname === PREFIX + '/dashboard') main.append(dashboard());
    else if (pathname === PREFIX + '/access/workspaces') await listing(main, epoch);
    else if (
      (match = pathname.match(/^\/project-console\/workspaces\/([^/]+)\/(overview|projects)$/))
    ) {
      const workspace = decodeURIComponent(match[1]);
      if (match[2] === 'overview') main.append(overview(workspace));
      else await listing(main, epoch, workspace);
    } else if (
      (match = pathname.match(
        /^\/project-console\/([^/]+)\/clusters\/([^/]+)\/projects\/([^/]+)\/overview$/,
      ))
    ) {
      main.append(
        overview(
          decodeURIComponent(match[1]),
          decodeURIComponent(match[2]),
          decodeURIComponent(match[3]),
        ),
      );
    } else throw Error('404');
  } catch (error) {
    if (epoch !== generation) return;
    const alert = element(
      'p',
      (error as Error).message === '403' ? text.forbidden : text.unavailable,
    );
    alert.setAttribute('role', 'alert');
    const retry = element('button', text.retry);
    retry.onclick = render;
    main.replaceChildren(alert, retry, link('/dashboard', text.full));
  }
}
document.addEventListener('click', event => {
  const click = event as MouseEvent;
  if (click.button || click.metaKey || click.ctrlKey || click.shiftKey || click.altKey) return;
  const anchor = (event.target as Element).closest<HTMLAnchorElement>('a[data-navigator-link]');
  if (!anchor) return;
  event.preventDefault();
  const url = new URL(anchor.href);
  navigate(url.pathname + url.search);
});
addEventListener('popstate', render);
addEventListener('pageshow', event => {
  if (event.persisted) location.reload();
});
addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') location.reload();
});
render();
