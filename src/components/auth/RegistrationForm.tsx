import React, { useState } from 'react';
import styled from 'styled-components';

interface RegistrationFormProps {
  onSubmit: (data: RegistrationData) => Promise<void>;
}

interface RegistrationData {
  email: string;
  username: string;
  password: string;
}

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 400px;
  margin: 0 auto;
  padding: 2rem;
`;

const Input = styled.input`
  padding: 0.5rem;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 4px;
  font-size: 1rem;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
  }
`;

const Button = styled.button`
  padding: 0.75rem;
  background-color: ${props => props.theme.colors.primary};
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${props => props.theme.colors.primaryDark};
  }

  &:disabled {
    background-color: ${props => props.theme.colors.disabled};
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  color: ${props => props.theme.colors.error};
  font-size: 0.875rem;
  margin-top: 0.25rem;
`;

export const RegistrationForm: React.FC<RegistrationFormProps> = ({ onSubmit }) => {
  const [formData, setFormData] = useState<RegistrationData>({
    email: '',
    username: '',
    password: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    }

    if (!formData.username) {
      newErrors.username = 'Username is required';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(formData);
    } catch (error) {
      setErrors({
        submit: 'Registration failed. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <div>
        <Input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          disabled={isSubmitting}
          aria-label="Email"
        />
        {errors.email && <ErrorMessage>{errors.email}</ErrorMessage>}
      </div>

      <div>
        <Input
          type="text"
          name="username"
          placeholder="Username"
          value={formData.username}
          onChange={handleChange}
          disabled={isSubmitting}
          aria-label="Username"
        />
        {errors.username && <ErrorMessage>{errors.username}</ErrorMessage>}
      </div>

      <div>
        <Input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          disabled={isSubmitting}
          aria-label="Password"
        />
        {errors.password && <ErrorMessage>{errors.password}</ErrorMessage>}
      </div>

      {errors.submit && <ErrorMessage>{errors.submit}</ErrorMessage>}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Registering...' : 'Register'}
      </Button>
    </Form>
  );
};
