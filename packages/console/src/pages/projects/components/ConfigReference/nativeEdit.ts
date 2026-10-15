import { get, isEmpty, unset } from 'lodash';

import { mergeConfigReferenceDrafts } from './draft';
import type { ConfigReferenceDraftChange } from './draft';

interface NativeEditor {
  props: {
    store: { update: (detail: Record<string, any>, template: Record<string, any>) => Promise<any> };
    onCancel: () => void;
  };
}

interface Options {
  detail: Record<string, any>;
  getChanges: () => ConfigReferenceDraftChange[];
  onSaved: () => void;
  onCancelled: () => void;
  onError: (error: unknown) => void;
}

export function createConfigReferenceNativeCallbacks(options: Options) {
  let editor: NativeEditor | null = null;
  let status: 'editing' | 'saved' | 'cancelled' = 'editing';
  let submitting = false;
  let dismissed = false;
  return {
    // Only public modal props; do not inspect React state or replace store methods.
    ref: (instance: NativeEditor | null) => {
      editor = instance;
    },
    onCancel: () => {
      if (status !== 'editing') return;
      dismissed = true;
      // An issued request cannot be cancelled by closing the modal. Report its
      // actual outcome once, and do not close the already-unmounted modal again.
      if (submitting) return;
      status = 'cancelled';
      options.onCancelled();
    },
    onOk: async (template: Record<string, any>) => {
      if (status !== 'editing' || submitting) return;
      const props = editor?.props;
      submitting = true;
      try {
        if (!props?.store?.update || !props.onCancel) {
          throw new Error('The native editor submission interface is unavailable');
        }
        const data = mergeConfigReferenceDrafts(template, options.getChanges());
        // Keep the original workload.template.edit action's pre-submit cleanup.
        if (!isEmpty(get(data, 'spec.template.spec.customMode', {}))) {
          unset(data, 'spec.template.spec.customMode');
        }
        await props.store.update(options.detail, data);
      } catch (error) {
        if (dismissed) {
          status = 'cancelled';
          options.onCancelled();
        }
        options.onError(error);
        return;
      } finally {
        submitting = false;
      }
      status = 'saved';
      if (!dismissed) props!.onCancel();
      options.onSaved();
    },
  };
}
