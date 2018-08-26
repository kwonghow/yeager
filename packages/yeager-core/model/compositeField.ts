import { OrderedMap, Record } from 'immutable';
import map from 'lodash/map';
import { 
  CompositeFieldConfig,
  CompositeFieldState,
  FieldConfigs,
FieldMap,
  FieldState,
  FieldStatus,
  FieldValue,
  FormState,
} from '../types';

const defaultRenderFn = (fields: FieldMap) => <>{map(fields, (field) => field)}</>;

export default class CompositeField extends Record<CompositeFieldState>({ 
  type: 'composite',
  value: null,
  config: { fields: {}, renderFn: defaultRenderFn },
  path: '',
}) {
  constructor(state?: CompositeFieldState) {
    super(state);
  }

  updateFieldState(state: Partial<CompositeFieldState>): CompositeField {
    return this.merge(state) as this;
  }

  updateConfig(config: Omit<CompositeFieldConfig, 'type'>): CompositeField {
    return this.set('config', config) as this;
  }
}
