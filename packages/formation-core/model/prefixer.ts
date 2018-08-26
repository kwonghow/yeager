import reduce from 'lodash/reduce';
import { Schema } from '../types';

const prefixCompositeFieldNames = (
  prefix: string,
  fields: Schema,
) => {
  return reduce(
    fields,
    (schema, field, name) => {
      const prefixedName = `${prefix}.${name}`;

      return { ...schema, [prefixedName]: field };
    },
    {},
  );
};

export default prefixCompositeFieldNames;
