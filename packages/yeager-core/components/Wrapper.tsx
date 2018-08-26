import classnames from 'classnames';
import kebabCase from 'lodash/kebabCase';
import React, { ChangeEvent, Component, ComponentType } from 'react';
import { FieldProps, FieldWrapperProps } from '../types';
import { isPlainField } from '../util/field';
import { copyInternalFormId } from '../util/serializer';

const idSerializer = {
  fromState: (x: any) => x,
  toState: (x: any) => x,
};

const isImmutable = (struct: any) => !!(struct && struct['@@__IMMUTABLE_ITERABLE__@@']);

class FieldWrapper extends Component<FieldWrapperProps> {
  shouldComponentUpdate({ instance }: FieldWrapperProps) {
    return !instance.equals(this.props.instance);
  }

  render() {
    const { component: Field, description, error, instance, isDirty, serializer, type, value, ...rest } = this.props;

    const hasErrors = error && error.size > 0;
    const classes = classnames({
      'form-control': true,
      error: hasErrors,
      isDirty,
    });

    const safeValue = isPlainField(instance) && isImmutable(value) ? value.toJS() : value;
    const safeSerializer = { ...idSerializer, ...serializer };

    return (
      <div className={classes}>
        <Field
          name={name}
          value={!!safeValue ? copyInternalFormId(safeValue, safeSerializer.fromState(safeValue)) : safeValue}
          type={type}
          {...rest}
        />
        <span
          className={classnames({
            error: true,
            visible: hasErrors,
            [type]: true,
          })}
          key={name}
        >
          {error && error.size >= 1 ? error.map((msg) => <div key={msg}>{msg}</div>) : null}
        </span>
        {!!description && <div className="description">{description}</div>}
      </div>
    );
  }
}

export default FieldWrapper;
