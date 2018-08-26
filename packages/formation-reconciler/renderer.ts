import { generateUUID } from '@techinasia/techinasia-web-util-core';
import { List, OrderedMap } from 'immutable';
import get from 'lodash/get';
import hasIn from 'lodash/hasIn';
import includes from 'lodash/includes';
import isEqual from 'lodash/isEqual';
import isFunction from 'lodash/isFunction';
import padEnd from 'lodash/padEnd';
import pickBy from 'lodash/pickBy';
import range from 'lodash/range';
import reduce from 'lodash/reduce';
import uniqueId from 'lodash/uniqueId';
import React, { ComponentType } from 'react';
import FieldWrapper from '../core/FieldWrapper';
import { CompositeField, PlainField, RepeatableField } from '../model/field';
import Status from '../model/status';
import {
  Field,
  FieldConfig,
  FieldMap,
  FieldRenderMap,
  FieldStatus,
  FixedProps,
  FormData,
  FormState,
  RootGetter,
  RootSetter,
  Schema,
  Theme,
  ThemeObject,
  Validator,
} from '../types';
import { classNameStatus, extractValues, getParentField } from './field';
import { addInternalFormId, createField, getInternalFormId } from './serializer';

const NoopComponent: React.StatelessComponent<any> = (props: any) => <div style={{ display: 'none' }} />;

/**
 * Recursively reconciles external data object with internal state representation
 *
 * @param {FormData} data
 * @param {Schema} schema
 * @returns {FormState}
 */
export const buildFormState = (
  data: FormData = {},
  schema: Schema,
  state: FormState,
  parent: string | null,
  getRootState: RootGetter,
  setRootState: RootSetter,
  validator: Validator,
): FormState => {
  // we need to filter out fields that no longer exist in the schema
  const updatedFields = state
    ? state
        .filter((_, k) => {
          const fields = Object.keys(schema);

          return fields.indexOf(k.toString()) !== -1;
        })
        .toOrderedMap()
    : OrderedMap<string, Field>();

  return reduce(
    schema,
    (formState: FormState, config: FieldConfig, key) => {
      // we need every FieldState object to keep its own path, so that deep
      // updated can be done with complexity O(1). It's obtained by simply
      // concetenating its parent path with its key, or just its key if it is
      // a root level FieldState.
      const path = parent ? `${parent}.${key}` : key;

      switch (config.type) {
        case 'composite':
          return formState.update(key, (f: CompositeField) => {
            // there is a previous value, so don't overwrite unnecessarily
            if (f) {
              const { type, ...newConfig } = config;

              return f
                .updateFieldState({
                  value: f.value.mergeDeep(
                    buildFormState(
                      get(data, key, {}),
                      config.fields,
                      f.value,
                      path,
                      getRootState,
                      setRootState,
                      validator,
                    ),
                  ),
                })
                .updateConfig(newConfig);
            }

            return new CompositeField({
              type: config.type,
              config,
              value: buildFormState(
                get(data, key, {}),
                config.fields,
                null,
                path,
                getRootState,
                setRootState,
                validator,
              ),
              path,
            });
          });
        case 'repeatable': {
          // by default, all repeatable fields start with _one_ empty object each
          const initialValue = config.field.type === 'composite' ? {} : config.field.initialValue;
          const values = get(data, key, [
            isFunction(initialValue)
              ? initialValue(extractValues(formState.get(key) as RepeatableField))
              : initialValue,
          ]);

          return formState.update(key, (f: RepeatableField) => {
            if (f) {
              return f.updateFieldState({
                value: reconcileRepeatableFieldState(
                  config.field,
                  values,
                  f.value,
                  path,
                  getRootState,
                  setRootState,
                  validator,
                ),
              });
            }

            return new RepeatableField({
              type: config.type,
              config,
              value: reconcileRepeatableFieldState(
                config.field,
                values,
                null,
                path,
                getRootState,
                setRootState,
                validator,
              ),
              path,
            });
          });
        }

        default:
          return formState.update(key, (f: PlainField) => {
            const prev = f;
            const next = get(data, key, get(config, 'initialValue'));

            if (f) {
              if (!isEqual(prev.value, next)) {
                const newState = f
                  .updateFieldState({ path })
                  .setFieldValue(next)
                  .setFieldConfig(config);

                newState.validate();

                return newState;
              }

              return !isEqual(prev.config, config) ? f.setFieldConfig(config) : f;
            }

            return new PlainField({
              type: config.type,
              config,
              value: next,
              status: new Status(),
              path,
              errors: List(),
              getRootState,
              setRootState,
              validator,
            });
          });
      }
    },
    updatedFields,
  );
};

export interface RepeatableFieldChild {
  id: string;
  value: any;
}

/**
 * reconcileRepeatableFieldState
 *
 * Repeatable fields are special snowflakes that need to be merged specially.
 * It does the same job as buildFormState, but is adjusted for repeatable fields.
 *
 * @param {FieldConfig} fieldConfig
 * @param {any[]} next
 * @param {OrderedMap<string, Field>}
 * @returns {OrderedMap<string, Field>}
 */
const reconcileRepeatableFieldState = (
  fieldConfig: FieldConfig,
  next: any[],
  prev: OrderedMap<string, Field>,
  path: string,
  getRootState: RootGetter,
  setRootState: RootSetter,
  validator: Validator,
): OrderedMap<string, Field> => {
  return next.reduce(
    (acc: OrderedMap<string, Field>, raw, index) => {
      const internalId = getInternalFormId(raw);
      const key = internalId || index.toString();
      const prevState: Field = prev && prev.get(key);
      const prevVal = get(prevState, 'value', null);

      switch (fieldConfig.type) {
        case 'composite': {
          if (prevState) {
            return acc.set(
              key,
              (prevState as CompositeField).updateFieldState({
                value: buildFormState(
                  raw as FormData,
                  fieldConfig.fields,
                  prevVal as FormState,
                  path,
                  getRootState,
                  setRootState,
                  validator,
                ),
              }),
            );
          }

          return acc.set(
            key,
            new CompositeField({
              type: fieldConfig.type,
              config: fieldConfig,
              path: `${path}.${key}`,
              value: buildFormState(
                raw,
                fieldConfig.fields,
                prevVal as FormState,
                path,
                getRootState,
                setRootState,
                validator,
              ),
            }),
          );
        }

        case 'repeatable': {
          if (prevState) {
            return acc.set(
              key,
              (prevState as RepeatableField).updateFieldState({
                value: reconcileRepeatableFieldState(
                  fieldConfig,
                  raw,
                  prevVal as OrderedMap<string, Field>,
                  path,
                  getRootState,
                  setRootState,
                  validator,
                ),
              }),
            );
          }

          return acc.set(
            key,
            new RepeatableField({
              type: fieldConfig.type,
              config: fieldConfig,
              path: `${path}.${key}`,
              value: reconcileRepeatableFieldState(
                fieldConfig,
                raw,
                prevVal as OrderedMap<string, Field>,
                path,
                getRootState,
                setRootState,
                validator,
              ),
            }),
          );
        }

        default: {
          if (prevState) {
            if (!isEqual(prevState.value, raw)) {
              // tslint:disable-next-line
              const newState = (prevState as PlainField).setFieldValue(raw);

              newState.validate();
              return acc.set(internalId, newState);
            }

            return acc.set(internalId, prevState);
          }

          const id = generateUUID();

          const newState = new PlainField({
            type: fieldConfig.type,
            config: fieldConfig,
            value: internalId ? raw : addInternalFormId(raw, id),
            path: `${path}.${internalId || id}`,
            errors: List(),
            status: new Status(),
            getRootState,
            setRootState,
            validator,
          });

          return acc.set(internalId || id, newState);
        }
      }
    },
    OrderedMap<string, Field>() as FormState,
  );
};

/**
 * This function merges any specified with the theme-level config.
 * Granular (i.e. schema-level) wrapper configs will always take precedence.
 *
 * @param {FormTypes.FieldConfig} fieldConfig
 * @param {FormTypes.Theme} theme
 * @returns {FormTypes.FieldConfig}
 */
const mergeConfigs = (fieldConfig: FieldConfig, theme: Theme): FieldConfig => {
  const DEFAULT_ADDITIONAL_PROPS = ['schema', 'updateSchema'];

  const { classPrefix, configs: themeConfigMap } = theme;

  const { wrapperConfig: schemaConfig, ...rest } = fieldConfig;

  const themeConfig: ThemeObject = get(themeConfigMap, fieldConfig.type, themeConfigMap.default);

  const additionalWrapperProps = pickBy(fieldConfig, (v, k) =>
    includes([...get(schemaConfig, 'includeProps', []), ...DEFAULT_ADDITIONAL_PROPS], k),
  );

  return {
    wrapperConfig: {
      ...themeConfig,
      ...schemaConfig,
      className: `${classPrefix} ${(schemaConfig && schemaConfig.className) || themeConfig.className}`,
      ...additionalWrapperProps,
    },
    ...rest,
  };
};

/**
 * Merges granular schema-level field config with field-level configs.
 * Uses mergeConfigs helper function. Schema-level configs will alway take priority.
 *
 * @param {{ [prop: string]: any }} wrapperProps - all wrappers get these props
 * @param {FormTypes.Theme} theme - the theme object
 * @param {FormTypes.Schema<FormTypes.FieldConfig>} schema - form schema
 * @returns {FormTypes.Schema<FormTypes.FieldConfig>} - the merged configs
 */
const resolveFieldConfig = (wrapperProps: { [prop: string]: any }, theme: Theme, schema: Schema): Schema => {
  return reduce(
    schema,
    (mergedSchema, config, name) => {
      switch (config.type) {
        case 'composite': {
          const { fields } = config;

          return {
            ...mergedSchema,
            [name]: {
              ...mergeConfigs({ ...config, ...wrapperProps }, theme),
              ...wrapperProps,
              fields: resolveFieldConfig(wrapperProps, theme, fields),
            },
          };
        }

        case 'repeatable': {
          const { count, field } = config;

          return {
            ...mergedSchema,
            [name]: {
              ...mergeConfigs({ ...config, ...wrapperProps }, theme),
              ...wrapperProps,
              field:
                field.type === 'composite'
                  ? {
                      ...mergeConfigs({ ...field, ...wrapperProps }, theme),
                      fields: resolveFieldConfig(wrapperProps, theme, field.fields),
                    }
                  : mergeConfigs({ ...field, ...wrapperProps }, theme),
            },
          };
        }

        default: {
          return {
            ...mergedSchema,
            [name]: {
              ...mergeConfigs(config, theme),
            },
          };
        }
      }
    },
    {},
  );
};

/**
 * Renders fields according to the provided schema
 *
 * @param {FormTypes.FormData} state
 * @param {FormTypes.FieldRenderMap} fieldRenderMap
 * @param {FormTypes.ChangeHandlers} handlers
 * @param {FormTypes.Theme} theme
 * @param {FormTypes.Schema<FormTypes.FieldConfig>} schema
 * @returns {FormTypes.FieldMap}
 */
const fieldRenderer = (
  state: FormState,
  fieldRenderMap: FieldRenderMap,
  handlers: FixedProps,
  getRootState: () => FormState,
  setRootState: (state: FormState) => void,
  validator: Validator,
): FieldMap => {
  return state.reduce((fields, fieldState, fieldName) => {
    const { constraints, label, wrapperConfig, ...rest } = fieldState.config;
    const { component: WrapperComponent, ...wrapperOptions } = wrapperConfig;

    const field = get(fieldRenderMap, fieldState.type, NoopComponent);
    const name = fieldName.toString();

    switch (fieldState.type) {
      case 'composite': {
        const renderFields = (override?: Partial<FixedProps>) =>
          fieldRenderer(
            fieldState.value,
            fieldRenderMap,
            {
              ...handlers,
              ...override,
            },
            getRootState,
            setRootState,
            validator,
          );

        return {
          ...fields,
          [fieldName]: (
            <WrapperComponent key={fieldName} label={label} {...wrapperOptions}>
              <FieldWrapper
                component={field}
                instance={fieldState}
                renderFields={renderFields}
                name={name}
                path={fieldState.path}
                value={fieldState.value}
                {...handlers}
                {...rest}
              />
            </WrapperComponent>
          ),
        };
      }

      case 'repeatable': {
        const subSchema = fieldState.value.toOrderedMap();

        const renderFields = (override?: Partial<FixedProps>) =>
          fieldRenderer(
            subSchema,
            fieldRenderMap,
            {
              ...handlers,
              ...override,
            },
            getRootState,
            setRootState,
            validator,
          );

        return {
          ...fields,
          [fieldName]: (
            <WrapperComponent key={fieldName} label={label} {...wrapperOptions}>
              <FieldWrapper
                component={field}
                instance={fieldState}
                renderFields={renderFields}
                name={name}
                path={fieldState.path}
                value={fieldState.value}
                createDefaultField={createField(getRootState, setRootState, validator)}
                {...handlers}
                {...rest}
              />
            </WrapperComponent>
          ),
        };
      }

      default: {
        const status: FieldStatus[] = fieldState.status.toArray();
        const key = getInternalFormId(fieldState.value) || fieldName;
        const className = classNameStatus(status, wrapperOptions.className);
        const maybeParentField = getParentField(getRootState(), fieldState);

        return {
          ...fields,
          [fieldName]: (
            <WrapperComponent key={key} label={label} status={status} {...wrapperOptions} className={className}>
              <FieldWrapper
                component={field}
                instance={fieldState}
                error={fieldState.errors}
                name={key}
                path={fieldState.path}
                value={fieldState.value}
                parentValue={!!maybeParentField && extractValues(maybeParentField)}
                status={status}
                {...handlers}
                {...rest}
              />
            </WrapperComponent>
          ),
        };
      }
    }
  }, {});
};

export { fieldRenderer, resolveFieldConfig };
