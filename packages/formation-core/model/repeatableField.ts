import { OrderedMap, Record } from 'immutable';
import { Field, FieldConfigs, FieldStatus, FieldValue, RepeatableFieldConfig, RepeatableFieldState } from '../types';

export default class RepeatableField extends Record<RepeatableFieldState>({
  type: 'repeatable',
  value: OrderedMap<string, Field>([['initial', null]]),
  config: { field: { type: 'input', initialValue: null } },
  path: '',
}) {
  constructor(state?: RepeatableFieldState) {
    super(state);
  }

  updateFieldState(state: Partial<RepeatableFieldState>): RepeatableField {
    return this.merge(state) as this;
  }
}
