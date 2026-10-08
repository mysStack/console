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
