import type {
  ConfigReferenceSubmission,
  ConfigReferenceSaveResult,
} from '../pages/projects/components/ConfigReference/types';

export interface EnhancementMount {
  sessionId: number;
  globals: typeof globals;
  resource: { workspace: string; cluster: string; namespace: string; name: string };
  onClose: () => void;
  onWriteStart: (submission: ConfigReferenceSubmission) => boolean;
  onWriteResult: (result: ConfigReferenceSaveResult) => void;
}

export interface EnhancementModule {
  version: 1;
  mount: (context: EnhancementMount) => void;
  unmount: () => void;
}

export interface EnhancementHost {
  moduleReady: (frame: Window, module: EnhancementModule) => boolean;
  unauthorized: () => void;
  handleFrameKeydown: (frame: Window, event: KeyboardEvent) => void;
}
