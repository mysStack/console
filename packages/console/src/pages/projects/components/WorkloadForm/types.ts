export type EnvFromReferenceType = 'configMap' | 'secret';

export interface EnvFromReference {
  type: EnvFromReferenceType;
  name: string;
  prefix: string;
}

export interface EnvFromSource {
  configMapRef?: { name?: string };
  secretRef?: { name?: string };
  prefix?: string;
}

export interface DuplicateEnvFrom {
  index: number;
  name: string;
  type: EnvFromReferenceType;
}
