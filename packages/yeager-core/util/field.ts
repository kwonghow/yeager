import classNames from 'classnames';
import isEmpty from 'lodash/isEmpty';
import { getFormStatePath } from './path';
import { CompositeField, PlainField, RepeatableField } from '../model';
import { Field, FieldStatus, FormState } from '../types';

/**
 * classNameStatus
 *
 * Convenience method for determining which classnames should go onto a field
 * wrapper given its status
 *
 * @param {FieldStatus[]} status
 * @param {string} rest
 * @returns string
 */
export const classNameStatus = (status: FieldStatus[], rest?: string): string =>
  classNames({
    [rest]: true,
    'field-touched': status.indexOf(FieldStatus.Touched) !== -1,
    'field-untouched': status.indexOf(FieldStatus.Untouched) !== -1,
    'field-dirty': status.indexOf(FieldStatus.Dirty) !== -1,
    'field-clean': status.indexOf(FieldStatus.Clean) !== -1,
    'field-invalid': status.indexOf(FieldStatus.Invalid) !== -1,
    'field-valid': status.indexOf(FieldStatus.Valid) !== -1,
    'field-pending': status.indexOf(FieldStatus.Pending) !== -1,
  });

/**
 * getParentField
 *
 * Gets parent field from the supplied root form state. Returns null if the
 * passed PlainField is root level.
 *
 * @param {FormState} rootState
 * @param {PlainField | string} field
 * @returns {RepeatableField | CompositeField | null}
 */
export const getParentField = (
  rootState: FormState,
  field: PlainField | string,
): RepeatableField | CompositeField | null => {
  const formStatePath =
    field instanceof PlainField
      ? getFormStatePath(field.path)
      : getFormStatePath(field);

  // we have a root level field
  if (formStatePath.length <= 2) {
    return null;
  }

  // remove fieldName.value to get the parent
  const parentPath = formStatePath.slice(0, formStatePath.length - 2);

  return rootState.getIn(parentPath);
};

/**
 * extractValues
 *
 * returns either an array or object of unwrapped parent field values
 *
 * @param {RepeatableField|CompositeField} field
 */
export const extractValues = (field: RepeatableField | CompositeField): any => {
  if (!field) {
    return null;
  }

  switch (field.type) {
    case 'composite':
      return field.value.map((child: Field) => child.value).toJS();
    case 'repeatable':
      return field.value
        .map((child: Field) => child.value)
        .toList()
        .toJS();
    default:
      return null;
  }
};

/**
 * isPlainField
 *
 * type guard util function for narrowing Field type
 *
 * @param {Field} field
 * @returns {boolean}
 */
export const isPlainField = (field: Field): field is PlainField => {
  // tslint:disable-next-line
  return field.type !== 'composite' && field.type !== 'repeatable';
};

/**
 * getConstraints
 *
 * @param {PlainField} field
 * @returns {{[name: string]: any}} constraints
 */
export const getConstraints = (field: PlainField): { [name: string]: any } => {
  if (!field.config.constraints || isEmpty(field.config.constraints)) {
    return null;
  }

  const { async, debounce, ...rest } = field.config.constraints;

  return rest;
};
