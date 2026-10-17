/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import { ListAdd, ListItem } from '@ks-console/shared';

import { Wrapper, List } from './styles';
import { omit } from 'lodash';
import { getDataDescription } from './dataListUtils';

interface Props {
  onEdit: Function;
  onAdd: Function;
  name?: string;
  [propName: string]: any;
}

function DataList({ value, onChange, onEdit, onAdd, icon, module }: Props) {
  const handleDelete = (key: string) => {
    if (onChange) {
      onChange(omit(value, key));
    }
  };

  const handleEdit = (key: string) => {
    onEdit(key);
  };

  return (
    <Wrapper>
      <List>
        {value &&
          Object.entries(value).map(([key, _value]) => (
            <ListItem
              key={key}
              icon={icon || 'key'}
              title={key}
              description={getDataDescription(_value, module)}
              onDelete={() => handleDelete(key)}
              onEdit={() => handleEdit(key)}
            />
          ))}
        <ListAdd title={t('ADD_DATA_TCAP')} description={t('ADD_DATA_DESC')} onClick={onAdd} />
      </List>
    </Wrapper>
  );
}

export default DataList;
