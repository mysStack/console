import { request } from '@ks-console/shared';

export interface ImageScope {
  cluster: string;
  namespace: string;
}

function scopedPath(scope: ImageScope, api = 'kapis/resources.kubesphere.io/v1alpha3') {
  if (!scope?.cluster || !scope.namespace) throw new Error('IMAGE_SCOPE_REQUIRED');
  return [
    'clusters',
    encodeURIComponent(scope.cluster),
    api,
    'namespaces',
    encodeURIComponent(scope.namespace),
  ].join('/');
}

export class ImageLookupError extends Error {
  certificate: boolean;

  constructor(certificate: boolean) {
    super(certificate ? 'CERT_ERROR' : 'NO_IMAGE_FOUND');
    Object.setPrototypeOf(this, new.target.prototype);
    this.certificate = certificate;
  }
}

async function getImageData(url: string, params: Record<string, unknown>) {
  try {
    const data: any = await request.get(url, {
      params,
      timeout: 15000,
      headers: { 'x-ignore-error-notify': 'true' },
    });
    if (data?.status === 'failed') throw new ImageLookupError(/x509/i.test(data.message || ''));
    return data;
  } catch (error: any) {
    if (error instanceof ImageLookupError) throw error;
    throw new ImageLookupError(/x509/i.test(error?.response?.data?.message || ''));
  }
}

export async function searchImages(scope: ImageScope, secret: string, keyword: string) {
  const path = scopedPath(scope);
  if (!keyword.trim()) return [] as string[];
  const data = await getImageData(`${path}/images`, { secret, q: keyword.trim() });
  return (Array.isArray(data?.entries) ? data.entries : []).filter(
    (entry: unknown): entry is string => typeof entry === 'string',
  );
}

export async function fetchImageTags(
  scope: ImageScope,
  secret: string,
  repository: string,
  page: number,
  insecure = false,
): Promise<{ tags: string[]; total: number }> {
  const data = await getImageData(`${scopedPath(scope)}/repositorytags`, {
    secret,
    repository,
    page,
    limit: 10,
    ...(insecure ? { insecure: true } : {}),
  });
  const tags = (Array.isArray(data?.tags) ? data.tags : []).filter(
    (tag: unknown): tag is string => typeof tag === 'string',
  );
  return { tags, total: Number(data?.total) || tags.length };
}

export async function fetchImageDetail(
  scope: ImageScope,
  secret: string,
  image: string,
  insecure = false,
) {
  const data = await getImageData(`${scopedPath(scope)}/imageconfig`, {
    secret,
    image,
    ...(insecure ? { insecure: true } : {}),
  });
  const layers: { size?: number }[] = data?.imageManifest?.layers || [];
  return {
    created: String(data?.created || ''),
    registry: String(data?.registry || ''),
    ports: Object.keys(data?.config?.ExposedPorts || {}),
    size: layers.reduce((sum, layer) => sum + (Number(layer.size) || 0), 0),
    layers: layers.length,
  };
}

export async function fetchRegistryHost(scope: ImageScope, secret: string): Promise<string> {
  if (!secret) return '';
  // 只读取选中的 Secret；原始响应不会进入 React Query 缓存或表单草稿。
  const data = await getImageData(
    `${scopedPath(scope, 'api/v1')}/secrets/${encodeURIComponent(secret)}`,
    {},
  );
  try {
    const config = JSON.parse(atob(data?.data?.['.dockerconfigjson'] || ''));
    const host = (Object.keys(config.auths || {})[0] || '')
      .replace(/^https?:\/\//, '')
      .split('/')[0];
    if (!host) throw new ImageLookupError(false);
    return host;
  } catch {
    throw new ImageLookupError(false);
  }
}

export function splitImageReference(image: string) {
  if (image.includes('@')) return { repository: image.split('@')[0], tag: '' };
  const colon = image.lastIndexOf(':');
  return colon > image.lastIndexOf('/')
    ? { repository: image.slice(0, colon), tag: image.slice(colon + 1) }
    : { repository: image, tag: 'latest' };
}

export function registryImage(host: string, repository: string) {
  return host && !repository.startsWith(`${host}/`) ? `${host}/${repository}` : repository;
}
