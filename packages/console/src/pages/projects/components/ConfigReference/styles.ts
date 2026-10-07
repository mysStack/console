import type { CSSProperties } from 'react';

/**
 * Shared visual tokens for the Configuration Reference feature.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * This feature renders *beside* the embedded V3 container form. The V3 console is
 * distributed as a prebuilt artifact, so the extension cannot import its
 * stylesheet or its CSS-module class names. Some values below are therefore
 * measured from the V3 build rather than derived from a shared theme.
 *
 * POLICY — keep it that way, but keep it HERE:
 *   1. Every colour / size used by the feature must be declared in this file.
 *   2. Never hardcode a literal in a component again. If a new value is needed,
 *      add a token here first, so the next V3 change is a one-file edit.
 *   3. When V3's look changes, update the values below — nowhere else.
 */

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------

/**
 * Raw palette, extracted verbatim from the values already in use.
 *
 * NOTE: `textMuted` (#7b8ba4) and `textMutedAlt` (#79879c) are two different
 * greys for the same semantic role — one came from the inline panel, the other
 * from the standalone page. They are intentionally kept as separate tokens so
 * this refactor changes nothing visually. Unifying them is a design decision.
 */
export const colors = {
  rowBackground: '#eff4f9',
  rowBorder: '#c8d3e1',
  rowBorderAlt: '#d8dee9',
  divider: '#cad5e3',
  dividerAlt: '#e5e9f2',

  controlBackground: '#fff',
  controlBorder: '#b8c4d4',
  buttonBorder: '#ccd3db',

  text: '#27364b',
  textStrong: '#36435c',
  textSubtle: '#53657d',
  textMuted: '#7b8ba4',
  textMutedAlt: '#79879c',

  danger: '#d03050',
  dangerBorder: '#e8a3b2',
  dangerSurface: '#fdf1f4',
  mutedSurface: '#f7f9fb',
  mutedText: '#9aa7b8',
  link: '#3182ce',

  primaryBackground: '#242e42',
  primaryBorder: '#242e42',

  switchOnBackground: '#4bbf91',
  switchOnText: '#fff',
  switchOffBackground: '#c5ced8',
  switchOffText: '#41546d',

  white: '#fff',
} as const;

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

/**
 * Sizes measured from the live V3 container form (KubeSphere console 4.1.1).
 * The inline row deliberately mirrors the native environment-variable row so the
 * two sections read as one list.
 */
export const geometry = {
  /** Native V3 env row: 831px wide, 46px tall, 32px controls, 58px delete action. */
  rowMinHeight: 46,
  rowRadius: 100,

  controlHeight: 32,
  controlRadius: 4,

  buttonMinHeight: 32,
  buttonRadius: 100,

  iconButtonSize: 32,

  switchMinWidth: 112,
  switchHeight: 32,
  switchRadius: 16,
  knobSize: 18,

  /** Width of the leading "kind" select in a reference row. */
  kindColumnWidth: 130,
  /** Width of the trailing delete action. */
  actionColumnWidth: 58,

  summaryRowMinHeight: 40,
  summaryKindColumnWidth: 130,
  summaryPrefixColumnWidth: 120,
} as const;

// ---------------------------------------------------------------------------
// Column templates
// ---------------------------------------------------------------------------

/**
 * Column templates for the three surfaces that render `{kind, name, prefix}`.
 *
 * They are DIFFERENT today, on purpose: this refactor only centralises them so
 * the divergence is visible and the fix becomes a one-line change. Aligning them
 * alters the visual result of at least one surface, so it is a separate task.
 */
const { kindColumnWidth, actionColumnWidth } = geometry;
const { summaryKindColumnWidth: kindW, summaryPrefixColumnWidth: prefixW } = geometry;

export const columns = {
  /** Inline editor inside the V3 container dialog. Mirrors the V3 env row. */
  inline: `${kindColumnWidth}px minmax(180px, 1fr) minmax(130px, 1fr) ${actionColumnWidth}px`,
  /** Standalone page (legacy route). */
  panel: `minmax(${kindColumnWidth}px, 0.8fr) minmax(180px, 1.5fr) minmax(140px, 1fr) auto`,
  /** Read-only summary shown under the environment variables section. */
  summary: `${kindW}px minmax(0, 1fr) minmax(${prefixW}px, 0.6fr)`,
} as const;

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

export const controlStyle: CSSProperties = {
  boxSizing: 'border-box',
  minHeight: geometry.controlHeight,
  width: '100%',
  padding: '6px 10px',
  border: `1px solid ${colors.controlBorder}`,
  borderRadius: geometry.controlRadius,
  background: colors.controlBackground,
  color: colors.text,
  fontFamily: 'inherit',
  fontSize: 12,
  fontWeight: 600,
};

export const nativeSelectWrapperStyle: CSSProperties = {
  position: 'relative',
  width: '100%',
  minWidth: 0,
};

export const nativeSelectStyle: CSSProperties = {
  ...controlStyle,
  appearance: 'none',
  paddingRight: 28,
  cursor: 'pointer',
};

export const nativeSelectArrowStyle: CSSProperties = {
  position: 'absolute',
  top: '50%',
  right: 10,
  transform: 'translateY(-50%)',
  pointerEvents: 'none',
  color: colors.textSubtle,
  fontSize: 15,
  lineHeight: 1,
};

/** Neutral (secondary) button. */
export const buttonStyle: CSSProperties = {
  minHeight: geometry.buttonMinHeight,
  padding: '0 14px',
  border: `1px solid ${colors.buttonBorder}`,
  borderRadius: geometry.buttonRadius,
  background: colors.rowBackground,
  color: colors.textStrong,
  fontFamily: 'inherit',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
};

/** Primary button. Replaces the old `{...buttonStyle, background:'#242e42'}` overrides. */
export const primaryButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: colors.primaryBackground,
  borderColor: colors.primaryBorder,
  color: colors.white,
};

export const iconButtonStyle: CSSProperties = {
  width: geometry.iconButtonSize,
  height: geometry.iconButtonSize,
  border: `1px solid ${colors.buttonBorder}`,
  borderRadius: geometry.buttonRadius,
  background: colors.rowBackground,
  color: colors.textSubtle,
  fontFamily: 'inherit',
  fontSize: 20,
  lineHeight: 1,
  cursor: 'pointer',
};

export const linkButtonStyle: CSSProperties = {
  border: 0,
  padding: 0,
  background: 'transparent',
  color: colors.link,
  cursor: 'pointer',
};

// ---------------------------------------------------------------------------
// Inline editor (ConfigReferenceInline)
// ---------------------------------------------------------------------------

export const sectionStyle: CSSProperties = {
  marginTop: 12,
  padding: '0 0 10px',
  background: 'transparent',
  color: colors.text,
  textAlign: 'left',
};

export const referenceToolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  marginBottom: 10,
};

export const referenceToolbarHintStyle: CSSProperties = {
  color: colors.textMuted,
  fontSize: 13,
  lineHeight: 1.4,
};

export const referenceToolbarActionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

/** One reference row. Mirrors the V3 environment-variable row. */
export const referenceRowStyle: CSSProperties = {
  boxSizing: 'border-box',
  display: 'grid',
  gridTemplateColumns: columns.inline,
  gap: 8,
  alignItems: 'center',
  padding: '6px 10px',
  minHeight: geometry.rowMinHeight,
  border: `1px solid ${colors.rowBorder}`,
  borderRadius: geometry.rowRadius,
  background: colors.rowBackground,
};

export const messageStyle: CSSProperties = {
  padding: '16px 0 2px',
  color: colors.textMuted,
  fontSize: 13,
};

export const footerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 10,
  marginTop: 12,
  paddingTop: 10,
  borderTop: `1px solid ${colors.divider}`,
};

export const autoReloadStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  marginTop: 18,
  paddingTop: 14,
  borderTop: `1px solid ${colors.divider}`,
};

export const reloaderSwitchStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  minWidth: geometry.switchMinWidth,
  height: geometry.switchHeight,
  padding: '0 8px 0 12px',
  border: 0,
  borderRadius: geometry.switchRadius,
  background: colors.switchOffBackground,
  color: colors.switchOffText,
  fontFamily: 'inherit',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
};

export const reloaderSwitchEnabledStyle: CSSProperties = {
  background: colors.switchOnBackground,
  color: colors.switchOnText,
};

export const reloaderKnobStyle: CSSProperties = {
  width: geometry.knobSize,
  height: geometry.knobSize,
  borderRadius: '50%',
  background: colors.white,
  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.12)',
};

export const reloaderKnobEnabledStyle: CSSProperties = {
  background: colors.white,
};

// ---------------------------------------------------------------------------
// Read-only summary (ConfigReferenceSummary)
// ---------------------------------------------------------------------------

export const summaryStyle: CSSProperties = {
  display: 'grid',
  gap: 8,
  marginTop: 12,
};

export const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: columns.summary,
  gap: 8,
  alignItems: 'center',
  minHeight: geometry.summaryRowMinHeight,
  padding: '0 12px',
  border: `1px solid ${colors.rowBorder}`,
  borderRadius: geometry.rowRadius,
  background: colors.rowBackground,
  color: colors.textStrong,
  fontSize: 12,
  fontWeight: 600,
  textAlign: 'left',
};

export const kindStyle: CSSProperties = { color: colors.textSubtle, textAlign: 'left' };

export const nameStyle: CSSProperties = {
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  textAlign: 'left',
};

export const prefixStyle: CSSProperties = { color: colors.textMuted, textAlign: 'left' };

// ---------------------------------------------------------------------------
// Reference preview (ConfigReferencePreview)
// ---------------------------------------------------------------------------

/**
 * Sits BELOW the pill row, never inside it: the row has a 100px corner radius,
 * so any multi-line content inside it makes the controls look off-centre.
 */
export const previewStyle: CSSProperties = {
  margin: '6px 0 0 14px',
  color: colors.textMuted,
  fontSize: 12,
  lineHeight: 1.7,
};

export const previewSummaryStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
};

export const previewOkStyle: CSSProperties = {
  color: colors.switchOnBackground,
  fontWeight: 600,
};

export const previewWarnStyle: CSSProperties = {
  color: colors.danger,
  fontWeight: 600,
};

export const previewLinkStyle: CSSProperties = {
  color: colors.link,
  cursor: 'pointer',
  marginLeft: 6,
};

export const previewChipsStyle: CSSProperties = { marginTop: 5 };

export const previewChipStyle: CSSProperties = {
  display: 'inline-block',
  border: `1px solid ${colors.rowBorder}`,
  borderRadius: 100,
  background: colors.white,
  padding: '1px 9px',
  margin: '2px 4px 2px 0',
  fontSize: 11,
  fontWeight: 600,
  color: colors.textStrong,
};

/** Kubelet drops these silently. */
export const previewChipBadStyle: CSSProperties = {
  ...previewChipStyle,
  borderColor: colors.dangerBorder,
  background: colors.dangerSurface,
  color: colors.danger,
  textDecoration: 'line-through',
};

/** binaryData: envFrom never reads it. */
export const previewChipBinaryStyle: CSSProperties = {
  ...previewChipStyle,
  borderColor: colors.dividerAlt,
  background: colors.mutedSurface,
  color: colors.mutedText,
};

/** Provided twice, or already taken by a manual environment variable. */
export const previewChipConflictStyle: CSSProperties = {
  ...previewChipStyle,
  borderColor: colors.dangerBorder,
  color: colors.danger,
};

/** Expanded value list, used where the values themselves are what matters. */
export const previewValuesStyle: CSSProperties = {
  display: 'grid',
  gap: 4,
  marginTop: 6,
  marginLeft: 2,
};

export const previewValueRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(120px, 240px) minmax(0, 1fr)',
  gap: 12,
  alignItems: 'baseline',
  fontSize: 12,
};

export const previewValueNameStyle: CSSProperties = {
  color: colors.textStrong,
  fontWeight: 600,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  textAlign: 'left',
};

export const previewValueTextStyle: CSSProperties = {
  color: colors.textSubtle,
  wordBreak: 'break-all',
  textAlign: 'left',
};

export const previewValueMaskedStyle: CSSProperties = {
  color: colors.mutedText,
  letterSpacing: 1,
  textAlign: 'left',
};

export const previewValueDroppedStyle: CSSProperties = {
  color: colors.danger,
  textAlign: 'left',
};

export const previewValueEmptyStyle: CSSProperties = {
  color: colors.mutedText,
  textAlign: 'left',
};

export const summaryHeaderToggleStyle: CSSProperties = {
  color: colors.link,
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  border: '1px solid #cfe0f3',
  borderRadius: 12,
  padding: '1px 12px',
  background: '#f2f8ff',
  whiteSpace: 'nowrap',
};

// File mounts: a per-row validation message and an informational key-count note.
export const previewProblemStyle: React.CSSProperties = {
  color: colors.danger,
  fontSize: 12,
  lineHeight: '20px',
  marginTop: 4,
};

export const previewNoteStyle: React.CSSProperties = {
  color: colors.textSubtle,
  fontSize: 12,
  lineHeight: '20px',
  marginTop: 4,
};
