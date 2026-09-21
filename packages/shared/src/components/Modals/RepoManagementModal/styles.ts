/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import styled from 'styled-components';
import { Form } from '@kubed/components';

export const StyledForm = styled(Form)`
  padding: 24px 32px;

  .form-item {
    .input-wrapper,
    .kubed-select,
    .time-input {
      width: 100%;
      max-width: none;
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

export const SectionTitle = styled.h6`
  margin: 20px 0 16px;
  color: #242e42;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
`;

export const BasicInfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 20px;
`;

export const CredentialCard = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 64px;
  padding: 12px 16px;
  border: 1px solid #d8dee8;
  border-radius: 4px;
  background: #f8fbff;

  .credential-select {
    flex: 1;
  }
`;

export const SyncRow = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;

  .form-item {
    flex: 1;
    margin-bottom: 0;
  }
`;
