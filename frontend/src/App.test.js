import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders SecureChat heading', () => {
  render(<App />);
  const heading = screen.getByText(/SecureChat/i);
  expect(heading).toBeInTheDocument();
});
