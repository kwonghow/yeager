import { mount } from 'enzyme';
import forEach from 'lodash/forEach';
import compose from 'lodash/fp/compose';
import get from 'lodash/get';
import map from 'lodash/map';
import React from 'react';
import { default as CompositeField } from '../../fields/CompositeField';
import { FieldComponents } from '../../index';
import { default as fieldRenderMap } from '../../model/defaultFieldRenderMap';
import { default as defaultTheme } from '../../model/defaultTheme';
import { FixedProps, Schema } from '../../types';
import { buildFormState, fieldRenderer, resolveFieldConfig } from '../../util/fieldRenderer';
import Wrapper from '../Wrapper';
import createSchema from '../schemaFactory';

const createPlainComposite = createSchema({
  personalDetails: {
    type: FieldComponents.COMPOSITE,
    fields: {
      firstName: {
        type: FieldComponents.INPUT,
      },
      lastName: {
        type: FieldComponents.INPUT,
      },
      email: {
        type: FieldComponents.INPUT,
      },
      biography: {
        type: FieldComponents.TEXTAREA,
        charcount: 500,
      },
    },
  },
});

const createNestedRepeatable = createSchema({
  personalDetails: { 
    type: FieldComponents.COMPOSITE,
    fields: {
      firstName: {
        type: FieldComponents.INPUT,
      },
      lastName: {
        type: FieldComponents.INPUT,
      },
      email: {
        type: FieldComponents.INPUT,
      },
      biography: {
        type: FieldComponents.TEXTAREA,
      },
      links: { 
        type: FieldComponents.REPEATABLE,
        field: { 
          type: FieldComponents.SELECT,
          initialValue: 'facebook',
          options: [
            { text: 'Facebook', value: 'facebook' },
            { text: 'Instagram', value: 'insta' },
            { text: 'Twitter', value: 'twitter' },
            { text: 'Snapchat', value: 'snapchat' },
          ]
        },
      },
    },
  },
});

const createNestedComposite = createSchema({
  teamDetails: { 
    type: FieldComponents.COMPOSITE,
    fields: {
      testerChan: createNestedRepeatable().personalDetails,
      melvinLee: createNestedRepeatable().personalDetails,
    },
  },
});

describe('<CompositeField />', () => {
  it('should render all child fields', () => {
    const wrapper = mount(
      <Wrapper formData={{}} schema={createPlainComposite()} />
    );

    expect(wrapper.find('TextInput')).toHaveLength(3);
    expect(wrapper.find('Textarea')).toHaveLength(1);
  });

  it('should render with preloaded data', () => {
    const data = {
      personalDetails: {
        firstName: 'tester',
        lastName: 'chan',
        email: 'tester.chan@techinasia.com',
        biography: 'I am a tester, my surname is Chan',
      },
    };

    const wrapper = mount(
      <Wrapper formData={data} schema={createPlainComposite()} />
    );

    expect(wrapper.find('input[name="firstName"]').instance().value).toBe(data.personalDetails.firstName);
    expect(wrapper.find('input[name="lastName"]').instance().value).toBe(data.personalDetails.lastName);
    expect(wrapper.find('input[name="email"]').instance().value).toBe(data.personalDetails.email);
    expect(wrapper.find('textarea[name="biography"]').instance().value).toBe(data.personalDetails.biography);
  });

  it('should update formData', () => {
    const wrapper = mount(
      <Wrapper formData={{}} schema={createPlainComposite()} />
    );

    const firstNameInput = wrapper.find('input[name="firstName"]');
    firstNameInput.instance().value = 'tester';
    firstNameInput.simulate('change');

    expect(wrapper.state('data').personalDetails.firstName).toEqual('tester');
  });

  it('should render nested repeatable fields', () => {
    const wrapper = mount(
      <Wrapper formData={{}} schema={createNestedRepeatable()} />
    );

    expect(wrapper.find('RepeatableField')).toHaveLength(1);
  });

  it('should recursively render nested composite fields', () => {
    const wrapper = mount(
      <Wrapper formData={{}} schema={createNestedComposite()} />
    );

    expect(wrapper.find('CompositeField[name="testerChan"]')).toHaveLength(1);
    expect(wrapper.find('CompositeField[name="melvinLee"]')).toHaveLength(1);
  });
});
