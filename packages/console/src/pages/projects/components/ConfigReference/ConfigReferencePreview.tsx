import React, { useState } from 'react';

import { PREVIEW_SECRET_KEYS } from './preview';
import type { ConfigReferenceKind } from './types';
import type { PreviewEntry, ReferencePreview } from './preview';
import {
  previewChipBadStyle,
  previewChipBinaryStyle,
  previewChipConflictStyle,
  previewChipStyle,
  previewChipsStyle,
  previewLinkStyle,
  previewOkStyle,
  previewStyle,
  previewSummaryStyle,
  previewWarnStyle,
} from './styles';

interface Props {
  kind: ConfigReferenceKind;
  /**
   * Identity of everything this preview depends on (kind / resource / prefix).
   * A change resets the manual expand override, so a row that develops a problem
   * auto-expands again instead of staying silently collapsed.
   */
  identity: string;
  /** Undefined while no resource is selected, or while its keys are loading. */
  preview?: ReferencePreview;
  /** Hard error (duplicate reference / resource gone). Replaces the preview. */
  error?: string;
}

const chipStyleFor = (entry: PreviewEntry, conflicted: Set<string>) => {
  if (entry.status === 'skipped') return previewChipBadStyle;
  if (entry.status === 'binary') return previewChipBinaryStyle;
  return conflicted.has(entry.name) ? previewChipConflictStyle : previewChipStyle;
};

/**
 * Explains what a single ConfigMap/Secret reference will actually put into the
 * container, and — more importantly — what it will NOT: kubelet drops keys whose
 * name is invalid without emitting any event (kubernetes#130099), and envFrom
 * never reads binaryData at all.
 *
 * Collapsed to one line while everything is fine; auto-expanded as soon as
 * something would silently not take effect.
 */
export default function ConfigReferencePreview({ kind, identity, preview, error }: Props) {
  const signature = [
    identity,
    error || '',
    preview
      ? [
          preview.resolved,
          preview.entries.length,
          preview.skipped.length,
          preview.ignoredBinary.length,
          preview.shadowedByEnv.length,
          preview.duplicated.length,
          preview.invalidPrefix,
        ].join(',')
      : 'none',
  ].join('|');

  const [state, setState] = useState<{ signature: string; override: boolean | null }>({
    signature,
    override: null,
  });

  // Reset the manual expand/collapse choice whenever the content changes. Done
  // during render (the supported "adjust state on prop change" pattern) so the
  // value below is correct on this very render.
  if (state.signature !== signature) {
    setState({ signature, override: null });
  }
  const override = state.signature === signature ? state.override : null;
  const setOverride = (value: boolean) => setState({ signature, override: value });

  if (error) {
    return (
      <div style={previewStyle}>
        <span role="alert" style={previewWarnStyle}>
          {error}
        </span>
      </div>
    );
  }

  // Must come BEFORE the Secret shortcut: a Secret row with no resource selected
  // (or whose keys could not be read) has nothing to preview.
  if (!preview || !preview.resolved) {
    return null;
  }

  if (preview.invalidPrefix) {
    return (
      <div style={previewStyle}>
        <span role="alert" style={previewWarnStyle}>
          {t('CONFIG_REFERENCE_PREVIEW_BAD_PREFIX')}
        </span>
      </div>
    );
  }

  if (kind === 'secret' && !PREVIEW_SECRET_KEYS) {
    return <div style={previewStyle}>{t('CONFIG_REFERENCE_PREVIEW_SECRET')}</div>;
  }

  // Names can be shadowed by a manual environment variable, or produced by
  // another reference row. They are different problems and are reported apart.
  const shadowed = preview.shadowedByEnv;
  const crossReferenced = preview.duplicated.filter(name => !shadowed.includes(name));

  const warnings = [
    preview.skipped.length
      ? t('CONFIG_REFERENCE_PREVIEW_SKIPPED', { count: preview.skipped.length })
      : '',
    preview.ignoredBinary.length
      ? t('CONFIG_REFERENCE_PREVIEW_BINARY', { count: preview.ignoredBinary.length })
      : '',
    shadowed.length ? t('CONFIG_REFERENCE_PREVIEW_CONFLICT', { count: shadowed.length }) : '',
    crossReferenced.length
      ? t('CONFIG_REFERENCE_PREVIEW_DUPLICATED', { count: crossReferenced.length })
      : '',
  ].filter(Boolean);

  // Built once instead of scanning both arrays for every chip.
  const conflicted = new Set([...preview.shadowedByEnv, ...preview.duplicated]);

  const hasProblems = warnings.length > 0;
  const expanded = override === null ? hasProblems : override;
  // Nothing to reveal when the resource contributes no key at all.
  const canExpand = preview.entries.length > 0;

  return (
    <div style={previewStyle}>
      <div style={previewSummaryStyle}>
        {preview.names.length > 0 ? (
          <span style={previewOkStyle}>
            {t('CONFIG_REFERENCE_PREVIEW_OK', { count: preview.names.length })}
          </span>
        ) : (
          <span style={previewWarnStyle}>{t('CONFIG_REFERENCE_PREVIEW_EMPTY')}</span>
        )}
        {warnings.map(text => (
          <span key={text} style={previewWarnStyle}>
            {' · '}
            {text}
          </span>
        ))}
        {canExpand && (
          <span
            role="button"
            tabIndex={0}
            aria-expanded={expanded}
            style={previewLinkStyle}
            onClick={() => setOverride(!expanded)}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') setOverride(!expanded);
            }}
          >
            {expanded ? t('CONFIG_REFERENCE_PREVIEW_HIDE') : t('CONFIG_REFERENCE_PREVIEW_SHOW')}
          </span>
        )}
      </div>
      {expanded && canExpand && (
        <div style={previewChipsStyle}>
          {preview.entries.map((entry, index) => (
            <span
              key={`${entry.key}-${index}`}
              style={chipStyleFor(entry, conflicted)}
              title={
                entry.status === 'skipped' ? t('CONFIG_REFERENCE_PREVIEW_SKIPPED_TIP') : undefined
              }
            >
              {entry.status === 'binary' ? entry.key : entry.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
