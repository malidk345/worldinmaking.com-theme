
import { postsFetcher } from '../hooks/usePosts';
import { supabase } from '../lib/supabase';

// Mock dependencies
jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('../lib/markdown', () => ({
  stripMarkdown: jest.fn((text) => text),
}));

jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
}));

describe('postsFetcher', () => {
  let mockSelect;
  let mockEq;
  let mockOrder;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup query builder mock chain
    mockOrder = jest.fn().mockResolvedValue({
        data: [{ id: '1', title: 'Test Post', excerpt: 'Test excerpt' }],
        error: null
    });
    mockEq = jest.fn().mockReturnValue({ order: mockOrder });
    mockSelect = jest.fn().mockReturnValue({ eq: mockEq });

    supabase.from.mockReturnValue({ select: mockSelect });
  });

  it('should select specific columns when fetchContent is false', async () => {
    await postsFetcher({ fetchContent: false });

    expect(supabase.from).toHaveBeenCalledWith('posts');
    expect(mockSelect).toHaveBeenCalledWith(
      'id, slug, title, created_at, category, excerpt, author, author_avatar, image_url, published'
    );
  });

  it('should select all columns (*) when fetchContent is true', async () => {
    await postsFetcher({ fetchContent: true });

    expect(supabase.from).toHaveBeenCalledWith('posts');
    expect(mockSelect).toHaveBeenCalledWith('*');
  });

  it('should default to specific columns when no options provided', async () => {
    await postsFetcher();

    expect(mockSelect).toHaveBeenCalledWith(
      'id, slug, title, created_at, category, excerpt, author, author_avatar, image_url, published'
    );
  });
});
