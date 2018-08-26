import Validator from '../../model/validator';

describe('Validator', () => {
  it('should validate plain values', () => {
    const validator = new Validator();
    const data = 'too_short';
    const constraints = {
      length: {
        minimum: 15,
      },
    };
    const expected = ['is too short (minimum is 15 characters)']

    expect(validator.validate(data, constraints)).toEqual(expected);
  });

  it('should validate objects', () => {
    const validator = new Validator();
    const data = {
      foo: 'foo',
      bar: 'bar',
    };

    const constraints = {
      foo: {
        length: {
          minimum: 15,
        },
      },
      bar: {
        numericality: true,
      },
    };

    const expected = ['Foo is too short (minimum 15 characters)', 'Bar is not a number'];

    const errors = validator.validate(data, constraints);

    expect(errors).toEqual(errors);
  });

  it('should take custom validators', () => {
    const data = 'not_ian';
    const custom = {
      topkek: (value, options, key, attributes) => 'is not Ian',
    };
    const validator = new Validator(custom);
    const constraints = { topkek: true };
    const expected = ['is not Ian'];

    expect(validator.validate(data, constraints)).toEqual(expected);
  });
});
