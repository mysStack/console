export type EnvFromReferenceType = 'configMap' | 'secret';

export interface EnvFromReference {
  type: EnvFromReferenceType;
  name: string;
  prefix: string;
}

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
