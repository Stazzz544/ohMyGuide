import { buildQuery, publicGet } from './public-client';

const WIKI_API_URL = 'https://ru.wikipedia.org/w/api.php';
const EXTRACT_MAX_CHARS = 1200;

type ExtractResponse = {
  query?: {
    pages?: Record<string, { extract?: string }>;
  };
};

export const fetchWikiExtractApi = async (title: string): Promise<string> => {
  const params = buildQuery({
    action: 'query',
    titles: title,
    prop: 'extracts',
    exintro: '1',
    explaintext: '1',
    exchars: String(EXTRACT_MAX_CHARS),
    redirects: '1',
    format: 'json',
  });
  const data = await publicGet<ExtractResponse>({ url: `${WIKI_API_URL}?${params}` });
  const page = Object.values(data.query?.pages ?? {})[0];

  return (page?.extract ?? '').replace(/\s+/g, ' ').trim();
};
