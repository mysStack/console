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
  gap: 12px;
  width: 455px;
  min-height: 52px;
  padding: 8px 12px;
  border: 1px solid #d8dee8;
  border-radius: 4px;
  background: #f8fbff;

  .credential-select.kubed-select {
    flex: 1;
    width: auto;

    .kubed-select-selector {
      width: 100%;
    }
  }
`;

export const CredentialStatus = styled.span`
  flex: 1;
  min-width: 0;
  color: #657d95;
`;
