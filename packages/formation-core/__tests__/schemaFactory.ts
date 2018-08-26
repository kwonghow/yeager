import clone from 'lodash/clone';

export default (schema: Schema) => {
  const copy = clone(schema);

  return () => schema;
};
