import React from 'react';
import Form from '../core/Form';
import { Theme, Schema, FormData } from '../types';
import { CustomValidatorDictionary } from '../model/validator';

interface Props {
  formData?: FormData;
  schema: Schema;
  onSubmit?: (data: any) => void;
  theme?: Theme;
  validators?: CustomValidatorDictionary;
  template?: React.Component<any>;
}

interface State {
  data: FormData;
}

class Wrapper extends React.Component<Props, State> {
  state: State = { data: {} };

  updateFormData = (data: FormData) => {
    this.setState({ data });
  };

  render() {
    const { onSubmit, schema, formData = {}, template, theme, validators } = this.props;
    const { data } = this.state;

    return !!template ? (
      <Form
        validators={validators}
        schema={schema}
        formData={{ ...formData, ...data }}
        theme={theme}
        updateFormData={this.updateFormData}
        handleSubmit={onSubmit}
      >
        {template}
      </Form>
    ) : (
      <Form
        validators={validators}
        schema={schema}
        formData={{ ...formData, ...data }}
        theme={theme}
        updateFormData={this.updateFormData}
        handleSubmit={onSubmit}
      />
    );
  }
}

export default Wrapper;
