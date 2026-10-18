import { AppDetail } from '@ks-console/shared';

const DESCRIPTION_ANNOTATION = 'kubesphere.io/description';
const DISPLAY_NAME_ANNOTATION = 'kubesphere.io/alias-name';
const CATEGORY_LABEL = 'application.kubesphere.io/app-category-name';
const WORKSPACE_LABEL = 'kubesphere.io/workspace';

export type AppEditFormValues = {
  name: string;
  description: string;
  abstraction: string;
  home: string;
  icon: string;
  category_id: string;
  workspace: string;
};

export type AppPatchData = {
  aliasName: string;
  description: string;
  abstraction: string;
  appHome: string;
  icon: string;
  categoryName: string;
  attachments: string[];
};

export function getAppEditInitialValues(detail: AppDetail): AppEditFormValues {
  const { annotations = {}, labels = {} } = detail.metadata;

  return {
    name: annotations[DISPLAY_NAME_ANNOTATION] || detail.metadata.name,
    description: annotations[DESCRIPTION_ANNOTATION] || '',
    abstraction: detail.spec.abstraction || '',
    home: detail.spec.appHome || '',
    icon: detail.spec.icon || '',
    category_id: labels[CATEGORY_LABEL] || '',
    workspace: detail.workspace || labels[WORKSPACE_LABEL] || '',
  };
}

export function toAppPatchData(
  values: Partial<AppEditFormValues>,
  detail: AppDetail,
): AppPatchData {
  const initialValues = getAppEditInitialValues(detail);

  return {
    aliasName: values.name ?? initialValues.name,
    description: values.description ?? initialValues.description,
    abstraction: values.abstraction ?? initialValues.abstraction,
    appHome: values.home ?? initialValues.home,
    icon: values.icon ?? initialValues.icon,
    categoryName: values.category_id ?? initialValues.category_id,
    attachments: detail.spec.attachments || [],
  };
}
