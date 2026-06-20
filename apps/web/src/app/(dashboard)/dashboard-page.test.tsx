/**
 * Tests for the Dashboard (Candidate Pipeline) page.
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 12.5, 12.6
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CandidateStatus } from '@rove-hire/shared';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock graphql-request
vi.mock('graphql-request', () => ({
  gql: (strings: TemplateStringsArray) => strings.join(''),
  GraphQLClient: vi.fn().mockImplementation(() => ({
    request: vi.fn(),
  })),
}));

// Mock graphql-client
const mockRequest = vi.fn();
vi.mock('@/lib/graphql-client', () => ({
  graphqlClient: { request: (...args: unknown[]) => mockRequest(...args) },
  handleGraphQLError: vi.fn(),
  classifyError: vi.fn(),
}));

// Mock optimistic-updates
vi.mock('@/lib/optimistic-updates', () => ({
  resolveDisplayStatus: (_id: string, status: CandidateStatus) => status,
  registerOptimisticUpdate: vi.fn(),
  getOptimisticStatus: vi.fn(),
  hasPendingUpdate: vi.fn(),
  subscribeToOptimisticUpdates: vi.fn(() => () => {}),
  clearAllPendingUpdates: vi.fn(),
}));

import DashboardPage from './page';

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
}

function renderDashboard() {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <DashboardPage />
    </QueryClientProvider>,
  );
}

const mockCandidates = [
  {
    id: '1',
    name: 'Alice Johnson',
    email: 'alice@test.com',
    currentRole: 'Senior Developer',
    status: CandidateStatus.Applied,
    lastActivityAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    jobOpeningId: 'job-1',
  },
  {
    id: '2',
    name: 'Bob Smith',
    email: 'bob@test.com',
    currentRole: 'Product Manager',
    status: CandidateStatus.InterviewScheduled,
    lastActivityAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    jobOpeningId: 'job-2',
  },
  {
    id: '3',
    name: 'Carol White',
    email: 'carol@test.com',
    currentRole: null,
    status: CandidateStatus.Hired,
    lastActivityAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    jobOpeningId: 'job-1',
  },
];

const mockPaginatedResult = {
  candidates: {
    items: mockCandidates,
    total: 3,
    page: 1,
    pageSize: 20,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest.mockResolvedValue(mockPaginatedResult);
  });

  it('shows loading skeleton initially', () => {
    // Delay the response to observe loading state
    mockRequest.mockReturnValue(new Promise(() => {}));
    renderDashboard();

    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
  });

  it('renders candidate list with name, role, status badge, and timestamp', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    expect(screen.getAllByText('Senior Developer').length).toBeGreaterThan(0);
    expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    expect(screen.getAllByText('Product Manager').length).toBeGreaterThan(0);
    expect(screen.getByText('Carol White')).toBeInTheDocument();

    // Status badges
    expect(screen.getByText('Applied')).toBeInTheDocument();
    expect(screen.getByText('Interview Scheduled')).toBeInTheDocument();
    expect(screen.getByText('Hired')).toBeInTheDocument();

    // Relative timestamps
    expect(screen.getByText(/2 hours ago/i)).toBeInTheDocument();
  });

  it('shows empty state with CTA when no candidates', async () => {
    mockRequest.mockResolvedValue({
      candidates: {
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('No candidates found')).toBeInTheDocument();
    });

    const addLink = screen.getByRole('link', { name: /add candidate/i });
    expect(addLink).toBeInTheDocument();
    expect(addLink).toHaveAttribute('href', '/candidates/new');
  });

  it('shows error state with retry button on fetch failure', async () => {
    mockRequest.mockRejectedValue(new Error('Network error'));

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Failed to load candidates')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('retries fetch when retry button is clicked', async () => {
    mockRequest.mockRejectedValueOnce(new Error('Network error'));
    mockRequest.mockResolvedValueOnce(mockPaginatedResult);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Failed to load candidates')).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole('button', { name: /try again/i });
    await act(async () => {
      fireEvent.click(retryBtn);
    });

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });
  });

  it('navigates to candidate profile on row click', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    const row = screen.getByRole('row', { name: /alice johnson/i });
    fireEvent.click(row);

    expect(mockPush).toHaveBeenCalledWith('/candidates/1');
  });

  it('navigates to candidate profile on Enter key', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    const row = screen.getByRole('row', { name: /alice johnson/i });
    fireEvent.keyDown(row, { key: 'Enter' });

    expect(mockPush).toHaveBeenCalledWith('/candidates/1');
  });

  it('renders search input with correct attributes', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    const searchInput = screen.getByRole('searchbox');
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveAttribute('maxlength', '100');
  });

  it('renders page header', () => {
    renderDashboard();

    expect(screen.getByText('Candidate Pipeline')).toBeInTheDocument();
    expect(screen.getByText(/manage and track candidates/i)).toBeInTheDocument();
  });

  it('renders status filter button', () => {
    renderDashboard();

    expect(screen.getByRole('button', { name: /filter by status/i })).toBeInTheDocument();
  });

  it('shows dash for candidate without a role', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Carol White')).toBeInTheDocument();
    });

    // Carol has no currentRole, so should show '—'
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThan(0);
  });
});

describe('Pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not show pagination when only one page', async () => {
    mockRequest.mockResolvedValue(mockPaginatedResult); // 3 items, 1 page

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    expect(screen.queryByRole('navigation', { name: /pagination/i })).not.toBeInTheDocument();
  });

  it('shows pagination when multiple pages exist', async () => {
    mockRequest.mockResolvedValue({
      candidates: {
        items: mockCandidates,
        total: 45,
        page: 1,
        pageSize: 20,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: false,
      },
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByRole('navigation', { name: /pagination/i })).toBeInTheDocument();
    });

    // Text is split across multiple span elements; use a function matcher
    expect(
      screen.getByText((_, element) => {
        return element?.textContent === 'Showing 1 to 20 of 45 candidates';
      }),
    ).toBeInTheDocument();
  });
});
