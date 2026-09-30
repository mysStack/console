/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import styled from 'styled-components';
import { Form } from '@kubed/components';

export const StyledForm = styled(Form)`
  padding: 20px;

  .form-item {
    .input-wrapper,
    .kubed-select,
    .time-input {
      width: 100%;
      max-width: 455px;
    }

    .time-input {
      .input-wrapper {
        width: 336px;
        max-width: 100%;
      }
    }

    .kubed-select {
      width: 110px;

      .kubed-select-selector {
        height: 34px;

        .kubed-select-selection-search {
          input {
            height: 34px;
          }
        }
      }
    }
  }
`;

export const CredentialCard = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  width: min(455px, 100%);
  max-width: 100%;
  min-width: 0;
  min-height: 48px;
  padding: 6px 8px;
  border: 1px solid #d8dee8;
  border-radius: 6px;
  background: #f8fafc;

  .credential-select.kubed-select {
    flex: 1;
    min-width: 0;
    width: auto;

    .kubed-select-selector {
      width: 100%;
    }
  }

  .credential-new-button {
    flex: 0 0 auto;
    white-space: nowrap;
    min-height: 34px;
    padding: 0 10px;
    border-left: 1px solid #d8dee8;
    border-radius: 0;
  }

  @media (max-width: 480px) {
    display: grid;
    grid-template-columns: 20px minmax(0, 1fr);
    align-items: start;
    gap: 8px;

    .credential-select.kubed-select,
    .credential-new-button {
      grid-column: 2;
      min-width: 0;
    }

    .credential-new-button {
      justify-self: start;
    }
  }
`;

export const CredentialControl = styled.div`
  width: min(455px, 100%);
  max-width: 100%;

  @media (max-width: 480px) {
    width: 100%;
  }
`;

export const CredentialStatusRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 20px;
  margin-top: 6px;
  padding: 0 2px;
  color: #657d95;

  .credential-retry-button {
    flex: 0 0 auto;
    min-height: 24px;
    padding: 0 4px;
  }
`;

export const CredentialStatus = styled.span`
  min-width: 0;
  overflow-wrap: anywhere;
`;

export const CredentialIcon = styled.span`
  flex: 0 0 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #657d95;

  @media (max-width: 480px) {
    align-self: flex-start;
  }
`;
