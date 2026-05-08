
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  date_raw text,
  town text,
  county text,
  region text,
  distance_type text,
  entry_fee text,
  organiser text,
  url text,
  latitude float8,
  longitude float8,
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events are viewable by everyone"
  ON public.events FOR SELECT
  USING (true);

INSERT INTO public.events (name, date_raw, town, county, region, distance_type, entry_fee, organiser, url, latitude, longitude, is_featured) VALUES
('London Landmarks Half Marathon', '5 Apr 2026', 'London', 'Greater London', 'South East', 'Half Marathon', '£59', 'Tommy''s', 'https://example.com/london-landmarks', 51.5074, -0.1278, true),
('Manchester 10K', '24 May 2026', 'Manchester', 'Greater Manchester', 'North West', '10K', '£35', 'Great Run', 'https://example.com/manchester-10k', 53.4808, -2.2426, false),
('Edinburgh Marathon Festival', '24 May 2026', 'Edinburgh', 'Midlothian', 'Scotland', 'Marathon, Half Marathon, 10K, 5K', '£72', 'Edinburgh Marathon', 'https://example.com/edinburgh', 55.9533, -3.1883, true),
('Bristol Half Marathon', '20 Sep 2026', 'Bristol', 'Bristol', 'South West', 'Half Marathon', '£45', 'Run Bristol', 'https://example.com/bristol-half', 51.4545, -2.5879, false),
('Brighton Trail 10K', '14 Jun 2026', 'Brighton', 'East Sussex', 'South East', '10K, Trail', '£28', 'South Downs Events', 'https://example.com/brighton-trail', 50.8225, -0.1372, false),
('Lake District Ultra 50', '11 Jul 2026', 'Keswick', 'Cumbria', 'North West', 'Ultra, Trail', '£85', 'Lakeland Trails', 'https://example.com/lakeland-50', 54.6013, -3.1347, true),
('Cardiff 5K Series', '7 Jun 2026', 'Cardiff', 'Cardiff', 'Wales', '5K', '£12', 'Run Cardiff', 'https://example.com/cardiff-5k', 51.4816, -3.1791, false),
('Birmingham Half Marathon', '4 Oct 2026', 'Birmingham', 'West Midlands', 'West Midlands', 'Half Marathon', '£42', 'Great Run', 'https://example.com/birmingham-half', 52.4862, -1.8904, false),
('Leeds Abbey Dash 10K', '8 Nov 2026', 'Leeds', 'West Yorkshire', 'Yorkshire', '10K', '£26', 'Run For All', 'https://example.com/abbey-dash', 53.8008, -1.5491, false),
('Snowdonia Trail Marathon', '18 Jul 2026', 'Llanberis', 'Gwynedd', 'Wales', 'Marathon, Trail', '£75', 'Always Aim High', 'https://example.com/snowdonia', 53.1206, -4.1276, false),
('Oxford Town & Gown 10K', '10 May 2026', 'Oxford', 'Oxfordshire', 'South East', '10K, 5K', '£24', 'Muscular Dystrophy UK', 'https://example.com/oxford-tg', 51.7520, -1.2577, false),
('Glasgow Women''s 10K', '14 Jun 2026', 'Glasgow', 'Glasgow', 'Scotland', '10K', '£32', 'Great Run', 'https://example.com/glasgow-womens', 55.8642, -4.2518, false);
