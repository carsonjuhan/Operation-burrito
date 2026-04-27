import { render, screen } from '@testing-library/react';
import { EmptyState } from '@/components/EmptyState';

describe('EmptyState', () => {
  it('renders the icon, title, and description', () => {
    render(
      <EmptyState
        icon="📦"
        title="No items yet"
        description="Add your first item to get started"
      />
    );

    expect(screen.getByText('📦')).toBeInTheDocument();
    expect(screen.getByText('No items yet')).toBeInTheDocument();
    expect(screen.getByText('Add your first item to get started')).toBeInTheDocument();
  });

  it('renders an optional action element', () => {
    render(
      <EmptyState
        icon="🎁"
        title="Empty registry"
        description="Start adding items"
        action={<button>Add Item</button>}
      />
    );

    expect(screen.getByRole('button', { name: 'Add Item' })).toBeInTheDocument();
  });

  it('does not render action when not provided', () => {
    render(
      <EmptyState
        icon="📋"
        title="Nothing here"
        description="Check back later"
      />
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
