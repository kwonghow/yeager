import { mount } from 'enzyme';
import set from 'lodash/fp/set';
import map from 'lodash/map';
import React from 'react';

import FieldTypes from '../../model/constants';
import Wrapper from '../Wrapper';


const mockWrapperConfig = {
  className: 'mock-custom-classname',
  component: ({ children, className }) =>
    <div className={className}>
      {children}
    </div>,
};

const schema = {
  firstName: {
    type: FieldTypes.INPUT,
    onUpdate: jest.fn(),
    onBlur: jest.fn(),
  },
  lastName: {
    type: FieldTypes.INPUT,
    wrapperConfig: mockWrapperConfig,
  },
  receiveNewsletter: {
    type: FieldTypes.CHECKBOX,
  },
  country: {
    type: FieldTypes.SELECT,
    options: [
      { text: 'Singapore', value: '1' },
      { text: 'Malaysia', value: '2' },
    ],
  },
};

describe('<Form />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render arbitrary fields', () => {
    const wrapper = mount(<Wrapper schema={schema} />);

    expect(wrapper.contains([<input />, <select />, <checkbox />]));
  });

  it('should render custom wrappers', () => {
    const wrapper = mount(<Wrapper schema={schema} />);

    expect(wrapper.find('.mock-custom-classname').exists()).toBe(true);
  });

  it('should render a default template', () => {
    const wrapper = mount(<Wrapper schema={schema} />);

    expect(wrapper.find('form').exists()).toBe(true);
  });

  it('should render a custom template', () => {
    const CustomWrapper = fields =>
      <div className="custom-form-wrapper">
        <h1>I'm a header</h1>
        {map(fields, field => field)}
      </div>;

    const wrapper = mount(
      <Wrapper schema={schema} template={CustomWrapper} />
    );

    expect(wrapper.find('h1').text()).toBe("I'm a header");
  });

  it('should populate formData when first mounted', () => {
    const wrapper = mount(
      <Wrapper schema={schema} formData={{}} />
    );

    const populated = wrapper.state('data');

    Object.keys(schema).forEach((key) => {
      expect(populated).toHaveProperty(key);
    });
  });

  it('should re-populate missing fields in formData when schema is changed', () => {
    const wrapper = mount(
      <Wrapper schema={schema} formData={{}} />
    );

    const newSchema = { ...schema, newKey: 'newValue' };
    const newWrapper = wrapper.setProps({ ...wrapper.props(), schema: newSchema });

    const populated = newWrapper.state('data');

    Object.keys(schema).forEach((key) => {
      expect(populated).toHaveProperty(key);
    });
  });

  it('should update field config when it changes', () => {
    const dynamicSchema = {
      keywords: {
        label: <span>Foo Bar</span>,
        type: FieldTypes.INPUT,
      },
    };

    const wrapper = mount(<Wrapper schema={dynamicSchema} />);
    expect(wrapper.findWhere((node) => node.type() === 'span' && node.text() === 'Foo Bar').length).toBeTruthy();

    const newSchema = set('keywords.label', <span>Baz Qux</span>, dynamicSchema);
    const newWrapper = wrapper.setProps({ schema: newSchema });
    expect(newWrapper.findWhere((node) => node.type() === 'span' && node.text() === 'Foo Bar').length).toBeFalsy();
    expect(newWrapper.findWhere((node) => node.type() === 'span' && node.text() === 'Baz Qux').length).toBeTruthy();
  });
});
