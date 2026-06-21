import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OfferGenerationForm } from './offer-generation-form';

// Mock the graphql-client
vi.mock('@/lib/graphql-client', () => ({
  graphqlClient: {
    request: vi.fn(),
  },
  handleGraphQLError: vi.fn((error) => ({
    type: 'INTERNAL_ERROR',
    message: 'Generation failed',
  })),
  classifyError: vi.fn((error) => ({
    type: 'INTERNAL_ERROR',
    message: 'An error occurred',
  })),
}));

// Mock showToast
vi.mock('@/components/shared', () => ({
  showToast: vi.fn(),
}));

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = createTestQueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const defaultProps = {
  candidateId: 'candidate-123',
  candidateName: 'John Doe',
  onSuccess: vi.fn(),
  onCancel: vi.fn(),
};

describe('OfferGenerationForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the form with all required fields', () => {
      renderWithProviders(<OfferGenerationForm {...defaultProps} />);

      expect(screen.getByLabelText(/role title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/currency/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/salary amount/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/reporting manager/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
    });

    it('renders submit and cancel buttons', () => {
      renderWithProviders(<OfferGenerationForm {...defaultProps} />);

      expect(screen.getByRole('button', { name: /generate offer documents/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('displays candidate name in the description', () => {
      renderWithProviders(<OfferGenerationForm {...defaultProps} />);

      expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    });

    it('renders all supported currencies in the dropdown', () => {
      renderWithProviders(<OfferGenerationForm {...defaultProps} />);

      const select = screen.getByLabelText(/currency/i) as HTMLSelectElement;
      const options = Array.from(select.options).map((opt) => opt.value);
      expect(options).toEqual(['USD', 'EUR', 'GBP', 'INR', 'AED']);
    });
  });

  describe('Client-side Validation', () => {
    it('shows error when role title is empty on blur', () => {
      renderWithProviders(<OfferGenerationForm {...defaultProps} />);

      const input = screen.getByLabelText(/role title/i);
      fireEvent.blur(input);

      expect(screen.getByText('Role title is required')).toBeInTheDocument();
    });

    it('shows error when salary amount is empty on blur', () => {
      renderWithProviders(<OfferGenerationForm {...defaultProps} />);

      const input = screen.getByLabelText(/salary amount/i);
      fireEvent.blur(input);

      expect(screen.getByText('Salary amount is required')).toBeInTheDocument();
    });

    it('shows error when salary is below minimum (0.01)', () => {
      renderWithProviders(<OfferGenerationForm {...defaultProps} />);

      const input = screen.getByLabelText(/salary amount/i);
      fireEvent.change(input, { target: { value: '0' } });
      fireEvent.blur(input);

      expect(screen.getByText(/salary must be at least/i)).toBeInTheDocument();
    });

    it('shows error when salary exceeds maximum (9,999,999.99)', () => {
      renderWithProviders(<OfferGenerationForm {...defaultProps} />);

      const input = screen.getByLabelText(/salary amount/i);
      fireEvent.change(input, { target: { value: '10000000' } });
      fireEvent.blur(input);

      expect(screen.getByText(/salary must not exceed/i)).toBeInTheDocument();
    });

    it('shows error when salary has more than 2 decimal places', () => {
      renderWithProviders(<OfferGenerationForm {...defaultProps} />);

      const input = screen.getByLabelText(/salary amount/i);
      fireEvent.change(input, { target: { value: '100.123' } });
      fireEvent.blur(input);

      expect(screen.getByText(/at most 2 decimal places/i)).toBeInTheDocument();
    });

    it('shows error when start date is in the past', () => {
      renderWithProviders(<OfferGenerationForm {...defaultProps} />);

      const input = screen.getByLabelText(/start date/i);
      fireEvent.change(input, { target: { value: '2020-01-01' } });
      fireEvent.blur(input);

      expect(screen.getByText(/start date must be today or in the future/i)).toBeInTheDocument();
    });

    it('shows error when reporting manager is empty on blur', () => {
      renderWithProviders(<OfferGenerationForm {...defaultProps} />);

      const input = screen.getByLabelText(/reporting manager/i);
      fireEvent.blur(input);

      expect(screen.getByText('Reporting manager is required')).toBeInTheDocument();
    });

    it('shows error when location is empty on blur', () => {
      renderWithProviders(<OfferGenerationForm {...defaultProps} />);

      const input = screen.getByLabelText(/location/i);
      fireEvent.blur(input);

      expect(screen.getByText('Location is required')).toBeInTheDocument();
    });

    it('shows all errors when form is submitted empty', () => {
      renderWithProviders(<OfferGenerationForm {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /generate offer documents/i }));

      expect(screen.getByText('Role title is required')).toBeInTheDocument();
      expect(screen.getByText('Salary amount is required')).toBeInTheDocument();
      expect(screen.getByText('Start date is required')).toBeInTheDocument();
      expect(screen.getByText('Reporting manager is required')).toBeInTheDocument();
      expect(screen.getByText('Location is required')).toBeInTheDocument();
    });

    it('clears error when valid input is provided after blur', () => {
      renderWithProviders(<OfferGenerationForm {...defaultProps} />);

      const input = screen.getByLabelText(/role title/i);
      fireEvent.blur(input);
      expect(screen.getByText('Role title is required')).toBeInTheDocument();

      fireEvent.change(input, { target: { value: 'Engineer' } });
      expect(screen.queryByText('Role title is required')).not.toBeInTheDocument();
    });
  });

  describe('Cancel button', () => {
    it('calls onCancel when cancel button is clicked', () => {
      const onCancel = vi.fn();
      renderWithProviders(<OfferGenerationForm {...defaultProps} onCancel={onCancel} />);

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(onCancel).toHaveBeenCalledOnce();
    });
  });

  describe('Form submission', () => {
    it('does not submit when validation fails', async () => {
      const { graphqlClient } = await import('@/lib/graphql-client');
      renderWithProviders(<OfferGenerationForm {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /generate offer documents/i }));

      expect(graphqlClient.request).not.toHaveBeenCalled();
    });

    it('submits valid form data and shows loading state', async () => {
      const { graphqlClient } = await import('@/lib/graphql-client');
      (graphqlClient.request as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise(() => {}), // never resolves to test loading state
      );

      renderWithProviders(<OfferGenerationForm {...defaultProps} />);

      // Fill in all fields
      fireEvent.change(screen.getByLabelText(/role title/i), {
        target: { value: 'Senior Engineer' },
      });
      fireEvent.change(screen.getByLabelText(/salary amount/i), {
        target: { value: '150000' },
      });
      // Use a future date
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);
      const futureDateStr = futureDate.toISOString().split('T')[0];
      fireEvent.change(screen.getByLabelText(/start date/i), {
        target: { value: futureDateStr },
      });
      fireEvent.change(screen.getByLabelText(/reporting manager/i), {
        target: { value: 'Jane Smith' },
      });
      fireEvent.change(screen.getByLabelText(/location/i), {
        target: { value: 'Dubai, UAE' },
      });

      fireEvent.click(screen.getByRole('button', { name: /generate offer documents/i }));

      await waitFor(() => {
        expect(screen.getByText(/generating offer documents/i)).toBeInTheDocument();
      });
    });

    it('shows success state with download links on successful generation', async () => {
      const { graphqlClient } = await import('@/lib/graphql-client');
      (graphqlClient.request as ReturnType<typeof vi.fn>).mockResolvedValue({
        generateOfferDocuments: {
          offerLetterUrl: 'https://s3.example.com/offer.pdf',
          ndaUrl: 'https://s3.example.com/nda.pdf',
          offerLetterId: 'doc-1',
          ndaId: 'doc-2',
        },
      });

      renderWithProviders(<OfferGenerationForm {...defaultProps} />);

      // Fill in all fields
      fireEvent.change(screen.getByLabelText(/role title/i), {
        target: { value: 'Senior Engineer' },
      });
      fireEvent.change(screen.getByLabelText(/salary amount/i), {
        target: { value: '150000' },
      });
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);
      const futureDateStr = futureDate.toISOString().split('T')[0];
      fireEvent.change(screen.getByLabelText(/start date/i), {
        target: { value: futureDateStr },
      });
      fireEvent.change(screen.getByLabelText(/reporting manager/i), {
        target: { value: 'Jane Smith' },
      });
      fireEvent.change(screen.getByLabelText(/location/i), {
        target: { value: 'Dubai, UAE' },
      });

      fireEvent.click(screen.getByRole('button', { name: /generate offer documents/i }));

      await waitFor(() => {
        expect(screen.getByText(/offer documents generated/i)).toBeInTheDocument();
      });

      // Verify download links
      expect(screen.getByRole('link', { name: /download offer letter/i })).toHaveAttribute(
        'href',
        'https://s3.example.com/offer.pdf',
      );
      expect(screen.getByRole('link', { name: /download nda/i })).toHaveAttribute(
        'href',
        'https://s3.example.com/nda.pdf',
      );
    });
  });
});
