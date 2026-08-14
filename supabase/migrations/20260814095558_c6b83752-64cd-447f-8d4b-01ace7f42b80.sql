-- RENM soft-404 residual occurrence package (approved 2026-08-13).
--
-- Data-only and reversible. Each patch is tied to a stable event UUID and
-- expected slug. The expected subset is a production-drift guard: a patch is
-- either already applied, applied once from the reviewed baseline, or the
-- whole migration aborts. Source identities and source_url values are not
-- changed. Every applied patch writes its exact before/after diff to the
-- existing private event_edits audit table.

DO $renm$
DECLARE
  patch record;
  current_row jsonb;
  field_diff jsonb;
  affected integer;
BEGIN
  FOR patch IN
    SELECT *
    FROM jsonb_to_recordset($patches$
    [
      {"id":"bc54f333-1918-4a88-a473-40e7cd428c17","slug":"athens-authentic-marathon-2","evidence_url":"https://www.athensauthenticmarathon.gr/en/registrations/29-sucnes-eroteseis-%28faq%29","expected":{"status":"ACTIVE","country":"England","county":"International","region":"West Midlands"},"target":{"status":"HIDDEN","country":"Greece","county":"Attica","region":null}},

      {"id":"92a0b167-d208-4721-8c9f-b00a7b522f9c","slug":"dartmoor-way-100-full-circle","evidence_url":"https://findarace.com/events/dartmoor-way-full-circle-100-granite-50","expected":{"name":"Dartmoor Way 100 Full Circle","date_from":"2026-10-02","date_to":"2026-10-02","date_raw":"October 2026","distances":"100 Mile","entry_url":"https://runabc.co.uk/dartmoor-way-100","organiser":null,"organiser_url":null,"organiser_type":"unknown"},"target":{"name":"Dartmoor Way Full Circle 100 & Granite 50","date_from":"2026-10-02","date_to":"2026-10-03","date_raw":"2-3 October 2026","distances":"51 Miles, 106 Miles","entry_url":"https://findarace.com/events/dartmoor-way-full-circle-100-granite-50","organiser":"OuterEdge Events","organiser_url":"https://outeredge-events.com/","organiser_type":"commercial"}},
      {"id":"22748fd6-ab89-4aa0-af3e-11a01b1eb487","slug":"dartmoor-way-granite-50","evidence_url":"https://findarace.com/events/dartmoor-way-full-circle-100-granite-50","expected":{"status":"ACTIVE","duplicate_of":null},"target":{"status":"DUPLICATE","duplicate_of":"92a0b167-d208-4721-8c9f-b00a7b522f9c"}},
      {"id":"b8c1ae79-1526-4108-877f-3a7a2a6c8c02","slug":"dartmoor-way-granite-50-dartmoor-2026","evidence_url":"https://findarace.com/events/dartmoor-way-full-circle-100-granite-50","expected":{"duplicate_of":"22748fd6-ab89-4aa0-af3e-11a01b1eb487"},"target":{"duplicate_of":"92a0b167-d208-4721-8c9f-b00a7b522f9c"}},

      {"id":"07c9874c-0bd3-46e9-902e-cc8b48283b6b","slug":"the-cardiff-morun-cardiff-2026","evidence_url":"https://www.mo-running.com/cardiff","expected":{"country":null,"entry_url":null,"organiser_url":null,"organiser_type":"unknown","is_upcoming":false},"target":{"country":"Wales","entry_url":"https://www.mo-running.com/cardiff","organiser_url":"https://www.mo-running.com/cardiff","organiser_type":"commercial","is_upcoming":true}},
      {"id":"07fd66fe-594b-45df-bd9f-1000d1dcbc96","slug":"run-durham-hamsterley-remembrance-day-5-10-miler-2026","evidence_url":"https://runnation.co.uk/races?race_filter%5Bkeyword%5D=hamster","expected":{"organiser":null,"organiser_type":"governing_body"},"target":{"organiser":"Run Nation","organiser_type":"commercial"}},
      {"id":"5b429a1d-fe82-4a09-8ecb-628cb32b246b","slug":"ytrrc-5k-spring-summer-series-september","evidence_url":"https://runabc.co.uk/ytrrc-5k-series-september","expected":{"organiser":null,"organiser_type":"unknown","series_key":null},"target":{"organiser":"Yeovil Town RRC","organiser_type":"club","series_key":"ytrrc-5k-spring-summer-series-2026"}},
      {"id":"b16905df-444f-4c39-aa3e-0c2be7822c49","slug":"gainsborough-morton-10k-half-marathon-2","evidence_url":"https://www.runthrough.co.uk/event/gainsborough-morton-10k-half-marathon-november-2026","expected":{"organiser":null,"organiser_type":"unknown","race_profile":"other","terrain_tags":[]},"target":{"organiser":"RunThrough","organiser_type":"commercial","race_profile":"road_race","terrain_tags":["road"]}},
      {"id":"c47ef058-b844-4505-8665-d74a9bf9b38d","slug":"chepstow-running-festival-august-2","evidence_url":"https://www.chepstowrunningfestival.com/race-information/","expected":{"country":"England","organiser":null,"organiser_url":"https://www.runthrough.co.uk/event/chepstow-running-festival-august-2026","organiser_type":"unknown","governance":"unknown","race_profile":"other","terrain_tags":[]},"target":{"country":"Wales","organiser":"RunThrough","organiser_url":"https://www.chepstowrunningfestival.com/","organiser_type":"commercial","governance":"arc","race_profile":"multi_terrain","terrain_tags":["multi-terrain"]}},
      {"id":"29642ed9-6071-4f44-b6e3-18d07d79fb42","slug":"borders-8-hour-challenge","evidence_url":"https://runabc.co.uk/nu-limits-running-borders-8-hour-challenge","expected":{"distances":"Ultra","organiser":null,"organiser_type":"unknown"},"target":{"distances":"8 Hour Challenge (4.366-mile loops)","organiser":"NU Limits Running","organiser_type":"commercial"}},
      {"id":"f50a77f5-1136-4366-8aed-200603aa1163","slug":"dunoon-ultra-marathon-relay","evidence_url":"https://www.entrycentral.com/dunoonultra","expected":{"distances":"Ultra, Relay","entry_url":null,"organiser":null,"organiser_type":"unknown"},"target":{"distances":"52.22K Solo, Relay","entry_url":"https://www.entrycentral.com/dunoonultra","organiser":"Dunoon Presents","organiser_type":"community"}},
      {"id":"788c51dc-7147-4d0f-a7ea-4ae0a4a8e16c","slug":"middlesbrough-10k","evidence_url":"https://eventsofthenorth.com/events/","expected":{"name":"Middlesbrough 10K","distances":"10K","distance_tags":["10k"],"entry_url":"https://runabc.co.uk/middlesbrough-tees-pride-10k","organiser":null,"organiser_type":"unknown"},"target":{"name":"Middlesbrough Runs 5K & 10K","distances":"5K, 10K","distance_tags":["5k","10k"],"entry_url":"https://eventsofthenorth.com/event/middlesbrough-runs/","organiser":"Events of the North","organiser_type":"commercial"}},

      {"id":"4a88168e-5832-484f-837a-e9e8478caa4e","slug":"white-horse-gallop","evidence_url":"https://www.entrycentral.com/event/128400","expected":{"distances":null,"distance_tags":[],"entry_fee":null,"entry_url":"https://runabc.co.uk/white-horse-gallop-8","organiser":null,"organiser_url":null,"organiser_type":"unknown","race_profile":"other","terrain_tags":[]},"target":{"distances":"12K","distance_tags":["various"],"entry_fee":"£23 affiliated / £25 unattached","entry_url":"https://www.entrycentral.com/event/128400","organiser":"Redfish Events","organiser_url":"https://www.entrycentral.com/event/128400","organiser_type":"commercial","race_profile":"trail_race","terrain_tags":["trail"]}},
      {"id":"011b4f0a-6301-4525-a9f5-8738089fa973","slug":"leeds-running-festival-august","evidence_url":"https://www.leedsrunningfestival.com/","expected":{"distances":"Half Marathon, 10K, 5K","distance_tags":["half-marathon","10k","5k"],"entry_url":null,"organiser":null,"organiser_type":"unknown","race_profile":"other","terrain_tags":[]},"target":{"distances":"Junior Race, 5K, 10K, Half Marathon","distance_tags":["fun-run","5k","10k","half-marathon"],"entry_url":"https://www.leedsrunningfestival.com/","organiser":"RunThrough","organiser_type":"commercial","race_profile":"multi_terrain","terrain_tags":["multi-terrain"]}},
      {"id":"e95260e9-eb85-4f5e-a9c6-d9656bbeb621","slug":"ponton-plod","evidence_url":"https://www.sientries.co.uk/event.php?elid=Y&event_id=17200","expected":{"distances":"Mixed Terrain","distance_tags":[],"entry_url":"https://runabc.co.uk/the-ponton-plod-17","organiser":null,"organiser_type":"unknown"},"target":{"distances":"26.4 Miles, 17 Miles, 12 Miles, 10K","distance_tags":["marathon","10-mile","10k","various"],"entry_url":"https://www.sientries.co.uk/event.php?elid=Y&event_id=17200","organiser":"NOTFAST Running Club","organiser_type":"club"}},
      {"id":"05dd39f9-eb4b-45d0-a03c-6eb26141b793","slug":"armada-athletics-network-5k-september","evidence_url":"https://www.armadaathletics.co.uk/armada-events/","expected":{"entry_fee":null,"entry_url":"https://runabc.co.uk/armada-network-5k-september","organiser":null,"organiser_url":null,"organiser_type":"unknown","governance":"unknown","licensed":null,"race_profile":"other","terrain_tags":[],"series_key":null},"target":{"entry_fee":"£3","entry_url":"https://www.armadaathletics.co.uk/armada-events/","organiser":"Armada Athletics Network","organiser_url":"https://www.armadaathletics.co.uk/armada-events/","organiser_type":"club","governance":"england_athletics","licensed":"UKA licence 31079","race_profile":"road_race","terrain_tags":["road"],"series_key":"armada-5k-grand-prix-2026"}},
      {"id":"73f0de2d-e01c-413d-bda6-b16a19f2f668","slug":"othnesberys-revenge","evidence_url":"https://www.sientries.co.uk/event.php?elid=Y&event_id=16774","expected":{"distances":"Fell","distance_tags":[],"entry_url":null,"organiser":null,"organiser_type":"unknown","governance":"unknown","race_profile":"fell_race","terrain_tags":["fell"]},"target":{"distances":"Trail Half Marathon","distance_tags":["half-marathon"],"entry_url":"https://www.sientries.co.uk/event.php?elid=Y&event_id=16774","organiser":"SilverBackTrails","organiser_type":"commercial","governance":"arc","race_profile":"trail_race","terrain_tags":["trail"]}},
      {"id":"5d57c456-4eaf-4c63-b16c-5ec69099311e","slug":"speyside-windfarm-challenge","evidence_url":"https://www.entrycentral.com/speysidewindfarmchallenge","expected":{"distances":"Trail / Ultra","distance_tags":["ultra"],"entry_url":null,"race_profile":"ultra"},"target":{"distances":"Half Marathon, 10K, Children's Mile","distance_tags":["half-marathon","10k","1-mile"],"entry_url":"https://www.entrycentral.com/speysidewindfarmchallenge","race_profile":"trail_race"}},
      {"id":"ab287a93-9062-4d67-9ccf-eb489bcee7bb","slug":"hertfordshire-half-marathon-10k-2","evidence_url":"https://www.hertshalf.com/","expected":{"town":null,"organiser":null,"organiser_url":"https://www.runthrough.co.uk/event/hertfordshire-half-marathon-10k-november-2026","organiser_type":"unknown"},"target":{"town":"Knebworth","organiser":"RunThrough","organiser_url":"https://www.hertshalf.com/","organiser_type":"commercial"}},
      {"id":"03f17657-9d23-415f-adb2-f2dd957a3486","slug":"highland-fling-race","evidence_url":"https://highlandflingrace.org/","expected":{"distances":null,"distance_tags":[],"entry_url":null,"race_profile":"other","terrain_tags":[]},"target":{"distances":"53 Miles (85K)","distance_tags":["ultra"],"entry_url":"https://highlandflingrace.org/","race_profile":"ultra","terrain_tags":["trail"]}},
      {"id":"960a37da-aa80-47f0-ba42-63cd65ca1ea1","slug":"william-wallace-running-festival","evidence_url":"https://www.williamwallacerunningfestival.com/","expected":{"distances":"Ultra","distance_tags":["ultra"],"entry_url":"https://www.runningcalendar.co.uk/event/william-wallace-running-festival/","organiser_url":null},"target":{"distances":"70K, 50K, 10K, 1 Mile, Relay","distance_tags":["ultra","50k","10k","1-mile"],"entry_url":"https://www.williamwallacerunningfestival.com/","organiser_url":"https://www.williamwallacerunningfestival.com/"}},
      {"id":"c07c9136-2494-4b2d-8b2d-3925330664b9","slug":"speyside-way-50k-100k","evidence_url":"https://www.moraywayultras.com/speyside-way-ultra/","expected":{"distances":"Ultra","entry_url":null,"organiser":null},"target":{"distances":"50K, 100K","entry_url":"https://www.moraywayultras.com/speyside-way-ultra/","organiser":"Moray Way Ultras"}},

      {"id":"02a28434-cb2c-41b0-83b1-c3c68b940fa9","slug":"scottish-half-marathon","evidence_url":"https://www.scottishhalfmarathon.com/half/","expected":{"series_key":null},"target":{"series_key":"scottish-half-marathon-10k-2026"}},
      {"id":"d2d7f6f2-08df-4dc8-b10e-2d1ba1da3781","slug":"kirkcaldy-parks-running-festival-half-marathon","evidence_url":"https://kprf.run/","expected":{"name":"Kirkcaldy Parks Running Festival Half Marathon","date_from":"2026-08-30","date_to":"2026-08-30","sort_date":"2026-08-30","distances":"Half Marathon","distance_tags":["half-marathon"],"entry_url":null,"race_profile":"other","terrain_tags":[]},"target":{"name":"Kirkcaldy Parks Running Festival","date_from":"2026-08-29","date_to":"2026-08-30","sort_date":"2026-08-29","distances":"Trail Race, Half Marathon, Fun Run","distance_tags":["half-marathon","fun-run","various"],"entry_url":"https://kprf.run/","race_profile":"multi_terrain","terrain_tags":["multi-terrain"]}},
      {"id":"26e1c747-3e57-483e-989f-57040cf9d2a7","slug":"chelmorton-chase","evidence_url":"https://chelmorton.net/news","expected":{"entry_url":"http://chelmorton.net/news/item/369-chelmorton-five-chase-race-sept-28th-2025","organiser":null,"organiser_url":"http://chelmorton.net/news/item/369-chelmorton-five-chase-race-sept-28th-2025","organiser_type":"governing_body"},"target":{"entry_url":"https://chelmorton.net/news","organiser":"Chelmorton Chase","organiser_url":"https://chelmorton.net/news","organiser_type":"community"}},
      {"id":"a5ce6ce8-5ab9-49d1-b86b-f068ae8545e9","slug":"killin-10k-5k-fun-run","evidence_url":"https://tayfitness.com/events/killin-10k-5k/","expected":{"distances":"10K, 5K, Fun Run","entry_url":null,"organiser":null,"organiser_type":"unknown"},"target":{"distances":"10K, 5K, 1K Fun Run","entry_url":"https://tayfitness.com/events/killin-10k-5k/","organiser":"Tay Fitness","organiser_type":"commercial"}},
      {"id":"8214ab29-71c7-4434-b6be-f30ce7ec3a9a","slug":"scottish-10k","evidence_url":"https://www.scottish10k.com/10k","expected":{"entry_url":"https://findarace.com/events/scottish-10k","organiser_url":"https://nhslothiancharity.org/event/mens-10k/?gad_source=1&gad_campaignid=23825524725&gbraid=0AAAAA9tknWMHRuCRTr6Wp96K4l5STxvX2&gclid=Cj0KCQjw0JnRBhDJARIsALobnXYl5FHgpW-t-gheE1-RGK5w2p4bgPwa5tdA0Anot65XwgYQXtmcIbMaArTyEALw_wcB","series_key":null},"target":{"entry_url":"https://www.scottish10k.com/10k","organiser_url":"https://www.scottish10k.com/10k","series_key":"scottish-half-marathon-10k-2026"}},
      {"id":"5afab94d-f5c4-4d92-965b-8f7fc9c625c1","slug":"perth-10k-festival","evidence_url":"https://www.perth10k.co.uk/","expected":{"entry_url":null,"organiser_url":"http://www.perth10k.co.uk/","race_profile":"other","terrain_tags":[]},"target":{"entry_url":"https://www.perth10k.co.uk/","organiser_url":"https://www.perth10k.co.uk/","race_profile":"road_race","terrain_tags":["road"]}},
      {"id":"929caee5-2023-427b-854a-8f2f9bebbb38","slug":"the-jon-ward-hereford-5k-2026","evidence_url":"https://www.entrycentral.com/JW5K2026","expected":{"organiser":null,"organiser_type":"governing_body"},"target":{"organiser":"Hereford Couriers","organiser_type":"club"}},
      {"id":"d808e034-1038-4277-96ad-8e5bf86be59d","slug":"thorpe-park-5k-10k-september","evidence_url":"https://www.runthrough.co.uk/event/run-thorpe-park-5k-10k-september-2026","expected":{"entry_url":"https://runabc.co.uk/thorpe-park-5k-10k-september","organiser":null,"organiser_url":null,"organiser_type":"unknown"},"target":{"entry_url":"https://www.runthrough.co.uk/event/run-thorpe-park-5k-10k-september-2026","organiser":"RunThrough","organiser_url":"https://www.runthorpepark.com/","organiser_type":"commercial"}},
      {"id":"390f902d-a143-406d-ad88-b63b491d58a2","slug":"littlehampton-10k","evidence_url":"https://run-fest.com/littlehampton/littlehampton-10k/","expected":{"distances":"10 km","distance_tags":["10k"],"organiser":null,"organiser_type":"governing_body"},"target":{"distances":"10K, Family Mile","distance_tags":["10k","1-mile"],"organiser":"RUN-FEST","organiser_type":"commercial"}},
      {"id":"693bb931-f81e-444f-9806-0873451e4103","slug":"flying-monk-malmesbury-10k","evidence_url":"https://www.icompete.co.uk/events/flyingmonkmalmesbury10k2026","expected":{"entry_url":"https://runabc.co.uk/malmesbury-10k","organiser_url":null},"target":{"entry_url":"https://www.icompete.co.uk/events/flyingmonkmalmesbury10k2026","organiser_url":"https://www.icompete.co.uk/events/flyingmonkmalmesbury10k2026"}},
      {"id":"b6e04c31-b208-4e75-8351-28cff307dd0c","slug":"running-grand-prix-oulton-park-august","evidence_url":"https://www.runthrough.co.uk/event/running-gp-oulton-park-august-2026","expected":{"distances":"Marathon, Half Marathon, 10K, 5K","distance_tags":["half-marathon","marathon","10k","5k"],"entry_url":null,"organiser":null,"organiser_type":"unknown","race_profile":"other","terrain_tags":[]},"target":{"distances":"5K, 10K, Half Marathon, 20 Mile, Metric Marathon, Marathon","distance_tags":["5k","10k","half-marathon","20-mile","marathon"],"entry_url":"https://www.runthrough.co.uk/event/running-gp-oulton-park-august-2026","organiser":"RunThrough","organiser_type":"commercial","race_profile":"road_race","terrain_tags":["road"]}},
      {"id":"ff463737-cb14-4f6d-b08e-b4dd2d3dea67","slug":"ten10ten-sheffield","evidence_url":"https://runabc.co.uk/the-sheffield-tententen-10k-endcliffe-park","expected":{"distances":"10K","distance_tags":["10k"],"entry_url":null,"race_profile":"other","terrain_tags":[]},"target":{"distances":"10K, 2.5K Fun Run","distance_tags":["10k","fun-run"],"entry_url":"https://runabc.co.uk/the-sheffield-tententen-10k-endcliffe-park","race_profile":"multi_terrain","terrain_tags":["multi-terrain"]}},
      {"id":"f501249a-04da-4f9f-8043-369ea7c1f4a9","slug":"carsington-water-10k-half-marathon-august","evidence_url":"https://www.runthrough.co.uk/event/carsington-water-half-marathon-10k-august-2026","expected":{"entry_url":"https://runabc.co.uk/carsington-water-10k-half-marathon-august","organiser":null,"organiser_url":null,"organiser_type":"unknown","race_profile":"other","terrain_tags":[]},"target":{"entry_url":"https://www.runthrough.co.uk/event/carsington-water-half-marathon-10k-august-2026","organiser":"RunThrough","organiser_url":"https://www.runthrough.co.uk/event/carsington-water-half-marathon-10k-august-2026","organiser_type":"commercial","race_profile":"trail_race","terrain_tags":["trail"]}},
      {"id":"2404167e-fd08-4de5-a9d2-fa38ad1bff5c","slug":"peterhead-3k-junior-mile-august","evidence_url":"https://www.entrycentral.com/festival/3068","expected":{"distances":"3K, Junior Mile","distance_tags":[],"entry_url":null,"organiser":null,"organiser_type":"unknown","series_key":null},"target":{"distances":"3K, U16 Junior Mile, U12 Junior Mile","distance_tags":["1-mile","various"],"entry_url":"https://www.entrycentral.com/festival/3068","organiser":"Peterhead AC","organiser_type":"club","series_key":"peterhead-3k-junior-mile-series-2026"}},
      {"id":"7ddb4f1b-c94e-4ee0-b3de-70c6534f3710","slug":"kingston-half-marathon","evidence_url":"https://www.kingston.gov.uk/events/kingston-half-marathon","expected":{"organiser":null,"organiser_type":"governing_body","race_profile":"multi_terrain","terrain_tags":["multi-terrain"]},"target":{"organiser":"River Thames Running","organiser_type":"commercial","race_profile":"road_race","terrain_tags":["road"]}},
      {"id":"68559ae2-3765-491e-961f-b1264ca96023","slug":"henley-river-half-marathon-10k-september","evidence_url":"https://www.runthrough.co.uk/event/henley-river-half-marathon-10k-junior-race-september-2026","expected":{"distances":"Half Marathon, 10K","distance_tags":["half-marathon","10k"],"entry_url":"https://runabc.co.uk/henley-half-marathon-river-trail-run-10k-september","organiser":null,"organiser_url":null,"organiser_type":"unknown","race_profile":"other","terrain_tags":[]},"target":{"distances":"Half Marathon, 10K, Junior Race","distance_tags":["half-marathon","10k","fun-run"],"entry_url":"https://www.runthrough.co.uk/event/henley-river-half-marathon-10k-junior-race-september-2026","organiser":"RunThrough","organiser_url":"https://www.runthrough.co.uk/event/henley-river-half-marathon-10k-junior-race-september-2026","organiser_type":"commercial","race_profile":"multi_terrain","terrain_tags":["multi-terrain"]}},
      {"id":"d44a2a5a-b41a-4d89-95e7-f3639012eb6c","slug":"dorney-lake-half-marathon-10k-5k-november","evidence_url":"https://www.runthrough.co.uk/event/run-dorney-lake-half-marathon-10k-5k-november-2026","expected":{"entry_url":"https://runabc.co.uk/dorney-lake-half-marathon-10k-5k-november","organiser":null,"organiser_url":null,"organiser_type":"unknown","race_profile":"other","terrain_tags":[]},"target":{"entry_url":"https://www.runthrough.co.uk/event/run-dorney-lake-half-marathon-10k-5k-november-2026","organiser":"RunThrough","organiser_url":"https://www.runthrough.co.uk/event/run-dorney-lake-half-marathon-10k-5k-november-2026","organiser_type":"commercial","race_profile":"road_race","terrain_tags":["road"]}},
      {"id":"e88b4aee-2255-466f-bc13-51c5da61fbe0","slug":"wirral-10k","evidence_url":"https://www.btrliverpool.com/","expected":{"entry_url":null,"organiser":null,"organiser_type":"unknown"},"target":{"entry_url":"https://www.btrliverpool.com/events/wirral-10k/","organiser":"BTR Liverpool","organiser_type":"commercial"}},
      {"id":"1f01ab9e-375a-4f64-9c5c-2f0aa368820c","slug":"windsor-womens-10k","evidence_url":"https://windsorwomens10k.com/","expected":{"entry_url":"https://runabc.co.uk/boudavida-womens-10k-windsor","organiser_url":null},"target":{"entry_url":"https://windsorwomens10k.com/","organiser_url":"https://windsorwomens10k.com/"}},
      {"id":"882edf99-bd27-47ff-9763-4cf75c90263c","slug":"running-grand-prix-goodwood-october","evidence_url":"https://www.runthrough.co.uk/event/running-gp-at-goodwood-motor-circuit-october-2026","expected":{"distances":"5K, 10K, Half Marathon","distance_tags":["half-marathon","5k","10k"],"entry_url":"https://runabc.co.uk/running-grand-prix-goodwood-5k-10k-half-marathon-october","organiser":null,"organiser_url":null,"organiser_type":"unknown","race_profile":"other","terrain_tags":[]},"target":{"distances":"5K, 10K, Half Marathon, 20 Mile, Metric Marathon, Marathon, 50K","distance_tags":["5k","10k","half-marathon","20-mile","marathon","50k","ultra"],"entry_url":"https://www.runthrough.co.uk/event/running-gp-at-goodwood-motor-circuit-october-2026","organiser":"RunThrough","organiser_url":"https://www.runthrough.co.uk/event/running-gp-at-goodwood-motor-circuit-october-2026","organiser_type":"commercial","race_profile":"road_race","terrain_tags":["road"]}},
      {"id":"c2cb5f7b-1332-4dac-b113-2f4286c3f0ee","slug":"town-moor-exhibition-park-5k-10k-october","evidence_url":"https://www.runthrough.co.uk/event/runthrough-town-moor-exhibition-park-5k-10k-october-2026","expected":{"name":"Town Moor & Exhibition Park 5K & 10K October","distances":"5K, 10K","distance_tags":["5k","10k"],"entry_url":"https://runabc.co.uk/town-moor-exhibition-park-5k-10k-october","organiser":null,"organiser_type":"unknown","race_profile":"other","terrain_tags":[]},"target":{"name":"Town Moor & Exhibition Park Half Marathon, 10K, 5K & Junior Race","distances":"Half Marathon, 10K, 5K, Junior Race","distance_tags":["half-marathon","10k","5k","fun-run"],"entry_url":"https://www.runthrough.co.uk/event/runthrough-town-moor-exhibition-park-5k-10k-october-2026","organiser":"RunThrough","organiser_type":"commercial","race_profile":"multi_terrain","terrain_tags":["multi-terrain"]}},
      {"id":"445dbb5c-7102-4504-818a-30348aabab46","slug":"regents-park-5k-10k-november","evidence_url":"https://www.runthrough.co.uk/event/regents-park-5k-10k-november-2026","expected":{"entry_url":"https://runabc.co.uk/regents-park-5k-10k-november","organiser":null,"organiser_url":null,"organiser_type":"unknown","race_profile":"other","terrain_tags":[]},"target":{"entry_url":"https://www.runthrough.co.uk/event/regents-park-5k-10k-november-2026","organiser":"RunThrough","organiser_url":"https://www.runthrough.co.uk/event/regents-park-5k-10k-november-2026","organiser_type":"commercial","race_profile":"road_race","terrain_tags":["road"]}},
      {"id":"272ae0e8-6719-4b45-8ee4-87d159bbff31","slug":"run-heaton-5k-10k-half-marathon-october","evidence_url":"https://www.runthrough.co.uk/event/run-heaton-park-5k-10k-half-marathon-junior-race-october-2026","expected":{"name":"Run Heaton 5K, 10K & Half Marathon October","distances":"5K, 10K, Half Marathon","distance_tags":["half-marathon","5k","10k"],"organiser":null,"organiser_type":"unknown"},"target":{"name":"Run Heaton 5K, 10K, Half Marathon & Junior Race October","distances":"5K, 10K, Half Marathon, Junior Race","distance_tags":["5k","10k","half-marathon","fun-run"],"organiser":"RunThrough","organiser_type":"commercial"}},
      {"id":"3be07192-7bd7-40fe-ab5a-98ff21059db2","slug":"windsor-trail-run-half-marathon-10k-august","evidence_url":"https://www.runthrough.co.uk/event/windsor-trail-run-august-2026","expected":{"organiser":null,"organiser_type":"unknown"},"target":{"organiser":"RunThrough","organiser_type":"commercial"}}
    ]
    $patches$::jsonb)
      AS x(id uuid, slug text, evidence_url text, expected jsonb, target jsonb)
  LOOP
    -- A sync may recompute uncurated taxonomy. Any source-reviewed tag change
    -- in this package therefore becomes curated, and the derived flag is part
    -- of the same drift-guarded diff and exact rollback.
    IF patch.target ? 'distance_tags' OR patch.target ? 'terrain_tags' THEN
      patch.expected := patch.expected || jsonb_build_object('is_curated_tags', false);
      patch.target := patch.target || jsonb_build_object('is_curated_tags', true);
    END IF;

    SELECT to_jsonb(e)
      INTO current_row
      FROM public.events e
     WHERE e.id = patch.id
       AND e.slug = patch.slug;

    IF current_row IS NULL THEN
      RAISE EXCEPTION 'RENM soft-404 patch target missing: % (%)', patch.slug, patch.id;
    END IF;

    -- Re-running the SQL is safe: an already-complete row is a no-op.
    IF current_row @> patch.target THEN
      CONTINUE;
    END IF;

    IF NOT (current_row @> patch.expected) THEN
      RAISE EXCEPTION USING
        MESSAGE = format('RENM soft-404 production drift at %s (%s)', patch.slug, patch.id),
        DETAIL = format('Expected subset: %s; current row: %s', patch.expected, current_row);
    END IF;

    SELECT jsonb_object_agg(
             key,
             jsonb_build_object('from', current_row -> key, 'to', patch.target -> key)
           )
      INTO field_diff
      FROM jsonb_object_keys(patch.target) AS keys(key)
     WHERE current_row -> key IS DISTINCT FROM patch.target -> key;

    UPDATE public.events e
       SET name = CASE WHEN patch.target ? 'name' THEN patch.target ->> 'name' ELSE e.name END,
           date_raw = CASE WHEN patch.target ? 'date_raw' THEN patch.target ->> 'date_raw' ELSE e.date_raw END,
           town = CASE WHEN patch.target ? 'town' THEN patch.target ->> 'town' ELSE e.town END,
           county = CASE WHEN patch.target ? 'county' THEN patch.target ->> 'county' ELSE e.county END,
           region = CASE WHEN patch.target ? 'region' THEN patch.target ->> 'region' ELSE e.region END,
           country = CASE WHEN patch.target ? 'country' THEN patch.target ->> 'country' ELSE e.country END,
           distances = CASE WHEN patch.target ? 'distances' THEN patch.target ->> 'distances' ELSE e.distances END,
           entry_fee = CASE WHEN patch.target ? 'entry_fee' THEN patch.target ->> 'entry_fee' ELSE e.entry_fee END,
           organiser = CASE WHEN patch.target ? 'organiser' THEN patch.target ->> 'organiser' ELSE e.organiser END,
           entry_url = CASE WHEN patch.target ? 'entry_url' THEN patch.target ->> 'entry_url' ELSE e.entry_url END,
           organiser_url = CASE WHEN patch.target ? 'organiser_url' THEN patch.target ->> 'organiser_url' ELSE e.organiser_url END,
           licensed = CASE WHEN patch.target ? 'licensed' THEN patch.target ->> 'licensed' ELSE e.licensed END,
           status = CASE WHEN patch.target ? 'status' THEN patch.target ->> 'status' ELSE e.status END,
           date_from = CASE WHEN patch.target ? 'date_from' THEN (patch.target ->> 'date_from')::date ELSE e.date_from END,
           date_to = CASE WHEN patch.target ? 'date_to' THEN (patch.target ->> 'date_to')::date ELSE e.date_to END,
           sort_date = CASE WHEN patch.target ? 'sort_date' THEN (patch.target ->> 'sort_date')::date ELSE e.sort_date END,
           duplicate_of = CASE WHEN patch.target ? 'duplicate_of' THEN (patch.target ->> 'duplicate_of')::uuid ELSE e.duplicate_of END,
           distance_tags = CASE WHEN patch.target ? 'distance_tags' THEN ARRAY(SELECT jsonb_array_elements_text(patch.target -> 'distance_tags')) ELSE e.distance_tags END,
           terrain_tags = CASE WHEN patch.target ? 'terrain_tags' THEN ARRAY(SELECT jsonb_array_elements_text(patch.target -> 'terrain_tags')) ELSE e.terrain_tags END,
           series_key = CASE WHEN patch.target ? 'series_key' THEN patch.target ->> 'series_key' ELSE e.series_key END,
           governance = CASE WHEN patch.target ? 'governance' THEN (patch.target ->> 'governance')::public.event_governance ELSE e.governance END,
           organiser_type = CASE WHEN patch.target ? 'organiser_type' THEN (patch.target ->> 'organiser_type')::public.event_organiser_type ELSE e.organiser_type END,
           race_profile = CASE WHEN patch.target ? 'race_profile' THEN (patch.target ->> 'race_profile')::public.event_race_profile ELSE e.race_profile END,
           is_upcoming = CASE WHEN patch.target ? 'is_upcoming' THEN (patch.target ->> 'is_upcoming')::boolean ELSE e.is_upcoming END,
           is_curated_tags = CASE WHEN patch.target ? 'is_curated_tags' THEN (patch.target ->> 'is_curated_tags')::boolean ELSE e.is_curated_tags END
     WHERE e.id = patch.id
       AND e.slug = patch.slug;

    GET DIAGNOSTICS affected = ROW_COUNT;
    IF affected <> 1 THEN
      RAISE EXCEPTION 'RENM soft-404 patch affected % rows for %; expected 1', affected, patch.slug;
    END IF;

    INSERT INTO public.event_edits (event_id, changes, note)
    VALUES (
      patch.id,
      jsonb_build_object(
        'action', 'renm_soft404_residual_patch',
        'package', 'renm-soft404-residual-2026-08-13',
        'evidence_url', patch.evidence_url,
        'diff', field_diff
      ),
      'Approved source-resolved soft-404 occurrence correction; applied from reviewed GitHub migration.'
    );
  END LOOP;
END
$renm$;