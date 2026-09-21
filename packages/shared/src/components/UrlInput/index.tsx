/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React, { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { isEmpty } from 'lodash';
import { useParams } from 'react-router-dom';
import { Button, Input, Loading, Select, Tooltip } from '@kubed/components';
import { openpitrixStore } from '../../stores';
import Icon from '../Icon';
import { InputWrapper, UrlItem, Help, Label, Horizon, AccessItem, ErrorLi } from './styles';

export function checkRepoInvalidReason(errCode: number): string {
  const errReason: Record<number, string> = {
    // 901: '', // ErrNotExpect
    // 101: '', // ErrVisibility
    102: 'UNRECOGNIZED_URL', // ErrNotUrl
    103: 'INVALID_CREDENTIAL_FORMAT', // ErrCredentialNotJson
    104: 'MISSING_ACCESS_KEY_ID', // ErrNoAccessKeyId
    105: 'MISSING_SECRET_ACCESS_KEY', // ErrNoSecretAccessKey
    106: 'S_THREE_ACCESS_DENIED', // ErrS3AccessDeny
    107: 'INVALID_URL_FORMAT', // ErrUrlFormat
    108: 'INVALID_HTTP_SCHEME', // ErrSchemeNotHttp
    109: 'HTTP_ACCESS_DENIED', // ErrHttpAccessDeny
    110: 'INVALID_HTTPS_SCHEME', // ErrSchemeNotHttps
    111: 'INVALID_TYPE', // ErrType
    112: 'INVALID_PROVIDERS', // ErrProviders
    113: 'INVALID_REPO_URL', // ErrNotRepoUrl
    114: 'INVALID_S_THREE_SCHEME', // ErrSchemeNotS3
    // 115: 'Bad Index YAML', // ErrBadIndexYaml
  };

  return t(errReason[errCode] || 'INVALID_URL_DESC');
}

const { validateRepoUrl } = openpitrixStore;

type Props = {
  formData: any;
  urlFormData: any;
  onChange?: (urlInput: string) => void;
  onValidate?: (isValid: boolean) => void;
  validationKey?: string;
  isSubmitting?: boolean;
};

function UrlInput({
  formData,
  urlFormData,
  onChange,
  onValidate,
  validationKey,
  isSubmitting,
}: Props): JSX.Element {
  const { workspace = '' } = useParams();
  const protocolReg = /^(http|https|s3|oci):\/\//;
  const protocols = [
    { label: 'http://', value: 'http' },
    { label: 'https://', value: 'https' },
    { label: 'oci://', value: 'oci' },
    // { label: 's3://', value: 's3' },
  ];
  const initUrlInputValue = useMemo(() => {
    if (urlFormData.url) {
      const reg = new RegExp('^([\\s\\S]*?:\\/\\/)([\\s\\S]*)$', 'g');
      const res = reg.exec(urlFormData.url);
      return res ? res[2] : '';
    }
    return '';
  }, [urlFormData.url]);
  const credentialValue = useMemo(() => {
    const data = {
      accessKeyID: '',
      secretAccessKey: '',
    };

    if (urlFormData.credential) {
      try {
        return {
          ...data,
          ...JSON.parse(urlFormData.credential),
        };
      } catch (e) {}
    }
    return data;
  }, [urlFormData.credential]);
  const [urlInput, setUrlInput] = useState<string>(initUrlInputValue);
  const [urlType, setUrlType] = useState<string>(urlFormData.type || 'http');
  const [validateStatus, setValidateStatus] = useState<string>('');
  const [validateStatusCode, setValidateStatusCode] = useState<number>(0);
  const validationRequestId = useRef(0);
  const isS3Type = useMemo(() => urlType === 's3', [urlType]);

  function resetValidateStatus(): void {
    validationRequestId.current += 1;
    setValidateStatus('');
    setValidateStatusCode(0);
    onValidate?.(false);
  }

  useEffect(() => {
    validationRequestId.current += 1;
    setValidateStatus('');
    setValidateStatusCode(0);
    onValidate?.(false);
  }, [onValidate, validationKey]);

  function handleTypeChange(type: string): void {
    setUrlType(type);

    const patchData: Record<string, string> = {
      type,
      credential: isS3Type ? JSON.stringify(credentialValue) : '{}',
    };

    if (!protocolReg.test(urlInput)) {
      Object.assign(patchData, { url: `${type}://${urlInput}` });
    }

    onChange?.(`${type}://${urlInput}`);
    resetValidateStatus();
  }

  function handleUrlChange({ target }: ChangeEvent<HTMLInputElement>): void {
    const formatUrl = target.value.trim();
    setUrlInput(formatUrl);
    onChange?.(protocolReg.test(formatUrl) ? formatUrl : `${urlType}://${formatUrl}`);
    resetValidateStatus();
  }

  function handleAccessInputChange(): void {
    // TODO s4地址暂时隐藏
    // onChange?.({
    //   credential: JSON.stringify(credentialValue),
    // });
    resetValidateStatus();
  }

  function handleVerifyResult(isOk: any, errorCode?: number) {
    setValidateStatus(isOk ? 'success' : 'error');
    setValidateStatusCode(isOk ? 0 : errorCode || 0);
    onValidate?.(!!isOk);
  }

  function handleVerify(e: any) {
    e.stopPropagation();
    e.preventDefault();

    const requestId = validationRequestId.current + 1;
    validationRequestId.current = requestId;
    setValidateStatus('validating');
    onValidate?.(false);
    validateRepoUrl(workspace, formData)
      .then(({ ok, errorCode }: any) => {
        if (requestId === validationRequestId.current) {
          handleVerifyResult(ok, errorCode);
        }
      })
      .catch(() => {
        if (requestId === validationRequestId.current) {
          handleVerifyResult(false);
        }
      });
  }
  const hasHttpStr = /^(http|https):\/\/([\w.]+\/?)\S*/.test(urlInput);

  function disableVerify() {
    if (isSubmitting || validateStatus === 'validating' || hasHttpStr) {
      return true;
    }

    if (isS3Type) {
      const { accessKeyID, secretAccessKey } = credentialValue;
      return isEmpty(urlInput) || isEmpty(accessKeyID) || isEmpty(secretAccessKey);
    }

    return isEmpty(urlInput);
  }

  function renderValidateStatus() {
    if (!validateStatus) {
      return;
    }

    if (validateStatus === 'validating') {
      return <Loading size={16} />;
    }

    return (
      <Tooltip
        placement="top"
        content={
          validateStatus === 'success'
            ? t('VALID_URL_DESC')
            : checkRepoInvalidReason(validateStatusCode || -1)
        }
      >
        <Icon
          name={validateStatus}
          style={{
            color: '#ffffff',
            fill: validateStatus === 'error' ? '#ea4641' : '#55bc8a',
          }}
        />
      </Tooltip>
    );
  }
  function getInputWrapperCls() {
    if (urlInput.includes('http') && hasHttpStr) {
      return 'form-item form-item-status-error';
    }
    return 'form-item';
  }

  return (
    <>
      <UrlItem className={getInputWrapperCls()}>
        <Label>{t('URL')}</Label>
        <Horizon>
          <InputWrapper className="input-wrapper">
            <Select value={urlType} options={protocols} onChange={handleTypeChange} />
            <Input
              value={urlInput}
              autoComplete="off"
              placeholder="example.com"
              onChange={handleUrlChange}
              suffix={renderValidateStatus()}
            />
          </InputWrapper>
          {!isS3Type && (
            <Button onClick={handleVerify} disabled={disableVerify()}>
              {validateStatus === 'validating' ? t('VALIDATING') : t('VALIDATE')}
            </Button>
          )}
        </Horizon>
        {hasHttpStr ? (
          <ErrorLi>{t('REPO_URL_ERR_TIP')}</ErrorLi>
        ) : validateStatus === 'error' ? (
          <ErrorLi role="alert" aria-live="assertive">
            {checkRepoInvalidReason(validateStatusCode || -1)}
          </ErrorLi>
        ) : (
          <Help>{t('APP_REPO_URL_DESC')}</Help>
        )}
      </UrlItem>
      {isS3Type && (
        <AccessItem className="form-item">
          <InputWrapper className="input-wrapper">
            <div>
              <Label>{t('ACCESS_KEY_ID')}</Label>
              <Input
                name="accessKeyID"
                autoComplete="off"
                value={credentialValue.accessKeyID}
                onChange={handleAccessInputChange}
              />
            </div>
            <div>
              <Label className="label">{t('SECRET_ACCESS_KEY')}</Label>
              <Input
                name="secretAccessKey"
                autoComplete="off"
                value={credentialValue.secretAccessKey}
                onChange={handleAccessInputChange}
              />
            </div>
          </InputWrapper>
          <Button onClick={handleVerify} disabled={disableVerify()}>
            {validateStatus === 'validating' ? t('VALIDATING') : t('VALIDATE')}
          </Button>
        </AccessItem>
      )}
    </>
  );
}

export default UrlInput;
