import React, { useState } from 'react';
import type { ReactNode, HTMLAttributes } from 'react';
import { ChevronLeft, ChevronRight } from '@kubed/icons';

export function WizTelemetry() {
  return <img src="/assets/observability.svg" width={40} height={40} alt="" />;
}

export function CollapsedBtn({
  collapsed,
  onClickCollapsed,
}: {
  collapsed?: boolean;
  onClickCollapsed: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      aria-label={t(collapsed ? 'EXPAND' : 'COLLAPSE')}
      aria-expanded={!collapsed}
      onClick={() => onClickCollapsed(!collapsed)}
      style={{ border: 0, background: 'transparent', cursor: 'pointer', padding: 8 }}
    >
      {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
    </button>
  );
}

interface CollapseContainerProps extends Omit<HTMLAttributes<HTMLDetailsElement>, 'title'> {
  title?: ReactNode;
  defaultOpen?: boolean;
}

export function CollapseContainer({
  title,
  defaultOpen = false,
  children,
  style,
  ...props
}: CollapseContainerProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details
      {...props}
      open={open}
      onToggle={event => setOpen((event.currentTarget as HTMLDetailsElement).open)}
      style={{ background: '#fff', borderRadius: 4, padding: 12, marginBottom: 12, ...style }}
    >
      <summary style={{ cursor: 'pointer', fontWeight: 600, paddingBottom: open ? 12 : 0 }}>
        {title}
      </summary>
      {children}
    </details>
  );
}
