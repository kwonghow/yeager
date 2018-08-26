import { mount } from 'enzyme';
import React from 'react';
import Form from '../../core/Form';
import FieldTypes from '../../model/constants';
import { hasInternalFormId } from '../../util/serializer';

class Wrapper extends React.Component {
  state = { data: {} };

  updateFormData = (data) => {
    this.setState({ data });
  };

  render() {
    const { schema, formData } = this.props;
    const { data } = this.state;

    return <Form schema={schema} formData={{ ...formData, ...data }} updateFormData={this.updateFormData} />;
  }
}

const createSchema = (type) => {
  const baseField = {
    type: FieldTypes.REPEATABLE,
    field: {
      type: FieldTypes.AVATAR,
      initialValue: [{ image: 'https://techinasia.com/someavatar', isNew: false }],
    },
    hasControls: true,
    renderControls: (add) => (
      <button id="add" color="secondary" onClick={add}>
        Add Field
      </button>
    ),
  };

  switch (type) {
    case 'string':
      return {
        test: {
          ...baseField,
          field: {
            type: FieldTypes.INPUT,
            initialValue: 'test string',
            inputType: 'text',
          },
        },
      };
    case 'number':
      return {
        test: {
          ...baseField,
          field: {
            type: FieldTypes.INPUT,
            initialValue: 0,
            inputType: 'text',
          },
        },
      };
    case 'boolean':
      return {
        test: {
          ...baseField,
          field: {
            type: FieldTypes.INPUT,
            initialValue: false,
            inputType: 'text',
          },
        },
      };
    default:
      return { test: baseField };
  }
};

describe('<RepeatableField />', () => {
  describe('adding fields', () => {
    it('should work for number values', () => {
      const schema = createSchema('number');
      let data = {};

      const wrapper = mount(<Wrapper schema={schema} formData={data} />);

      for (let i = 1; i < 3; i++) {
        wrapper.find('button#add').simulate('click');
        wrapper.update();
      }

      expect(wrapper.update().find('TextInput')).toHaveLength(3);
      expect(wrapper.state('data').test).toHaveLength(3);
    });

    it('should work for string values', () => {
      const schema = createSchema('string');
      let data = {};

      const wrapper = mount(<Wrapper schema={schema} formData={data} />);

      for (let i = 1; i < 3; i++) {
        wrapper.find('button#add').simulate('click');
      }

      expect(wrapper.update().find('TextInput')).toHaveLength(3);
      expect(wrapper.state('data').test).toHaveLength(3);
    });

    it('should work for arbitrary values', () => {
      const schema = createSchema();
      let data = {};

      const wrapper = mount(<Wrapper schema={schema} formData={data} />);

      for (let i = 1; i < 3; i++) {
        wrapper.find('button#add').simulate('click');
      }

      expect(wrapper.update().find('AvatarUploadField')).toHaveLength(3);
      expect(wrapper.state('data').test).toHaveLength(3);
    });

    it('should add unique values', () => {
      const schema = createSchema();
      let data = {};

      const wrapper = mount(<Wrapper schema={schema} formData={data} />);

      for (let i = 1; i < 3; i++) {
        wrapper.find('button#add').simulate('click');
      }

      wrapper
        .update()
        .state('data')
        .test.forEach((val) => {
          expect(hasInternalFormId(val)).toBe(true);
        });
    });

    it('should work with user-supplied formData', () => {
      const schema = createSchema('string');
      let data = {
        test: ['value1', 'value2'],
      };

      const wrapper = mount(<Wrapper schema={schema} formData={data} />);

      wrapper.find('input[type="text"]').forEach((input, idx) => {
        input.instance().value = `changed${idx}`;
        input.simulate('change');
      });

      expect(wrapper.state('data').test).toHaveLength(2);
      wrapper.state('data').test.forEach((value, idx) => {
        expect(value).toEqual(`changed${idx}`);
      });
    });
  });
});
