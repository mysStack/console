/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React, { useState } from 'react';
import cx from 'classnames';
import { Card, Button } from '@kubed/components';

import { Icon, useDetailPage } from '@ks-console/shared';
import type { FormattedSecret } from '@ks-console/shared';

import { DefaultWrapper, CardTitle, TlsWrapper, ImageWrapper, StyledDescription } from './styles';
import { getSecretDisplayValue } from './maskSecretValue';

function SecretsData(): JSX.Element {
  const [showSecret, setShowSecret] = useState(false);
  const { detail } = useDetailPage<FormattedSecret>();

  const convert = (value: string): string => {
    return getSecretDisplayValue(value, showSecret);
  };

  const renderTLS = (data: { [x: string]: any; release?: string }) => {
    return (
      <TlsWrapper>
        <h6>{t('CREDENTIAL_SI')}</h6>
        <pre>{convert(data['tls.crt'])}</pre>
        <h6 style={{ marginTop: '20px' }}>{t('PRIVATE_KEY_TCAP')}</h6>
        <pre>{convert(data['tls.key'])}</pre>
      </TlsWrapper>
    );
  };

  const renderDefault = (data: { release?: string } = {}) => {
    return (
      <DefaultWrapper>
        {Object.entries(data).map(([key, value]) => (
          <StyledDescription label={key} key={key} className={cx({ showSecret: showSecret })}>
            {convert(value)}
          </StyledDescription>
        ))}
      </DefaultWrapper>
    );
  };

  const renderImageRepositorySecret = (data: {
    '.dockerconfigjson'?: {
      auths: { [propName: string]: { username: string; password: string; email?: string } };
    };
    [x: string]: any;
  }) => {
    const detailInfo = data['.dockerconfigjson'];

    if (!detailInfo?.auths) {
      return null;
    }

    return (
      <ImageWrapper>
        <ul>
          {Object.entries(detailInfo.auths).map(([key, value]) => (
            <li key={key}>
              <h6 className="">
                <Icon name="earth" />
                {key}
              </h6>
              <ul>
                <li>
                  <span>{t('USERNAME')}:</span>
                  <span>{convert(value.username)}</span>
                </li>
                <li>
                  <span>{t('PASSWORD')}:</span>
                  <span>{convert(value.password)}</span>
                </li>
                {value.email && (
                  <li>
                    <span>{t('EMAIL')}:</span>
                    <span>{convert(value.email)}</span>
                  </li>
                )}
              </ul>
            </li>
          ))}
        </ul>
      </ImageWrapper>
    );
  };

  const renderBasicAuth = (data: { release?: string; [x: string]: any }) => {
    return (
      <DefaultWrapper>
        <ul>
          {Object.entries(data).map(([key, value]) => (
            <li key={key}>
              <span>{t(key.toUpperCase())}:</span>
              <span>
                <pre>{convert(value)}</pre>
              </span>
            </li>
          ))}
        </ul>
      </DefaultWrapper>
    );
  };

  const renderContent = () => {
    switch (detail?.type) {
      case undefined:
      case '':
        return null;
      case 'kubernetes.io/tls':
        return renderTLS(detail.data);
      case 'kubernetes.io/dockerconfigjson':
        return renderImageRepositorySecret(detail.data);
      case 'kubernetes.io/basic-auth':
        return renderBasicAuth(detail.data);
      default:
        return renderDefault(detail?.data);
    }
  };

  return (
    <Card hoverable padding={20}>
      <CardTitle>
        {t('DATA')}
        <Button variant="text" onClick={() => setShowSecret(!showSecret)}>
          {showSecret ? <Icon name="eye" /> : <Icon name="eye-closed" />}
        </Button>
      </CardTitle>
      {renderContent()}
    </Card>
  );
}

export default SecretsData;
