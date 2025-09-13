CREATE DATABASE healthcare;
USE healthcare;

------------------------------------------------------
-- FIRST AID TABLE
------------------------------------------------------
CREATE TABLE IF NOT EXISTS first_aid
(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic TEXT,
  tip TEXT,
  language TEXT
);

-- English Entries
INSERT INTO first_aid (topic , tip , language) VALUES
('burns' , 'Cool burn with running water for 10 min. Do not apply ice.' , 'english'),
('snake bite', 'Keep patient still, don’t suck venom, seek hospital.' , 'english'),
('fracture' , 'Immobilize the area, don’t try to push bone back.' , 'english'),
('choking' , 'Give 5 back blows, 5 abdominal thrusts.' , 'english'),
('fever' , 'Give fluids, keep cool, paracetamol if available.' , 'english'),
('dehydration' , 'Give ORS solution / sugar-salt water.' , 'english');

-- Hindi Entries
INSERT INTO first_aid (topic , tip , language) VALUES
('जलना' , 'जलने पर प्रभावित हिस्से को 10 मिनट तक बहते पानी में ठंडा करें। बर्फ का प्रयोग न करें।' , 'hindi'),
('साँप का काटना', 'मरीज को शांत रखें, ज़हर चूसने की कोशिश न करें, तुरंत अस्पताल पहुँचें।' , 'hindi'),
('फ्रैक्चर' , 'टूटी हुई हड्डी को हिलाएँ नहीं, उसे स्थिर रखें।' , 'hindi'),
('दम घुटना' , '5 पीठ पर थपकी और 5 पेट पर धक्का दें।' , 'hindi'),
('बुखार' , 'तरल पदार्थ दें, शरीर ठंडा रखें, ज़रूरत हो तो पैरासिटामोल दें।' , 'hindi'),
('निर्जलीकरण' , 'ओआरएस या चीनी-नमक का घोल पिलाएँ।' , 'hindi');

-- Odia Entries
INSERT INTO first_aid (topic , tip , language) VALUES
('ପୋଡ଼ା' , 'ଜଳିଲେ ପ୍ରଭାବିତ ସ୍ଥାନକୁ 10 ମିନିଟ ପର୍ଯ୍ୟନ୍ତ ପାଣିରେ ଧୋଇଦିଅନ୍ତୁ । ବରଫ ଲଗାନ୍ତୁ ନାହିଁ ।' , 'odia'),
('ସାପ ଙ୍କ କାମୁଡ଼ା', 'ରୋଗୀକୁ ସ୍ଥିର ରଖନ୍ତୁ, ବିଷ ଚୁସନ୍ତୁ ନାହିଁ, ତୁରନ୍ତ ହସ୍ପିଟାଲ୍ ନେଇଯାଆନ୍ତୁ ।' , 'odia'),
('ହାଡ଼ ଭାଙ୍ଗିବା' , 'ଭଙ୍ଗିଥିବା ହାଡ଼କୁ ହଲାନ୍ତୁ ନାହିଁ, ସ୍ଥିର କରନ୍ତୁ ।' , 'odia'),
('ଶ୍ୱାସ ଅବରୋଧ' , '5ଥର ପିଠିରେ ଥପ୍କା ଏବଂ 5ଥର ପେଟରେ ଧକ୍କା ଦିଅନ୍ତୁ ।' , 'odia'),
('ଜ୍ୱର' , 'ପାଣି ପିଅନ୍ତୁ, ଶରୀରକୁ ଠଣ୍ଡା ରଖନ୍ତୁ, ପ୍ରୟୋଜନରେ ପାରାସିଟାମଲ୍ ଦିଅନ୍ତୁ ।' , 'odia'),
('ଡିହାଇଡ୍ରେସନ୍' , 'ORS କିମ୍ବା ଚିନି-ଲୁଣ ର ସମାଧାନ ପିଅନ୍ତୁ ।' , 'odia');

------------------------------------------------------
-- PREVENTION TIPS TABLE
------------------------------------------------------
CREATE TABLE IF NOT EXISTS prevention_tips (
   id INTEGER PRIMARY KEY AUTOINCREMENT,
   disease TEXT,
   tip TEXT,
   language TEXT
);

-- English Entries
INSERT INTO prevention_tips (disease , tip , language) VALUES
('malaria' , 'Use mosquito nets, drain stagnant water.' , 'english'),
('dengue' , 'Avoid water collection, wear full sleeves.' , 'english'),
('cholera' , 'Drink boiled water, wash hands with soap.' , 'english'),
('heatstroke' , 'Stay hydrated, avoid direct sun exposure.' , 'english');

-- Hindi Entries
INSERT INTO prevention_tips (disease , tip , language) VALUES
('मलेरिया' , 'मच्छरदानी का प्रयोग करें, रुका हुआ पानी हटा दें।' , 'hindi'),
('डेंगू' , 'पानी इकट्ठा न होने दें, पूरे कपड़े पहनें।' , 'hindi'),
('हैजा' , 'उबला हुआ पानी पिएं, साबुन से हाथ धोएं।' , 'hindi'),
('लू' , 'हाइड्रेटेड रहें, सीधी धूप से बचें।' , 'hindi');

-- Odia Entries
INSERT INTO prevention_tips (disease , tip , language) VALUES
('ମଲେରିଆ' , 'ମଶାଦାନୀ ବ୍ୟବହାର କରନ୍ତୁ, ଥିବା ପାଣି କାଢ଼ିଦିଅନ୍ତୁ ।' , 'odia'),
('ଡେଙ୍ଗୁ' , 'ପାଣି ଜମା ହେବାକୁ ଦିଅନ୍ତୁ ନାହିଁ, ପୂର୍ଣ୍ଣ ହାତା ହାତାକୁଳା ପିନ୍ଧନ୍ତୁ ।' , 'odia'),
('ହାଜା' , 'ଫୋଟା ପାଣି ପିଅନ୍ତୁ, ସାବୁନ୍ ସହିତ ହାତ ଧୋଇଦିଅନ୍ତୁ ।' , 'odia'),
('ଲୁ' , 'ପାଣି ପିଇଥାନ୍ତୁ, ସିଧାସଳଖ ସୂର୍ଯ୍ୟରୁ ଦୂରେ ରୁହନ୍ତୁ ।' , 'odia');

------------------------------------------------------
-- EMERGENCY CONTACTS TABLE
------------------------------------------------------
CREATE TABLE IF NOT EXISTS emergency_contacts (
   id INTEGER PRIMARY KEY AUTOINCREMENT,
   name TEXT,
   phone TEXT,
   language TEXT
);

-- English Entries
INSERT INTO emergency_contacts (name , phone , language) VALUES
('Ambulance' , '108' , 'english'),
('Police' , '100' , 'english'),
('Fire' , '101' , 'english'),
('Women Helpline' , '1091' , 'english'),
('District Hospital' , 'Cuttack SCB Medical – 0671-2414080' , 'english');

-- Hindi Entries
INSERT INTO emergency_contacts (name , phone , language) VALUES
('एम्बुलेंस' , '108' , 'hindi'),
('पुलिस' , '100' , 'hindi'),
('फायर ब्रिगेड' , '101' , 'hindi'),
('महिला हेल्पलाइन' , '1091' , 'hindi'),
('जिला अस्पताल' , 'कटक एससीबी मेडिकल – 0671-2414080' , 'hindi');

-- Odia Entries
INSERT INTO emergency_contacts (name , phone , language) VALUES
('ଆମ୍ବୁଲାନ୍ସ' , '108' , 'odia'),
('ପୋଲିସ୍' , '100' , 'odia'),
('ଅଗ୍ନିଶମ' , '101' , 'odia'),
('ମହିଳା ହେଲ୍ପଲାଇନ୍' , '1091' , 'odia'),
('ଜିଲ୍ଲା ହସ୍ପିଟାଲ୍' , 'କଟକ SCB ମେଡିକାଲ୍ – 0671-2414080' , 'odia');
