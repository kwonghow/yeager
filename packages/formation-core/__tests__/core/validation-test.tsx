import { Mount } from 'enzyme';
import React from 'react';
import Wrapper from '../Wrapper';
import schemaFactory from '../schemaFactory';
import FieldTypes from '../../model/constants';
import machine from '../../model/status';

const waitFor = (delay: number) => {
  return new Promise((resolve) => {
    setTimeout(resolve, delay);
  });
};

const createSchema = schemaFactory({
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
  password: {
    type: FieldTypes.INPUT,
    initialValue: '',
    inputType: 'password',
    constraints: {
      async: true,
      customAsyncValidator: true,
    },
  },
  email: {
    type: FieldTypes.INPUT,
    initialValue: '',
    inputType: 'text',
    constraints: {
      presence: { allowEmpty: false },
    },
  },
});

describe('validation', () => {
  it('should not validate untouched fields', () => {
    let data = {
      firstName: 'Tester',
      lastName: 'Chan',
      password: 'very_strong',
      email: 'test.chan@techinasia.com',
    };

    const schema = createSchema();

    const wrapper = mount(<Wrapper schema={schema} formData={data} />);
    wrapper.find('input[name="firstName"]').simulate('focus');

    const errors = wrapper
      .find('FieldWrapper[name="firstName"]')
      .children()
      .find('span.error')
      .children();

    expect(errors).toHaveLength(0);
  });

  it('should validate fields on blur', () => {
    let data = {
      firstName: 'Tester',
      lastName: '',
      password: 'very_strong',
      email: 'test.chan@techinasia.com',
    };

    const schema = createSchema();

    const wrapper = mount(<Wrapper schema={schema} formData={data} />);

    const lastName = wrapper.find('input[name="lastName"]');
    lastName.simulate('blur');
    wrapper.update();

    expect(
      wrapper
        .find('FieldWrapper[name="lastName"]')
        .find('span.error')
        .children(),
    ).toHaveLength(1);
  });

  it('should perform async validations', async (done) => {
    const data = {
      firstName: 'Tester',
      lastName: '',
      password: 'very_strong',
      email: 'test.chan@techinasia.com',
    };

    const validators = {
      customAsyncValidator(value: any): Promise<string> {
        return new Promise((resolve) => {
          setTimeout(() => resolve('error found'), 500);
        });
      },
    };

    const schema = createSchema();

    const wrapper = mount(<Wrapper validators={validators} schema={schema} formData={data} />);

    const password = wrapper.find('input[name="password"]');
    password.instance().value = 'very_very_strong';
    password.simulate('change');
    password.simulate('blur');

    await waitFor(600);

    wrapper.update();

    expect(
      wrapper
        .find('FieldWrapper[name="password"]')
        .find('span.error')
        .children(),
    ).toHaveLength(1);

    done();
  });

  it('should cancel previous async validations', async (done) => {
    const data = {
      firstName: 'Tester',
      lastName: '',
      password: 'very_strong',
      email: 'test.chan@techinasia.com',
    };

    const validators = {
      customAsyncValidator(value: any): Promise<string> {
        return new Promise((resolve) => {
          setTimeout(() => { 
            if (value === 'very_weak') {
              resolve('password is not strong enough');
              return;
            }

            resolve();
          }, 300);
        });
      },
    };

    const schema = createSchema();

    const wrapper = mount(<Wrapper validators={validators} schema={schema} formData={data} />);

    const password = wrapper.find('input[name="password"]');
    // trigger a validation that should fail
    password.instance().value = 'very_weak';
    password.simulate('change');
    password.simulate('blur');

    // trigger a validation that should pass
    password.instance().value = 'very_strong';
    password.simulate('change');
    password.simulate('blur');

    await waitFor(800);

    wrapper.update();

    expect(
      wrapper
        .find('FieldWrapper[name="password"]')
        .find('span.error')
        .children(),
    ).toHaveLength(0);

    done();
  });

  it('should validate the entire form on submit', () => {
    const data = {
      firstName: undefined,
      lastName: 'Tan',
      receiveNewsletter: true,
      country: 1,
    };

    const schema = {
      firstName: {
        type: FieldTypes.INPUT,
        initialValue: '',
        constraints: {
          presence: { allowEmpty: false },
        },
      },
      lastName: {
        type: FieldTypes.INPUT,
        initialValue: '',
        constraints: {
          length: {
            minimum: 15,
          },
        },
      },
      receiveNewsletter: {
        type: FieldTypes.CHECKBOX,
        initialValue: false,
        constraints: {
          presence: true,
        },
      },
      country: {
        type: FieldTypes.SELECT,
        options: [{ text: 'Singapore', value: '1' }, { text: 'Malaysia', value: '2' }],
      },
    };

    const wrapper = mount(<Wrapper schema={schema} formData={data} updateFormData={(x) => x} />);

    wrapper.find('form').simulate('submit');
    wrapper.update();

    expect(
      wrapper
        .find('FieldWrapper')
        .first()
        .find('span.error')
        .children(),
    ).toHaveLength(1);
  });

  it('should not call handleSubmit if the form is in an error state', () => {
    const data = {
      lastName: 'Tan',
    };

    const schema = {
      firstName: {
        type: FieldTypes.INPUT,
        initialValue: '',
        constraints: {
          presence: { allowEmpty: false },
        },
      },
      lastName: {
        type: FieldTypes.INPUT,
        initialValue: '',
        constraints: {
          length: {
            minimum: 15,
          },
        },
      },
    };

    const mockHandleSubmit = jest.fn();

    const wrapper = mount(<Wrapper schema={schema} formData={data} handleSubmit={jest.fn()} />);

    wrapper.find('form').simulate('submit');
    wrapper.update();

    expect(mockHandleSubmit).toHaveBeenCalledTimes(0);
  });

  it('should validate repeatable fields', () => {
    const data = {
      repeatableFieldTest: ['foo', 'bar'],
    };

    const schema = {
      repeatableFieldTest: {
        type: FieldTypes.REPEATABLE,
        field: {
          type: FieldTypes.INPUT,
          constraints: {
            length: {
              minimum: 15,
            },
          },
        },
      },
    };

    const wrapper = mount(<Wrapper schema={schema} formData={data} />);
    wrapper.find('form').simulate('submit');

    wrapper.update();

    expect(wrapper.find('span.input.error')).toHaveLength(2);
  });

  it('should validate children of composite fields with sibling values', () => {
    const schema = {
      newPassword: {
        type: FieldTypes.COMPOSITE,
        fields: {
          first: {
            constraints: {
              presence: {
                allowEmpty: false,
                message: 'Please enter your new password.',
              },
            },
            initialValue: '',
            type: FieldTypes.INPUT,
            label: 'New password',
            inputType: 'password',
          },
          second: {
            initialValue: '',
            constraints: {
              equality: {
                attribute: 'first',
                message: '^Your passwords do not match.',
              },
              presence: {
                allowEmpty: false,
                message: 'Please enter your new password again.',
              },
            },
            type: FieldTypes.INPUT,
            label: 'New password again',
            inputType: 'password',
          },
        },
      },
    };

    const data = {
      newPassword: { first: 'very_strong', second: 'very_very_strong' },
    };

    const wrapper = mount(<Wrapper schema={schema} formData={data} />);
    const secondInputNode = wrapper.find('input[name="second"]');

    secondInputNode.instance().value = 'very_strong';
    secondInputNode.simulate('change');
    secondInputNode.simulate('blur');

    expect(wrapper.find('FieldWrapper[name="second"]').find('.error.visible.input').children()).toHaveLength(0);
  });
});
