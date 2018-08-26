import { List, Record } from 'immutable';
import StateMachine from 'javascript-state-machine';
import debounce from 'lodash/debounce';

import FSM from '../model/status';
import {
  Field,
  FieldConfigs,
  FieldState,
  FieldStatus,
  FieldValue,
  FormState,
  PlainFieldState,
  RootGetter,
  RootSetter,
  Validatable,
  Validator,
} from '../types';
import { getFieldNameFromPath, getFormStatePath } from '../util/path';

// interface PlainField extends PlainFieldState, Validatable {}
export default class PlainField extends Record<PlainFieldState & Validatable>({
  type: 'input',
  value: null,
  errors: List<string>(),
  config: { initialValue: null, type: 'input' },
  path: null,
  status: new FSM(),
  getRootState: null,
  setRootState: null,
  validator: null,
}) {
  constructor(state?: PlainFieldState & Validatable) {
    super(state);

    const { wait = 0, ...rest } = (this.config.constraints && this.config.constraints.debounce) || {};
    this.validate = debounce(this.validate, wait, rest);
  }

  setFieldConfig(config: any): PlainField {
    const record = this.set('config', config);
    record.validate = this.validate;

    return record;
  }

  setFieldValue(value: any): PlainField {
    const record = this.set('value', value);
    record.validate = this.validate;

    return record;
  }

  updateFieldState(state: Partial<PlainFieldState>): PlainField {
    const record = this.merge(state);
    record.validate = this.validate;

    return record;
  }

  getName(): string {
    return getFieldNameFromPath(this.path);
  }

  validate(): void {
    const validated = this.validator(this, this.getName());
    const rootState = this.getRootState().updateIn(getFormStatePath(this.path), () => validated);
    this.setRootState(rootState);
  }
}
