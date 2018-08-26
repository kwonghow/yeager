import React from 'react';
import { mount } from 'enzyme';
import reduce from 'lodash/reduce';
import Wrapper from '../Wrapper';
import schemaFactory from '../schemaFactory';
import FieldTypes from '../../model/constants';
import { default as theme } from '../../model/defaultTheme';
import { FieldStatus, FieldWrapperProps, Theme, WrapperProps } from '../../types';

const schema = {
  firstName: {
    type: FieldTypes.INPUT,
    initialValue: '',
    inputType: 'text',
    constraints: {
      presence: { allowEmpty: false },
    },
  },
  lastName: {
    type: FieldTypes.INPUT,
    initialValue: '',
    inputType: 'text',
    constraints: {
      presence: { allowEmpty: false },
    },
  },
  email: {
    type: FieldTypes.INPUT,
    initialValue: '',
    inputType: 'text',
    constraints: {
      async: true,
      asyncValidator: true,
    },
  },
};

const asyncValidator = (value: any) => {
  return new Promise((resolve, reject) => {
    setTimeout(resolve('error found'), 1000);
  });
};

const validators = { asyncValidator };

const createSchema = schemaFactory(schema);

const TestThemeWrapper = (props: WrapperProps) => {
  const { className, children, fieldStatus, label, styles } = props;
  // we'll inline styles objects to override css or anything of that sort
  return (
    <div className={className} style={styles}>
      {label && <label>{label}</label>}
      {children}
    </div>
  );
};

const testTheme: Theme = {
  ...theme,
  configs: reduce(
    theme.configs,
    (acc, config, key) => ({ ...acc, [key]: { ...config, component: TestThemeWrapper } }),
    {},
  ),
};

describe('field status', () => {
  it('should initialise new fields with clean and untouched', () => {
    let data = {
      firstName: 'Tester',
      lastName: 'Chan',
    };

    const { email, ...schema } = createSchema();
    const wrapper = mount(<Wrapper schema={schema} formData={data} theme={testTheme} validators={validators} />);
    const fieldWrappers = wrapper.find('TestThemeWrapper');
    const inputs = wrapper.find('TextInput');

    fieldWrappers.forEach((fieldWrapper) => {
      expect(fieldWrapper.prop('status')).toEqual([FieldStatus.Clean, FieldStatus.Untouched]);
      expect(fieldWrapper.prop('className')).toEqual(expect.stringContaining('field-untouched field-clean'));
      expect(fieldWrapper.find('TextInput').prop('status')).toEqual([FieldStatus.Clean, FieldStatus.Untouched]);
    });
  });

  it('should transition to dirty and untouched when a user starts typing', () => {
    let data = {
      firstName: 'Tester',
      lastName: 'Chan',
      email: 'tester.chan@techinasia.com',
    };

    const schema = createSchema();
    const wrapper = mount(<Wrapper schema={schema} formData={data} theme={testTheme} validators={validators} />);

    const nativeInput = wrapper
      .find('TestThemeWrapper')
      .first()
      .find('input');
    nativeInput.simulate('focus');
    nativeInput.instance().value = 'Testerr';
    nativeInput.simulate('change');

    const fieldWrapper = wrapper.find('TestThemeWrapper').first();
    const inputComponent = fieldWrapper.find('TextInput');

    expect(fieldWrapper.prop('status')).toEqual([FieldStatus.Dirty, FieldStatus.Untouched]);
    expect(fieldWrapper.prop('className')).toEqual(expect.stringContaining('field-untouched field-dirty'));
    expect(inputComponent.prop('status')).toEqual([FieldStatus.Dirty, FieldStatus.Untouched]);
  });

  it('should transition to clean|dirty and touched when blurred', () => {
    let data = {
      firstName: 'Tester',
      lastName: 'Chan',
      email: 'tester.chan@techinasia.com',
    };

    const schema = createSchema();
    const wrapper = mount(<Wrapper schema={schema} formData={data} theme={testTheme} validators={validators} />);

    const nativeInput = wrapper
      .find('TestThemeWrapper')
      .first()
      .find('input');
    nativeInput.simulate('blur');

    const fieldWrapper = wrapper.find('TestThemeWrapper').first();
    const inputComponent = fieldWrapper.find('TextInput');

    expect(fieldWrapper.prop('status')).toEqual([FieldStatus.Clean, FieldStatus.Touched]);
    expect(fieldWrapper.prop('className')).toEqual(expect.stringContaining('field-touched field-clean'));
    expect(inputComponent.prop('status')).toEqual([FieldStatus.Clean, FieldStatus.Touched]);
  });

  it('should transition to pending if validator is async', () => {
    let data = {
      firstName: 'Tester',
      lastName: 'Chan',
      email: 'tester.chan@techinasia.com',
    };

    const schema = createSchema();
    const wrapper = mount(<Wrapper schema={schema} formData={data} theme={testTheme} validators={validators} />);

    const nativeInput = wrapper.find('FieldWrapper[name="email"]').find('input');
    nativeInput.simulate('blur');

    wrapper.update();

    const fieldWrapper = wrapper.find('TestThemeWrapper').at(2)
    const inputComponent = wrapper.find('TextInput[name="email"]');

    expect(fieldWrapper.prop('status')).toEqual([FieldStatus.Clean, FieldStatus.Touched, FieldStatus.Pending]);
    expect(fieldWrapper.prop('className')).toEqual(expect.stringContaining('field-touched field-clean field-pending'));
    expect(inputComponent.prop('status')).toEqual([FieldStatus.Clean, FieldStatus.Touched, FieldStatus.Pending]);
  });

  it('should transition to invalid if validation fails', () => {
    let data = {
      firstName: 'Tester',
      lastName: 'Chan',
      email: 'tester.chan@techinasia.com',
    };

    const schema = createSchema();
    const wrapper = mount(<Wrapper schema={schema} formData={data} theme={testTheme} validators={validators} />);

    const nativeInput = wrapper
      .find('TestThemeWrapper')
      .first()
      .find('input');

    nativeInput.simulate('focus');
    nativeInput.instance().value = '';
    nativeInput.simulate('change');
    nativeInput.simulate('blur');

    const fieldWrapper = wrapper.find('TestThemeWrapper').first();
    const inputComponent = fieldWrapper.find('TextInput');


    expect(fieldWrapper.prop('status')).toEqual([FieldStatus.Dirty, FieldStatus.Touched, FieldStatus.Invalid]);
    expect(fieldWrapper.prop('className')).toEqual(expect.stringContaining('field-touched field-dirty field-invalid'));
    expect(inputComponent.prop('status')).toEqual([FieldStatus.Dirty, FieldStatus.Touched, FieldStatus.Invalid]);
  });

  it('should transition to valid if validation succeeds', () => {});
});
