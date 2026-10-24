import React, { useState } from 'react';
import { Button, Input, Select } from '@kubed/components';
import { useQuery } from 'react-query';
import {
  fetchImageDetail,
  fetchImageTags,
  fetchRegistryHost,
  ImageLookupError,
  ImageScope,
  registryImage,
  searchImages,
  splitImageReference,
} from './workloadImages';

interface Props {
  value: string;
  onChange: (image: string) => void;
  secret: string;
  scope?: ImageScope;
}

export default function WorkloadImageInput({ value, onChange, secret, scope }: Props) {
  const [keyword, setKeyword] = useState('');
  const [search, setSearch] = useState('');
  const [inspectedImage, setInspectedImage] = useState(value);
  const [page, setPage] = useState(1);
  const [insecure, setInsecure] = useState(false);
  const enabled = Boolean(
    typeof globals !== 'undefined' &&
      globals.config.enableImageSearch &&
      scope?.cluster &&
      scope.namespace,
  );
  const identity = [
    scope?.cluster,
    scope?.namespace,
    secret,
    typeof globals === 'undefined' ? '' : globals.user?.username,
  ];
  const sameImage = Boolean(value && inspectedImage === value);
  const { repository, tag } = splitImageReference(value);
  const registry = useQuery<string, ImageLookupError>(
    ['workload-image-registry', ...identity],
    () => fetchRegistryHost(scope!, secret),
    { enabled: enabled && Boolean(secret), retry: false },
  );
  const images = useQuery<string[], ImageLookupError>(
    ['workload-image-search', ...identity, search],
    () => searchImages(scope!, secret, search),
    { enabled: enabled && Boolean(search), retry: false },
  );
  const tags = useQuery<{ tags: string[]; total: number }, ImageLookupError>(
    ['workload-image-tags', ...identity, repository, page, insecure],
    () => fetchImageTags(scope!, secret, repository, page, insecure),
    { enabled: enabled && sameImage, retry: false },
  );
  const detail = useQuery<Awaited<ReturnType<typeof fetchImageDetail>>, ImageLookupError>(
    ['workload-image-detail', ...identity, inspectedImage, insecure],
    () => fetchImageDetail(scope!, secret, inspectedImage, insecure),
    { enabled: enabled && sameImage, retry: false },
  );
  const inspect = (image: string) => {
    setInspectedImage(image);
    setPage(1);
    setInsecure(false);
  };
  const chooseImage = (image: string) => {
    onChange(image);
    inspect(image);
    setSearch('');
  };
  const lookupError = sameImage && (detail.error || tags.error);
  const currentDetail = sameImage && detail.data;
  const currentTags = sameImage ? tags.data?.tags || [] : [];
  const runSearch = () => {
    const next = keyword.trim();
    if (!next) return;
    if (search === next) images.refetch();
    else setSearch(next);
  };
  return (
    <div style={{ display: 'grid', gap: 8, minWidth: 0 }}>
      <label>
        <span>{t('CONTAINER_IMAGE')}</span>
        <Input
          style={{ width: '100%', maxWidth: 'none' }}
          aria-label={t('CONTAINER_IMAGE')}
          value={value}
          placeholder="nginx:alpine"
          onChange={event => onChange(event.target.value)}
          onBlur={() => inspect(value)}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.preventDefault();
              inspect(value);
            }
          }}
        />
      </label>
      {enabled && (
        <>
          <div style={{ display: 'flex', gap: 8, alignItems: 'end' }}>
            <label style={{ flex: 1, minWidth: 0 }}>
              <span>{t('WORKLOAD_IMAGE_SEARCH')}</span>
              <Input
                style={{ width: '100%' }}
                aria-label={t('WORKLOAD_IMAGE_SEARCH')}
                value={keyword}
                onChange={event => setKeyword(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    runSearch();
                  }
                }}
              />
            </label>
            <Button
              aria-label={t('WORKLOAD_IMAGE_SEARCH_SUBMIT')}
              disabled={!keyword.trim() || images.isFetching}
              onClick={runSearch}
            >
              {t('SEARCH')}
            </Button>
          </div>
          {secret && <p>{registry.data || secret}</p>}
          {registry.error && <p role="alert">{t('WORKLOAD_IMAGE_REGISTRY_FAILED')}</p>}
          {images.isFetching && <p role="status">{t('LOADING')}</p>}
          {search && images.error && <p role="alert">{t('WORKLOAD_IMAGE_SEARCH_FAILED')}</p>}
          {search && !images.isFetching && images.data?.length === 0 && (
            <p role="status">{t('NO_IMAGE_FOUND')}</p>
          )}
          {search && Boolean(images.data?.length) && (
            <ul
              aria-label={t('WORKLOAD_IMAGE_RESULTS')}
              style={{ maxHeight: 240, overflowY: 'auto', paddingLeft: 20 }}
            >
              {images.data?.map(image => (
                <li key={image}>
                  <Button
                    aria-label={image}
                    disabled={Boolean(secret && !registry.data)}
                    onClick={() => chooseImage(registryImage(registry.data || '', image))}
                  >
                    {image}
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {sameImage && (tags.isFetching || detail.isFetching) && (
            <p role="status">{t('LOADING')}</p>
          )}
          {lookupError && (
            <div role="alert">
              <p>{t(lookupError.certificate ? 'CERT_ERROR' : 'WORKLOAD_IMAGE_LOOKUP_FAILED')}</p>
              <Button
                aria-label={t('WORKLOAD_IMAGE_RETRY')}
                disabled={detail.isFetching || tags.isFetching}
                onClick={() => {
                  detail.refetch();
                  tags.refetch();
                }}
              >
                {t('RETRY')}
              </Button>
              {lookupError.certificate && !insecure && (
                <>
                  <p>{t('IGNORE_CERT_WARN_DESC')}</p>
                  <Button aria-label={t('IGNORE_AND_RETRY')} onClick={() => setInsecure(true)}>
                    {t('IGNORE_AND_RETRY')}
                  </Button>
                </>
              )}
            </div>
          )}
          {(currentTags.length > 0 || (sameImage && page > 1)) && (
            <div>
              <label>
                <span>{t('IMAGE_TAG')}</span>
                <Select
                  style={{ width: '100%' }}
                  aria-label={t('IMAGE_TAG')}
                  value={tag}
                  options={Array.from(new Set([tag, ...currentTags].filter(Boolean))).map(item => ({
                    label: item,
                    value: item,
                  }))}
                  onChange={next => {
                    const image = `${repository}:${next}`;
                    onChange(image);
                    setInspectedImage(image);
                  }}
                />
              </label>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <Button
                  aria-label={t('WORKLOAD_IMAGE_TAG_PREVIOUS')}
                  disabled={page <= 1 || tags.isFetching}
                  onClick={() => setPage(page - 1)}
                >
                  {t('WORKLOAD_IMAGE_TAG_PREVIOUS')}
                </Button>
                <span>{page}</span>
                <Button
                  aria-label={t('WORKLOAD_IMAGE_TAG_NEXT')}
                  disabled={page * 10 >= (tags.data?.total || 0) || tags.isFetching}
                  onClick={() => setPage(page + 1)}
                >
                  {t('WORKLOAD_IMAGE_TAG_NEXT')}
                </Button>
              </div>
            </div>
          )}
          {currentDetail && (
            <dl style={{ overflowWrap: 'anywhere' }}>
              <dt>{t('CREATION_TIME')}</dt>
              <dd>{currentDetail.created || '-'}</dd>
              <dt>{t('REGISTRY')}</dt>
              <dd>{currentDetail.registry || '-'}</dd>
              <dt>{t('PORT')}</dt>
              <dd>{currentDetail.ports.join('; ') || t('NO_DEFAULT_PORT')}</dd>
              <dt>{t('WORKLOAD_IMAGE_SIZE')}</dt>
              <dd>{currentDetail.size}</dd>
              <dt>{t('WORKLOAD_IMAGE_LAYERS')}</dt>
              <dd>{currentDetail.layers}</dd>
            </dl>
          )}
        </>
      )}
    </div>
  );
}
