export type ConfigReferenceKind = 'configMap' | 'secret';

export interface EnvFromReference {
  kind: ConfigReferenceKind;
  name: string;
  prefix?: string;
}

export interface ReloaderPolicy {
  enabled: boolean;
}

export interface ConfigReferenceWorkload {
  kind: 'Deployment' | 'StatefulSet' | 'DaemonSet';
  metadata?: {
    annotations?: Record<string, string>;
  };
  spec?: {
    template?: {
      spec?: {
        containers?: Array<{
          name?: string;
          envFrom?: unknown[];
        }>;
      };
    };
  };
}

export interface ConfigReferenceResource {
  metadata?: { uid?: string; resourceVersion?: string; annotations?: Record<string, string> };
  spec?: Record<string, any>;
}

export interface ConfigReferenceSubmission {
  resource: ConfigReferenceResource;
  patch: Array<{ op: string; path: string; value?: unknown }>;
}

export type ConfigReferenceSaveResult =
  | { outcome: 'saved'; status: number; resource: ConfigReferenceResource }
  | { outcome: 'rejected'; status: number }
  | { outcome: 'unknown' };
