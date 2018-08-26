import { generateUUID } from '@techinasia/techinasia-web-util-core';
import { List, OrderedMap } from 'immutable';
import clone from 'lodash/clone';
import isArray from 'lodash/isArray';
import isFunction from 'lodash/isFunction';
import isObject from 'lodash/isObject';
import set from 'lodash/set';
import { CompositeField, PlainField, RepeatableField } from '../model';
import Status from '../model/status';
import {
  Field,
  FieldConfig,
  FieldState,
  FieldStatus,
  FormData,
  FormState,
  PlainFieldState,
  RootGetter,
  RootSetter,
  Validator,
} from '../types';

type FieldArrayData = any[];
type FieldObjectData = { [key: string]: any }; // tslint:disable-line
type FieldData = FieldArrayData | FieldObjectData;

const populateInitialValues = (state: OrderedMap<string, Field>, data: FieldData): FieldData => {
  if (data instanceof Array) {
    return state.toList().reduce((fd: FieldArrayData, fs: FieldState, index: number): FieldArrayData => {
      switch (fs.type) {
        case 'composite':
          return set(data, index, populateInitialValues(fs.value, data[index] || {}));
        case 'repeatable':
          return set(data, index, populateInitialValues(fs.value, data[index] || []));
        default:
          return set(data, index, fs.value);
      }
    }, data);
  }

  return state.reduce((fd: FieldObjectData, fs: FieldState, fn: string): FieldObjectData => {
    switch (fs.type) {
      case 'composite':
        return {
          ...fd,
          [fn]: populateInitialValues(fs.value, fd[fn] || {}),
        };
      case 'repeatable':
        return {
          ...fd,
          [fn]: populateInitialValues(fs.value, fd[fn] || []),
        };
      default:
        return {
          ...fd,
          [fn]: fs.value,
        };
    }
  }, data);
};

export const createField = (getRootState: RootGetter, setRootState: RootSetter, validator: Validator) => (
  config: FieldConfig,
  parentValue?: any,
): Field => {
  switch (config.type) {
    case 'composite':
      return new CompositeField();
    case 'repeatable':
      return new RepeatableField();
    default:
      return new PlainField({
        type: config.type,
        path: '',
        value: isFunction(config.initialValue) ? config.initialValue(parentValue) : config.initialValue,
        config,
        errors: List<string>(),
        status: new Status(),
        getRootState,
        setRootState,
        validator,
      });
  }
};

const boxPrimitive = (val: any) => {
  // tslint:disable
  switch (typeof val) {
    case 'string':
      return new String(val);
    case 'number':
      return new Number(val);
    case 'boolean':
      return new Boolean(val);
    default:
      return clone(val);
  }
  // tslint:enable
};

export const hasInternalFormId = (val: any): boolean => {
  if (!isObject(val)) {
    return false;
  }

  return !!Object.getOwnPropertyDescriptor(val, '__internalFormId');
};

export const getInternalFormId = (val: any): string | null => {
  if (isObject(val)) {
    const id = Object.getOwnPropertyDescriptor(val, '__internalFormId');

    return !!id ? id.value : null;
  }

  return null;
};

export const copyInternalFormId = (oldVal: any, newVal: any): any => {
  if (isObject(oldVal)) {
    const id = Object.getOwnPropertyDescriptor(oldVal, '__internalFormId');

    if (id && id.value) {
      return Object.defineProperty(boxPrimitive(newVal), '__internalFormId', {
        enumerable: false,
        writable: true,
        configurable: false,
        value: id.value,
      });
    }

    return newVal;
  }

  return newVal;
};

export const getUniqueValue = (val: any): any => {
  const key = generateUUID();

  return Object.defineProperty(boxPrimitive(val), '__internalFormId', {
    enumerable: false,
    configurable: false,
    writable: true,
    value: key,
  });
};

export const addInternalFormId = (value: any, key: string) => {
  // we need to box this shit
  const uniqueValue = Object.defineProperty(boxPrimitive(value), '__internalFormId', {
    enumerable: false,
    configurable: false,
    writable: true,
    value: key,
  });

  return uniqueValue;
};

export default populateInitialValues;
