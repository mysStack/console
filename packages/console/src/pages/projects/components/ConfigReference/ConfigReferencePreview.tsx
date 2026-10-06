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
  /** Undefined while no resource is selected, or while its keys are loading. */
  preview?: ReferencePreview;
  /** Hard error (duplicate reference / resource gone). Replaces the preview. */
  error?: string;
}

const chipStyleFor = (entry: PreviewEntry, preview: ReferencePreview) => {
  if (entry.status === 'skipped') return previewChipBadStyle;
  if (entry.status === 'binary') return previewChipBinaryStyle;
  if (preview.shadowedByEnv.includes(entry.name) || preview.duplicated.includes(entry.name)) {
    return previewChipConflictStyle;
  }
  return previewChipStyle;
};

/**
 * Explains what a single ConfigMap/Secret reference will actually put into the
 * container, and — more importantly — what it will NOT: kubelet drops keys
 * whose name is invalid without emitting any event (kubernetes#130099), and
 * envFrom never reads binaryData at all.
 *
 * Collapsed to one line while everything is fine; auto-expanded as soon as
 * something would silently not take effect.
 */
export default function ConfigReferencePreview({ kind, preview, error }: Props) {
  const [override, setOverride] = useState<boolean | null>(null);

  if (error) {
    return (
      <div style={previewStyle}>
        <span role="alert" style={previewWarnStyle}>
          {error}
        </span>
      </div>
    );
  }

  if (kind === 'secret' && !PREVIEW_SECRET_KEYS) {
    return <div style={previewStyle}>{t('CONFIG_REFERENCE_PREVIEW_SECRET')}</div>;
  }

  if (!preview || !preview.resolved) {
    return null;
  }

  const conflicts = Array.from(new Set([...preview.shadowedByEnv, ...preview.duplicated]));
  const warnings = [
    preview.skipped.length
      ? t('CONFIG_REFERENCE_PREVIEW_SKIPPED', { count: preview.skipped.length })
      : '',
    preview.ignoredBinary.length
      ? t('CONFIG_REFERENCE_PREVIEW_BINARY', { count: preview.ignoredBinary.length })
      : '',
    conflicts.length ? t('CONFIG_REFERENCE_PREVIEW_CONFLICT', { count: conflicts.length }) : '',
  ].filter(Boolean);

  const hasProblems = warnings.length > 0;
  const expanded = override === null ? hasProblems : override;

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
        <span
          role="button"
          tabIndex={0}
          style={previewLinkStyle}
          onClick={() => setOverride(!expanded)}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') setOverride(!expanded);
          }}
        >
          {expanded ? t('CONFIG_REFERENCE_PREVIEW_HIDE') : t('CONFIG_REFERENCE_PREVIEW_SHOW')}
        </span>
      </div>
      {expanded && (
        <div style={previewChipsStyle}>
          {preview.entries.map((entry, index) => (
            <span
              key={`${entry.key}-${index}`}
              style={chipStyleFor(entry, preview)}
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
