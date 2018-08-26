import { OrderedMap } from 'immutable';
import map from 'lodash/map';
import uniqueId from 'lodash/uniqueId';
import React from 'react';
import { FieldMap, FieldProps, FieldState, FixedProps } from '../types';
import { copyInternalFormId } from '../util/serializer';
import { default as CompositeField } from './CompositeField';

export type FieldCountHandler = React.MouseEventHandler<HTMLButtonElement>;

export interface Props extends FieldProps {
  renderControls: (add: FieldCountHandler, remove: FieldCountHandler) => React.ReactNode;
  renderFields: (override: Partial<FixedProps>) => FieldMap;
  schema: any;
  updateSchema: any;
  value: OrderedMap<string, FieldState>;
}

export interface State {
  values: OrderedMap<string, FieldState>;
}

class RepeatableField extends CompositeField {
  static defaultProps: Partial<Props> = {
    renderControls: (add, remove) => [
      <button key="add" onClick={add}>
        Add
      </button>,
      <button key="remove" onClick={remove}>
        Remove
      </button>,
    ],
  };

  state: State = {
    values: this.props.value,
  };

  addField = () => {
    const { createDefaultField, field, handleChangeValue, name, value } = this.props;
    const newValue = value.set('new', createDefaultField(field, value.map((child) => child.value).toList().toJS()));

    handleChangeValue(name, newValue);
  };

  removeField = (key?: string): void => {
    const { name, handleChangeValue, value } = this.props;

    handleChangeValue(name, key ? value.delete(key) : value.butLast());
  };

  updateFieldState = (field: string, value: any): void => {
    const { handleChangeValue, name, path } = this.props;

    const prev = this.props.value.get(field);
    const next =
      prev.type !== 'composite' && prev.type !== 'repeatable' ? copyInternalFormId(prev.value, value) : value;
    const idx = this.props.value.keySeq().indexOf(field);

    handleChangeValue(`${path}.${idx}`, next);
  };

  render() {
    const { hasControls, renderControls, renderFields, name } = this.props;

    return (
      <div data-repeatable-field={`${name}`}>
        {map(
          renderFields({
            addField: this.addField,
            removeField: this.removeField,
            onBlur: this.handleBlur,
            handleChangeEvent: this.handleChangeEvent,
            handleChangeValue: this.handleChangeValue,
          }),
          (field) => field,
        )}
        {hasControls
          ? renderControls(
              (e: React.MouseEvent<HTMLButtonElement>) => this.addField(),
              (e: React.MouseEvent<HTMLButtonElement>) => this.removeField(),
            )
          : null}
        <style jsx>{`
          div {
            flex: 1;
          }
        `}</style>
      </div>
    );
  }
}

export default RepeatableField;
