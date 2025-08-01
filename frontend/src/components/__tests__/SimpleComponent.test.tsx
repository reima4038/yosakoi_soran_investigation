import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Simple component for testing
const SimpleButton: React.FC<{
  onClick: () => void;
  children: React.ReactNode;
}> = ({ onClick, children }) => <button onClick={onClick}>{children}</button>;

const SimpleForm: React.FC<{
  onSubmit: (data: { name: string; email: string }) => void;
}> = ({ onSubmit }) => {
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, email });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type='text'
        placeholder='Name'
        value={name}
        onChange={e => setName(e.target.value)}
        data-testid='name-input'
      />
      <input
        type='email'
        placeholder='Email'
        value={email}
        onChange={e => setEmail(e.target.value)}
        data-testid='email-input'
      />
      <button type='submit'>Submit</button>
    </form>
  );
};

const SimpleList: React.FC<{
  items: string[];
  onItemClick: (item: string) => void;
}> = ({ items, onItemClick }) => (
  <ul>
    {items.map((item, index) => (
      <li
        key={index}
        onClick={() => onItemClick(item)}
        data-testid={`item-${index}`}
      >
        {item}
      </li>
    ))}
  </ul>
);

describe('Simple Components', () => {
  describe('SimpleButton', () => {
    it('should render button with text', () => {
      const mockClick = jest.fn();
      render(<SimpleButton onClick={mockClick}>Click me</SimpleButton>);

      expect(screen.getByText('Click me')).toBeInTheDocument();
    });

    it('should call onClick when clicked', () => {
      const mockClick = jest.fn();
      render(<SimpleButton onClick={mockClick}>Click me</SimpleButton>);

      fireEvent.click(screen.getByText('Click me'));
      expect(mockClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('SimpleForm', () => {
    it('should render form inputs', () => {
      const mockSubmit = jest.fn();
      render(<SimpleForm onSubmit={mockSubmit} />);

      expect(screen.getByTestId('name-input')).toBeInTheDocument();
      expect(screen.getByTestId('email-input')).toBeInTheDocument();
      expect(screen.getByText('Submit')).toBeInTheDocument();
    });

    it('should update input values', () => {
      const mockSubmit = jest.fn();
      render(<SimpleForm onSubmit={mockSubmit} />);

      const nameInput = screen.getByTestId('name-input') as HTMLInputElement;
      const emailInput = screen.getByTestId('email-input') as HTMLInputElement;

      fireEvent.change(nameInput, { target: { value: 'John Doe' } });
      fireEvent.change(emailInput, { target: { value: 'john@example.com' } });

      expect(nameInput.value).toBe('John Doe');
      expect(emailInput.value).toBe('john@example.com');
    });

    it('should submit form with correct data', () => {
      const mockSubmit = jest.fn();
      render(<SimpleForm onSubmit={mockSubmit} />);

      const nameInput = screen.getByTestId('name-input');
      const emailInput = screen.getByTestId('email-input');
      const submitButton = screen.getByText('Submit');

      fireEvent.change(nameInput, { target: { value: 'John Doe' } });
      fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
      fireEvent.click(submitButton);

      expect(mockSubmit).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com',
      });
    });
  });

  describe('SimpleList', () => {
    const mockItems = ['Item 1', 'Item 2', 'Item 3'];

    it('should render list items', () => {
      const mockClick = jest.fn();
      render(<SimpleList items={mockItems} onItemClick={mockClick} />);

      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('Item 3')).toBeInTheDocument();
    });

    it('should handle item clicks', () => {
      const mockClick = jest.fn();
      render(<SimpleList items={mockItems} onItemClick={mockClick} />);

      fireEvent.click(screen.getByText('Item 2'));
      expect(mockClick).toHaveBeenCalledWith('Item 2');
    });

    it('should handle empty list', () => {
      const mockClick = jest.fn();
      render(<SimpleList items={[]} onItemClick={mockClick} />);

      expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
    });
  });
});
