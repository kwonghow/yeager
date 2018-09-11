import { is, List, OrderedMap, Stack } from 'immutable';
import clone from 'lodash/clone';
import forEach from 'lodash/forEach';
import get from 'lodash/get';
import has from 'lodash/has';
import isEmpty from 'lodash/isEmpty';
import isEqual from 'lodash/isEqual';
import map from 'lodash/map';
import noop from 'lodash/noop';
import reduce from 'lodash/reduce';
import set from 'lodash/set';
import some from 'lodash/some';
import React, { Component, ComponentType, FormEvent } from 'react';
import {
  cancelable,
  Cancelable as CancelablePromise,
  isCanceled,
} from '../util/promise';
import { PlainField } from '../model';
import Validator, {
  CustomValidatorDictionary,
  FieldValue,
  shouldValidate,
  ValidationResult,
} from '../validation/validator';
import {
  BlurEventHandler,
  CompositeFieldState,
  Field,
  FieldMap,
  FieldRenderMap,
  FieldStatus,
  FormData,
  FormEventHandler,
  FormState,
  InputEventHandler,
  InputValueHandler,
  PlainFieldState,
  Schema,
  Theme,
} from '../types';
import { getConstraints, getParentField, isPlainField } from '../util/field';
import {
  buildFormState,
  fieldRenderer,
  resolveFieldConfig,
} from '../reconciler';
import { getFieldNameFromPath, getFormStatePath } from '../util/path';
import populateFormData, {
  copyInternalFormId,
  getInternalFormId,
  getUniqueValue,
  hasInternalFormId,
} from '../util/serializer';

export interface Props {
  children: (fields: FieldMap) => React.ReactNode;
  fieldRenderMap?: FieldRenderMap;
  formData: FormData;
  handleSubmit: (data: FormData) => void;
  schema: Schema;
  theme?: Theme;
  updateFormData: (data: FormData) => void;
  updateSchema: (schema: Schema) => void;
  validators?: CustomValidatorDictionary;
}

export interface State {
  formState: FormState;
  isSubmitting: boolean;
  isSubmitted: boolean;
  hasError: boolean;
}

const defaultSerializer = {
  toState: (x: any) => x,
  fromState: (x: any) => x,
};

export default class Form extends React.Component<Props, State> {
  static defaultProps: Partial<Props> = {
    children: (fields) => (
      <div className="root">{map(fields, (field) => field)}</div>
    ),
    fieldRenderMap: {},
    formData: {},
    updateFormData: (state: FormData) => undefined,
    theme: defaultTheme,
  };

  state: State = {
    formState: OrderedMap({}),
    isSubmitted: false,
    isSubmitting: false,
    hasError: false,
  };

  pendingFormState: FormState;

  validator: Validator = new Validator(this.props.validators);

  validationMap: OrderedMap<string, CancelablePromise> = OrderedMap();

  onUpdate = (name: string, value: any) => {
    const { formData } = this.props;
    const inputOnUpdate = get(this.props.schema, `${name}.onUpdate`, noop);

    if (typeof inputOnUpdate === 'function') {
      inputOnUpdate(formData, value);
    }
  };

  componentDidMount() {
    this.setState({ formState: this.reconcileFormState(this.props) }, () => {
      const populatedFormData = populateFormData(this.state.formState, this.props.formData);
      this.props.updateFormData(populatedFormData);
    });
  }

  componentWillReceiveProps(next: Props) {
    // Update Validator if validators have been changed.
    if (!isEqual(this.props.validators, next.validators)) {
      this.validator = new Validator(next.validators);
    }

    let hasError: boolean;
    const nextFormState = this.reconcileFormState(next);

    // we can't skip the reconciliation cycle. we can, however, prevent DOM
    // mutations in the event that it is the same, by not setting
    // pendingFormState.
    if (!is(this.state.formState, nextFormState)) {
      nextFormState.forEach((fieldState, fieldName) => {
        if (this.hasErrors(fieldState)) {
          hasError = true;
        }
      });

      this.setState({ hasError });
      this.pendingFormState = nextFormState;
    }

    // populate form data with any necessary initial values if the schema has
    // changed
    const maybePopulatedFormData = populateFormData(
      nextFormState,
      next.formData,
    );

    if (!isEqual(next.formData, maybePopulatedFormData)) {
      this.props.updateFormData(maybePopulatedFormData);
    }
  }

  componentDidUpdate() {
    if (this.pendingFormState) {
      this.setState({ formState: this.pendingFormState });
      this.pendingFormState = null;
    }
  }

  shouldComponentUpdate(nextProps: Props, nextState: State) {
    const { children, schema } = this.props;
    const { formState } = this.state;

    return (
      !!this.pendingFormState ||
      !isEqual(schema, nextProps.schema) ||
      !is(formState, nextState.formState) ||
      !isEqual(children, nextProps.children)
    );
  }

  componentWillUnmount() {
    this.validationMap.forEach((pending: CancelablePromise) =>
      pending.cancel(),
    );
    this.validationMap = null;
  }

  /**
   * onBlur
   *
   * @param e: Event
   */
  onBlur: BlurEventHandler = (e) => {
    e.preventDefault();
    e.persist();

    const path = getFormStatePath(e.currentTarget.name);

    const newState = this.state.formState
      .updateIn(path, (field: PlainField) => {
        if (field.status.can('blurred')) {
          field.status.blurred();
        }

        return field.updateFieldState({ status: clone(field.status) });
      })
      .updateIn(path, (field: PlainField) => {
        return this.validate(field, e.currentTarget.name);
      });

    this.setState({ formState: newState });
  };

  /**
   * Handles native input events
   *
   * @memberof Form
   */
  handleChangeEvent: InputEventHandler = (e) => {
    e.preventDefault();
    e.persist();
    const { name, value } = e.currentTarget;

    this.updateFormState(name, value);
  };

  /**
   * Handles custom input changes
   *
   * @memberof Form
   */
  handleChangeValue = (name: string, value: any) => {
    this.updateFormState(name, value);
  };

  hasErrors = (field: Field): boolean => {
    switch (field.type) {
      case 'composite':
        return field.value.some((v) => this.hasErrors(v));
      case 'repeatable':
        return field.value.some((v) => this.hasErrors(v));
      default:
        return field.errors && field.errors.size > 0;
    }
  };

  addPendingValidation = (field: PlainField, validation: Promise<any>) => {
    if (this.validationMap.has(field.path)) {
      this.deletePendingValidation(field);
    }

    const pendingValidation = cancelable(validation);

    pendingValidation.promise
      .then(() => this.handleAsyncValidationResult(field))
      .catch((error: any) => this.handleAsyncValidationResult(field, error));

    this.validationMap = this.validationMap.set(field.path, pendingValidation);
  };

  deletePendingValidation = (field: PlainField) => {
    const pending = this.validationMap.get(field.path);

    if (!!pending) {
      pending.cancel();
    }

    this.validationMap = this.validationMap.delete(field.path);
  };

  /**
   * handleAsyncValidatonResult
   *
   * Clears itself from the PendingValidationMap and updates internal state as
   * required.
   *
   * @param {string} error
   * @param {PlainField} field
   */
  handleAsyncValidationResult = (
    field: PlainField,
    error?: string[] | { canceled: boolean },
  ) => {
    const { formState } = this.state;
    const path = getFormStatePath(field.path);

    if (isCanceled(error) && error.canceled) {
      return;
    }

    if (!formState.hasIn(path)) {
      return;
    }

    const newState = formState.updateIn(path, (f: PlainField) => {
      // no error
      if (!error) {
        if (field.status.can('valid')) {
          field.status.valid();

          return f.updateFieldState({
            status: clone(field.status),
            errors: List(),
          });
        }

        return f.updateFieldState({ errors: List() });
      }

      // have error
      if (field.status.can('invalid')) {
        field.status.invalid();
      }

      return f.updateFieldState({
        status: clone(field.status),
        errors: List(error as string[]),
      });
    });

    this.validationMap = this.validationMap.delete(field.path);
    this.setState({ formState: newState });
  };

  /**
   * Called by both handleChangeEvent and handleChangeValue
   * This method is the main workhorse of this component All composing
   * components must provide updateFormData as a prop.
   *
   * @param {string} name
   * @param {any} value
   */
  updateFormState = (name: string, value: any) => {
    const { formData, schema, updateFormData } = this.props;
    const { formState } = this.state;

    const nativeValue = get(formData, name);

    // only repeatable children get this. if the field is a child of
    // a repeatable field, then we need to use the internalId instead of using
    // the index
    const path = getFormStatePath(name, getInternalFormId(nativeValue));
    const fieldState: Field = formState.getIn(path);

    // bail if we can't find the field
    if (!fieldState) {
      return;
    }

    const fieldSerializer = get(
      fieldState,
      fieldState.type === 'repeatable'
        ? 'config.field.serializer'
        : 'config.serializer',
      {},
    );

    const serializer = { ...defaultSerializer, ...fieldSerializer };

    // this is done because if it's a repeatable field, we always get a
    // List<any>. Therefore, we need to make before reconciling.
    const serializedValue =
      fieldState.type === 'repeatable'
        ? value
            .map((v: any) => {
              if (hasInternalFormId(v.value)) {
                return copyInternalFormId(v.value, serializer.toState(v.value));
              }

              return getUniqueValue(serializer.toState(v.value));
            })
            .toList()
            .toArray()
        : serializer.toState(value);

    // we need to transition state
    if (isPlainField(fieldState) && fieldState.status.can('typed')) {
      fieldState.status.typed();
    }

    const nextFormData = set<FormData>(formData, name, serializedValue);

    // call hooks
    updateFormData(nextFormData);
    this.onUpdate(name, serializedValue);
  };

  getRootState = (): FormState => this.state.formState;

  setRootState = (state: FormState) => this.setState({ formState: state });

  onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    let hasErrors: boolean;

    // validate again
    const validatedFormState = this.state.formState
      .map((fieldState, fieldName) => {
        // we pass the last, optional parameter to force validate 'clean' fields as well
        const validatedFieldState = this.validate(fieldState, fieldName, true);

        if (this.hasErrors(validatedFieldState)) {
          hasErrors = true;
        }

        return validatedFieldState;
      })
      .toOrderedMap();

    if (hasErrors) {
      if (process.env.NODE_ENV !== 'production') {
        // tslint:disable-next-line
        console.warn(
          'handleSubmit will not fire if the form is in an error state',
        );
      }

      this.setState({
        hasError: true,
        formState: validatedFormState as FormState,
      });
      return;
    }

    this.props.handleSubmit(
      populateFormData(this.state.formState, this.props.formData),
    );
  };

  reconcileFormState = (props: Props): FormState => {
    const { fieldRenderMap, formData, schema, theme, updateSchema } = props;

    const additionalProps = {
      formData,
      schema,
      updateSchema,
    };

    const finalFieldRenderMap = {
      ...defaultFieldRenderMap,
      ...fieldRenderMap,
    };

    const formState = buildFormState(
      formData,
      resolveFieldConfig(additionalProps, theme, schema),
      this.state.formState,
      null,
      this.getRootState,
      this.setRootState,
      this.validate,
    );

    return formState;
  };

  validate = (field: Field, name?: string, force: boolean = false): Field => {
    switch (field.type) {
      case 'composite': {
        return field.updateFieldState({
          value: field.value
            .map((subField, idx) => this.validate(subField, idx, force))
            .toOrderedMap(),
        });
      }

      case 'repeatable': {
        return field.updateFieldState({
          value: field.value
            .map((subField, idx) => this.validate(subField, idx, force))
            .toOrderedMap(),
        });
      }

      default: {
        if ((!force && !shouldValidate(field)) || !field.config.constraints) {
          return field;
        }

        let value;
        let constraints;

        const validateAsync = !!field.config.constraints.async;
        const maybeParentField = getParentField(this.state.formState, field);

        constraints = getConstraints(field);

        // this field is a child of composite field. we need to validate as
        // a whole.
        if (maybeParentField && maybeParentField.type === 'composite') {
          // only get siblings that are not repeatable or composite
          value = maybeParentField.value
            .filter((sibling: Field) => isPlainField(sibling))
            .map((sibling: PlainField) => sibling.value)
            .toJS();

          constraints = { [getFieldNameFromPath(name)]: constraints };
        } else {
          value = field.value;
        }

        if (validateAsync) {
          this.addPendingValidation(
            field,
            this.validator.validateAsync(value, constraints),
          );

          if (field.status.can('pending')) {
            field.status.pending();
          }

          return field.updateFieldState({ status: clone(field.status) });
        }

        const errors = this.validator.validate(value, constraints);

        if (errors.length > 0 && field.status.can('invalid')) {
          field.status.invalid();
        }

        if (errors.length === 0 && field.status.can('valid')) {
          field.status.valid();
        }

        return field.updateFieldState({
          status: clone(field.status),
          errors: List(errors),
        });
      }
    }
  };

  render() {
    const {
      children,
      fieldRenderMap,
      formData,
      schema,
      theme,
      updateSchema,
    } = this.props;

    const { formState } = this.state;

    const handlers = {
      onBlur: this.onBlur,
      handleChangeEvent: this.handleChangeEvent,
      handleChangeValue: this.handleChangeValue,
    };

    const finalFieldRenderMap = {
      ...defaultFieldRenderMap,
      ...fieldRenderMap,
    };

    const fieldMap = fieldRenderer(
      formState,
      finalFieldRenderMap,
      handlers,
      this.getRootState,
      this.getRootState,
      this.validate,
    );

    return <form onSubmit={this.onSubmit}>{children(fieldMap)}</form>;
  }
}
