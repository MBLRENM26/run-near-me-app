-- Disposable database only; do not run against production.
\set ON_ERROR_STOP on
CREATE TABLE events (
id uuid PRIMARY KEY, name text, slug text, town text, county text, country text, region text,
lat double precision, lng double precision, date_raw text, sort_date date,
distances text, entry_fee text, entry_url text, organiser_url text,
is_featured boolean DEFAULT false, date_is_estimated boolean DEFAULT false,
governance text, organiser_type text, race_profile text, status text DEFAULT 'ACTIVE',
duplicate_of uuid, tsv tsvector);
CREATE VIEW events_public_v1 AS SELECT * FROM events WHERE status='ACTIVE';
INSERT INTO events(id,name,slug,country,lat,lng,sort_date,tsv) VALUES ('00000000-0000-4000-8000-000000000001','Fixture unknown_missing','unknown_missing',NULL,NULL,NULL,'2099-01-01',to_tsvector('english','Fixture race'));
INSERT INTO events(id,name,slug,country,lat,lng,sort_date,tsv) VALUES ('00000000-0000-4000-8000-000000000002','Fixture uk_missing','uk_missing','England',NULL,NULL,'2099-01-01',to_tsvector('english','Fixture race'));
INSERT INTO events(id,name,slug,country,lat,lng,sort_date,tsv) VALUES ('00000000-0000-4000-8000-000000000003','Fixture overseas_missing','overseas_missing','United States',NULL,NULL,'2099-01-01',to_tsvector('english','Fixture race'));
INSERT INTO events(id,name,slug,country,lat,lng,sort_date,tsv) VALUES ('00000000-0000-4000-8000-000000000004','Fixture overseas_wrong_uk','overseas_wrong_uk','Spain',51.5,-0.1,'2099-01-01',to_tsvector('english','Fixture race'));
INSERT INTO events(id,name,slug,country,lat,lng,sort_date,tsv) VALUES ('00000000-0000-4000-8000-000000000005','Fixture overseas_correct','overseas_correct','Australia',-37.8,144.9,'2099-01-01',to_tsvector('english','Fixture race'));
INSERT INTO events(id,name,slug,country,lat,lng,sort_date,tsv) VALUES ('00000000-0000-4000-8000-000000000006','Fixture uk_correct','uk_correct','England',51.5,-0.1,'2099-01-01',to_tsvector('english','Fixture race'));
INSERT INTO events(id,name,slug,country,lat,lng,sort_date,tsv) VALUES ('00000000-0000-4000-8000-000000000007','Fixture uk_outside','uk_outside','England',-37.8,144.9,'2099-01-01',to_tsvector('english','Fixture race'));
INSERT INTO events(id,name,slug,country,lat,lng,sort_date,tsv) VALUES ('00000000-0000-4000-8000-000000000008','Fixture ni','ni','Northern Ireland',54.6,-5.9,'2099-01-01',to_tsvector('english','Fixture race'));
INSERT INTO events(id,name,slug,country,lat,lng,sort_date,tsv) VALUES ('00000000-0000-4000-8000-000000000009','Fixture parkrun','parkrun','United Kingdom',55.8,-4.2,NULL,to_tsvector('english','Fixture race'));
INSERT INTO events(id,name,slug,country,lat,lng,sort_date,tsv) VALUES ('00000000-0000-4000-8000-000000000010','Fixture lowercase','lowercase','wales',51.6,-3.5,'2099-01-01',to_tsvector('english','Fixture race'));
INSERT INTO events(id,name,slug,country,lat,lng,sort_date,tsv) VALUES ('00000000-0000-4000-8000-000000000011','Fixture gb_alias','gb_alias','GB',51.5,-0.1,'2099-01-01',to_tsvector('english','Fixture race'));
INSERT INTO events(id,name,slug,country,lat,lng,sort_date,tsv) VALUES ('00000000-0000-4000-8000-000000000012','Fixture unknown_uk','unknown_uk',NULL,51.5,-0.1,'2099-01-01',to_tsvector('english','Fixture race'));
INSERT INTO events(id,name,slug,country,lat,lng,sort_date,status,tsv)
VALUES ('00000000-0000-4000-8000-000000000050','Fixture old','past','England',51.5,-0.1,'2000-01-01','ACTIVE',to_tsvector('english','Fixture race')),
('00000000-0000-4000-8000-000000000051','Fixture hidden','hidden','England',51.5,-0.1,'2099-01-01','HIDDEN',to_tsvector('english','Fixture race'));
