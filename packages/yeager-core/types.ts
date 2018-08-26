import { List, OrderedMap } from 'immutable';
import { AvatarItem } from './fields/AvatarUploadField';
import { ToolbarButtons as RTEButtons } from '@techinasia/techinasia-web-community-editor/buttons';
import { PlainField, CompositeField, RepeatableField } from './model/field';
import StateMachine from 'javascript-state-machine'; // tslint:disable-line

export interface Schema {
  [fieldName: string]: FieldConfig;
}

export type FieldConfig = FieldConfigs[keyof FieldConfigs];

export interface FieldConfigs extends FieldsType {
  avatar: AvatarFieldConfig;
  checkbox: CheckFieldConfig;
  composite: CompositeFieldConfig;
  file: FileFieldConfig;
  gallery: GalleryFieldConfig;
  input: InputFieldConfig;
  radio: RadioFieldConfig;
  radioList: RadioListFieldConfig;
  reactSelect: ReactSelectFieldConfig;
  reactSelectAsync: ReactSelectAsyncFieldConfig;
  repeatable: RepeatableFieldConfig;
  rte: RTEFieldConfig;
  select: SelectFieldConfig;
  textarea: TextareaFieldConfig;
  toggle: ToggleFieldInput;
}

export type FieldsType = { [k in keyof FieldConfigs]: { type: k } };

export interface Constraint {
  [fieldOrValidator: string]: any;
}

export interface BaseFieldConfig<V = any> {
  constraints?: {
    [name: string]: any;
    async?: boolean;
    debounce?: { 
      wait: number;
      maxWait?: number;
      leading?: boolean;
      trailing?: boolean;
    };
  };
  description?: string;
  initialValue: V;
  label?: React.ReactNode;
  placeholder?: any;
  serializer?: {
    toState?(value: any): any;
    fromState?(value: any): any;
  };
  onUpdate?: (formData: any, value: any) => any;
  type: string;
  wrapperConfig?: {
    className?: string;
    component?: React.ComponentType<WrapperProps>;
    includeProps?: string[];
    styles?: Partial<React.CSSProperties>;
    [prop: string]: any;
  };
  maxLength?: number;
  style?: Partial<React.CSSProperties>;
}

// TODO: typings are broken
// Presence should be { allowEmpty: boolean }, but is now empty
// type FieldConstraints =
//   | { [K in keyof ValidateJS.Field]?: ValidateJS.Field[K] }
//   | { [field: string]: { [K in keyof ValidateJS.Field]: ValidateJS.Field[K] } };

export { AvatarItem };

export interface AvatarFieldConfig extends BaseFieldConfig<AvatarItem[]> {
  type: 'avatar';
  multi?: boolean;
  copy?: string;
  shape?: 'square' | 'circle';
}

export interface CheckFieldConfig extends BaseFieldConfig {
  type: 'checkbox';
  text: string;
}

export interface CompositeFieldConfig extends Omit<BaseFieldConfig, 'initialValue'> {
  type: 'composite';
  fields: Schema;
  renderFn(fields: FieldMap, props?: Partial<FieldProps>): JSX.Element;
}

export interface FileFieldConfig extends BaseFieldConfig {
  helpText?: string;
  type: 'file';
}

export interface GalleryFieldConfig extends BaseFieldConfig {
  copy?: string;
  type: 'gallery';
}

export interface InputFieldConfig extends BaseFieldConfig<string> {
  type: 'input';
  inputType?: 'text' | 'password' | 'url' | 'email';
}

export interface RadioFieldConfig extends BaseFieldConfig {
  type: 'radio';
}

export interface RadioListFieldConfig extends BaseFieldConfig {
  type: 'radioList';
  options?: Array<{ text: string; value: string }>;
}

export interface ReactSelectFieldConfig extends BaseFieldConfig {
  type: 'reactSelect';
  options?: Array<{ text: string; value: string }>;
  [prop: string]: any; // for arbitrary props
}

export interface ReactSelectAsyncMultiFieldConfig extends ReactSelectBasicFieldConfig<any[]> {
  multi: true;
}

export interface ReactSelectAsyncCreatableFieldConfig
  extends ReactSelectBasicFieldConfig<null | { [key: string]: any }> {
  creatable: true;
}

export interface ReactSelectBasicFieldConfig<IV = any> extends BaseFieldConfig<IV> {
  type: 'reactSelectAsync';
  onSearch: (input: string) => Promise<any>;
  onUpdate?: (formState: any, value: any) => void;
  processResults?: (input: any) => any;
  [prop: string]: any; // for arbitrary props
}

export type ReactSelectAsyncFieldConfig =
  | ReactSelectBasicFieldConfig
  | ReactSelectAsyncMultiFieldConfig
  | ReactSelectAsyncCreatableFieldConfig;

export interface RepeatableFieldConfig extends Omit<BaseFieldConfig, 'initialValue'> {
  type: 'repeatable';
  field: FieldConfigs[keyof Omit<FieldConfigs, 'repeatable'>];
  count?: number;
  hasControls?: boolean;
  renderControls?: (
    add: React.MouseEventHandler<HTMLButtonElement>,
    remove: React.MouseEventHandler<HTMLButtonElement>,
  ) => React.ReactNode;
}

export { RTEButtons };

export interface RTEFieldConfig extends BaseFieldConfig {
  type: 'rte';
  buttons?: RTEButtons[];
  maxChars?: number;
}

export interface SelectFieldConfig extends BaseFieldConfig {
  type: 'select';
  options: Array<{ disabled?: boolean; text: string; value: string }>;
}

export interface TextareaFieldConfig extends BaseFieldConfig<string> {
  type: 'textarea';
  charcount?: number;
}

export interface ToggleFieldInput extends BaseFieldConfig {
  type: 'toggle';
  options: Array<{ text: string; value: string }>;
}

export interface Serializer {
  toState?: (value: any) => any;
  fromState?: (value: any) => any;
}

export type InputType = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export interface FixedProps {
  addField?: () => void;
  removeField?: (key: string) => void;
  onBlur: BlurEventHandler;
  handleChangeEvent: InputEventHandler;
  handleChangeValue: InputValueHandler;
}

export type BlurEventHandler = (e: React.FocusEvent<InputType>) => void;

export type InputValueHandler = (name: string, value: any) => void;

export type InputEventHandler = (e: React.ChangeEvent<InputType>) => void;

export type FormEventHandler = (e: React.FormEvent<HTMLFormElement>) => void;

export interface FieldProps<C extends BaseFieldConfig<V> = any, V = any> {
  addField?: () => void;
  removeField?: (key: string) => void;
  createDefaultField?: (config: FieldConfig, parentValue?: any) => Field;
  description?: any;
  error?: List<string>;
  onBlur?: BlurEventHandler;
  handleChangeEvent: InputEventHandler;
  handleChangeValue?: InputValueHandler;
  initialValue?: V;
  name: string;
  path?: string;
  placeholder?: any;
  serializer?: Serializer;
  parentValue?: any;
  value: V;
  status?: FieldStatus[];
  [prop: string]: any;
}

export interface WrapperProps {
  className?: string;
  children?: React.ReactNode;
  label?: React.ReactNode;
  styles?: Partial<React.CSSProperties>;
  status?: FieldStatus[];
  [prop: string]: any;
}

export interface FieldWrapperProps extends FieldProps {
  component?: React.ComponentType<FieldProps>;
  instance: Field;
  renderFields?: (override?: Partial<FixedProps>) => FieldMap;
  status?: FieldStatus[];
}

export interface FieldMap {
  [type: string]: React.ReactElement<any>;
}

export interface FormData {
  [field: string]: any;
}

/**
 * Internal representation
 */
export type FieldTypes = keyof FieldConfigs;

export type FieldState = PlainFieldState | RepeatableFieldState | CompositeFieldState;

export type Field = CompositeField | RepeatableField | PlainField;

export type FormState = OrderedMap<string, Field>;

export enum FieldStatus {
  Touched, // Field has blurred
  Untouched, // Field has not been blurred
  Clean, // Field has not received input
  Dirty, // Field has received input
  Pending, // Field is waiting on async validation result
  Valid, // Field is valid
  Invalid, // Field has validation errors
}

export type Validator = (field: Field, name?: string, force?: boolean) => Field;

export type RootSetter = (state: FormState) => void;

export type RootGetter = () => FormState;

export interface Validatable {
  getRootState?: RootGetter;
  setRootState?: RootSetter;
  validator?: Validator;
}

export interface PlainFieldState {
  type: keyof Omit<FieldConfigs, 'repeatable' | 'composite'>;
  value: FieldValue | null;
  errors: List<string>;
  config: FieldConfigs[keyof Omit<FieldConfigs, 'repeatable' | 'composite'>];
  path: string | null;
  status: StateMachine;
}

export interface RepeatableFieldState {
  type: 'repeatable';
  value: OrderedMap<string, Field> | null;
  config: Omit<RepeatableFieldConfig, 'type'>;
  path: string | null;
}

export interface CompositeFieldState {
  type: 'composite';
  value: FormState | null;
  config: Omit<CompositeFieldConfig, 'type'>;
  path: string | null;
}

export type FieldValue = any | { [key: string]: any };

export interface FieldRenderMap {
  [type: string]: React.ComponentType<FieldProps>;
}

export interface ThemeObject {
  className?: string;
  component: React.ComponentType<any>;
  styles?: Partial<React.CSSProperties>;
}

export interface Theme {
  classPrefix: string;
  configs: { [k in keyof FieldConfigs | 'default']?: ThemeObject };
}
