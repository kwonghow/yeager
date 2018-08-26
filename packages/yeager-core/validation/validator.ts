import flatMap from 'lodash/flatMap';
import forEach from 'lodash/forEach';
import isEmpty from 'lodash/isEmpty';
import isPlainObject from 'lodash/isPlainObject';
import map from 'lodash/map';
import reduce from 'lodash/reduce';
import validate from 'validate.js';
import { PlainFieldState, FieldState, FieldStatus } from '../types';
import { statusifyString } from '../model/status';

export type CustomValidator = (value: any, ...args: any[]) => string;
export type AsyncCustomValidator = (value: any, ...args: any[]) => Promise<any>;

export interface CustomValidatorDictionary {
  [validator: string]: ValidateJS.Validator | CustomValidator | AsyncCustomValidator;
}

export interface Error {
  [field: string]: string[];
}

export interface FieldValue {
  name: string;
  value: any;
  errors?: string[];
}

export interface ValidationResult {
  errors?: string[];
  value: any;
}

class Validator {
  constructor(validators?: CustomValidatorDictionary) {
    forEach(validators, (validator, attr) => {
      validate.validators[attr] = validator;
    });
  }

  /**
   * Validates a given FieldValue with validate.single
   * This obviates the need to invoke every validator
   * since we can just use the diff
   *
   * @param {FieldValue} { name, value }
   * @param {ValidateJS.Constraints} constraints
   * @returns {(string[] | undefined)};
   * @memberof Validator
   */
  public validate(value: any, constraints: ValidateJS.Field): string[] {
    // we don't have any constraints, return value as-is
    if (isEmpty(constraints)) {
      return [];
    }

    // we should not pass null to validate.single, becuase we cannot assume
    // that the constraints will be for a non-object value.
    if (isPlainObject(value) || value === null) {
      return map(validate(value, constraints, { fullMessages: false }), (v) => {
        // cast to string becuase typings are broken
        return v.toString();
      });
    }

    return validate.single(value, constraints) || [];
  }

  validateComposite(value: any = {}, constraints: ValidateJS.Field): { [field: string]: string[] } {
    const valuesOnly = reduce<FieldState, { [name: string]: any }>(
      value,
      (acc, v, k) => ({ ...acc, [k]: v.value }),
      {},
    );
    const errors = validate(valuesOnly, constraints);

    return errors;
  }

  validateAsync(value: any, constraints: ValidateJS.Field): Promise<any> {
    if (!isPlainObject(value)) {
      return validate
        .async({ value }, { value: constraints })
        .then((attr: { value: any }) => attr.value, (error: { value: string[] }) => Promise.reject(error.value));
    }

    return validate
      .async(value, constraints)
      .then((attr: any) => attr, (err: { [key: string]: string[] }) => Promise.reject(flatMap(err, (val) => val)));
  }
}

export const shouldValidate = (field: PlainFieldState): boolean => {
  const currentStatus = statusifyString(field.status.state);

  return currentStatus.indexOf(FieldStatus.Untouched) === -1 || currentStatus.indexOf(FieldStatus.Invalid) !== -1;
};

export default Validator;
