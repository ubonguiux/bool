-- Idempotent starter catalogue: 60 sample song entries, 10 per library category.
with target_choir as (
 select id from public.choirs where name='RVM Choir - IBB' order by created_at limit 1
), owner_profile as (
 select user_id from public.rvm_profiles where role='owner' order by created_at limit 1
), sample_songs(title,category,language,source_notes) as (
 values
('Amazing Grace', 'Hymns', 'English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('How Great Thou Art', 'Hymns', 'English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('Holy, Holy, Holy', 'Hymns', 'English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('Great Is Thy Faithfulness', 'Hymns', 'English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('Blessed Assurance', 'Hymns', 'English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('It Is Well with My Soul', 'Hymns', 'English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('All Hail the Power of Jesus’ Name', 'Hymns', 'English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('To God Be the Glory', 'Hymns', 'English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('What a Friend We Have in Jesus', 'Hymns', 'English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('Rock of Ages', 'Hymns', 'English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('We Lift Your Name', 'Praise & Worship', 'English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('You Are Worthy, Lord', 'Praise & Worship', 'English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('King of Glory', 'Praise & Worship', 'English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('We Praise Your Holy Name', 'Praise & Worship', 'English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('Faithful God, We Worship You', 'Praise & Worship', 'English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('Your Mercy Never Fails', 'Praise & Worship', 'English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('Let Every Heart Rejoice', 'Praise & Worship', 'English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('Glory to the Lamb', 'Praise & Worship', 'English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('You Reign Forever', 'Praise & Worship', 'English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('Our Praise Goes Up', 'Praise & Worship', 'English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('A Heart of Thanksgiving', 'Special Numbers', 'English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('The Shepherd’s Care', 'Special Numbers', 'English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('When I Remember Your Goodness', 'Special Numbers', 'English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('A Prayer for the Nations', 'Special Numbers', 'English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('Grace Has Found Me', 'Special Numbers', 'English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('The Potter’s Hands', 'Special Numbers', 'English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('A Song of Surrender', 'Special Numbers', 'English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('Light in the Darkness', 'Special Numbers', 'English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('My Soul Finds Rest', 'Special Numbers', 'English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('The Love That Holds Us', 'Special Numbers', 'English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('O Come, All Ye Faithful', 'Christmas', 'English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('Silent Night', 'Christmas', 'English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('Joy to the World', 'Christmas', 'English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('Hark! The Herald Angels Sing', 'Christmas', 'English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('The First Noel', 'Christmas', 'English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('Away in a Manger', 'Christmas', 'English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('O Holy Night', 'Christmas', 'English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('Angels We Have Heard on High', 'Christmas', 'English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('What Child Is This?', 'Christmas', 'English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('Go, Tell It on the Mountain', 'Christmas', 'English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('Sing to the Lord a New Song', 'Anthems', 'English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('Let the Heavens Rejoice', 'Anthems', 'English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('The Lord Is My Light', 'Anthems', 'English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('A New Heart, O God', 'Anthems', 'English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('Make a Joyful Noise', 'Anthems', 'English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('Praise Him with the Trumpet', 'Anthems', 'English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('Come, Let Us Worship', 'Anthems', 'English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('The Blessing of the Lord', 'Anthems', 'English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('One Body, One Spirit', 'Anthems', 'English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('Send Us Out in Joy', 'Anthems', 'English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('Ibibio Praise Medley — Sample', 'Traditional', 'Ibibio / English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('Akwa Ibom Thanksgiving Song — Sample', 'Traditional', 'Ibibio / English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('Ete Idem Mi — Sample Arrangement', 'Traditional', 'Ibibio / English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('Abasi Ayaya — Sample', 'Traditional', 'Ibibio / English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('Ndito Abasi — Sample Arrangement', 'Traditional', 'Ibibio / English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('Uyai Abasi — Sample', 'Traditional', 'Ibibio / English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('Nyin Ikpono Abasi — Sample', 'Traditional', 'Ibibio / English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('Afiọk Abasi — Sample', 'Traditional', 'Ibibio / English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('Nnyin Ima Jesus — Sample', 'Traditional', 'Ibibio / English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.'),
('Mfon Abasi — Sample Medley', 'Traditional', 'Ibibio / English', 'Starter sample catalogue entry. Add the choir-approved lyrics, key, arrangement, and recording before performance.')
)
insert into public.songs (choir_id,title,category,language,source_notes,created_by)
select c.id,s.title,s.category,s.language,s.source_notes,o.user_id
from target_choir c cross join owner_profile o cross join sample_songs s
where not exists (
 select 1 from public.songs existing
 where existing.choir_id=c.id and lower(existing.title)=lower(s.title) and existing.archived_at is null
);