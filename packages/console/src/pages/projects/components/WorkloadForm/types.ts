export type EnvFromReferenceType = 'configMap' | 'secret';

export interface EnvFromReference {
  type: EnvFromReferenceType;
  name: string;
  prefix: string;
}

export type WorkloadKind = 'deployments' | 'statefulsets' | 'daemonsets';

export interface WorkloadFormValues {
  name: string;
  image: string;
  env: Array<Record<string, unknown>>;
  envFrom: EnvFromReference[];
  containerName?: string;
  containerPort?: number;
  clearContainerPort?: boolean;
  serviceName?: string;
  resourceVersion?: string;
  resource?: WorkloadResource;
}

export type WorkloadResource = {
  metadata?: Record<string, any> & { name?: string; resourceVersion?: string };
  spec?: {
    [key: string]: any;
    serviceName?: string;
    template?: {
      [key: string]: any;
      metadata?: Record<string, any>;
      spec?: { containers?: Array<Record<string, any>> };
    };
  };
};

interface EnvFromSourceBase {
  prefix?: string;
}

export type EnvFromSource =
  | (EnvFromSourceBase & { configMapRef: { name?: string }; secretRef?: never })
  | (EnvFromSourceBase & { secretRef: { name?: string }; configMapRef?: never })
  | (EnvFromSourceBase & { configMapRef?: never; secretRef?: never });

export interface DuplicateEnvFrom {
  index: number;
  name: string;
  type: EnvFromReferenceType;
}
