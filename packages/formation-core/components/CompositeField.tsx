import get from 'lodash/get';
import map from 'lodash/map';
import reduce from 'lodash/reduce';
import set from 'lodash/set';
import React, { Component } from 'react';
import {
  BlurEventHandler,
  FieldMap,
  FieldProps,
  FixedProps,
  InputEventHandler,
  InputValueHandler,
} from '../types';

export interface Props extends FieldProps {
  renderFields: (override: Partial<FixedProps>) => FieldMap;
  renderFn?: (fields: FieldMap, props?: Partial<FieldProps>) => React.ReactNode;
}

class CompositeField extends Component<Props> {
  static defaultProps: Partial<Props> = {
    renderFn: (fields) => {
      return (
        <div>
          {map(fields, (field) => field)}
        </div>
      );
    },
  };

  state = {};

  handleBlur: BlurEventHandler = (e) => {
    e.preventDefault();
    e.persist();

    const { onBlur, path } = this.props;

    const { name } = e.currentTarget;
    const newName = `${path}.${name}`;
    e.currentTarget = { ...e.currentTarget };
    e.currentTarget.name = newName;

    onBlur(e);
  }

  handleChangeEvent: InputEventHandler = (e) => {
    e.preventDefault();
    e.persist();
    const { name, value } = e.currentTarget;

    this.updateFieldState(name, value);
  };

  handleChangeValue: InputValueHandler = (name, value) => {
    this.updateFieldState(name, value);
  };

  updateFieldState = (childFieldName: string, value: any): void => {
    const { name, handleChangeValue } = this.props;

    handleChangeValue(`${name}.${childFieldName}`, value);
  };

  render() {
    const { renderFields, renderFn, value, ...rest } = this.props;

    const renderedFields = renderFields({
      onBlur: this.handleBlur,
      handleChangeEvent: this.handleChangeEvent,
      handleChangeValue: this.handleChangeValue,
    });

    return (
      <div data-composite-field={`${rest.name}`}>
        {renderFn(renderedFields, rest)}
      </div>
    );
  }
}

export default CompositeField;
