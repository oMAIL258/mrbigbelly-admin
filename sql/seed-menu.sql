-- Mr. Big Belly menu seed
-- Paste into Supabase SQL Editor. Idempotent via ON CONFLICT (slug).
BEGIN;

-- 1. Categories
INSERT INTO categories (slug, name_en, name_th, sort) VALUES
  ('musttry', 'Must Try', 'เมนูแนะนำ', 0),
  ('apps', 'Appetizers', 'ของทานเล่น', 1),
  ('salad', 'Fresh Salad', 'สลัด', 2),
  ('main', 'Main Dish', 'จานหลัก / บรันช์', 3),
  ('pizza', 'Pizza', 'พิซซ่า', 4),
  ('burger', 'Burger', 'เบอร์เกอร์', 5),
  ('rice', 'Rice', 'ข้าว', 6),
  ('pasta', 'Pasta', 'พาสต้า', 7),
  ('sour', 'Sourdough', 'ซาวโดวจ์', 8),
  ('sand', 'Sandwich', 'แซนวิช', 9),
  ('bowl', 'Bowls', 'โบวล์', 10),
  ('juice', 'Juice', 'น้ำผัก-ผลไม้', 11),
  ('smooth', 'Smoothie', 'สมูทตี้', 12),
  ('coffee', 'Coffee', 'กาแฟ', 13),
  ('tea', 'Non-Coffee', 'ชา/นม', 14),
  ('bake', 'Bakery', 'เบเกอรี่', 15)
ON CONFLICT (slug) DO UPDATE SET name_en = EXCLUDED.name_en, name_th = EXCLUDED.name_th, sort = EXCLUDED.sort;

-- 2. Menu items (prices in satang: multiply ฿ by 100)
WITH cat AS (SELECT id, slug FROM categories)
INSERT INTO menu_items (category_id, slug, name_en, name_th, description, price_satang, is_available, tags, sort) VALUES
  ((SELECT id FROM cat WHERE slug = 'musttry'), 'saeb-sour', 'Thai Spicy Pulled Pork Sourdough Sandwich', 'แซ่บแห้งซาวโดวจ์แซนด์วิช', 'Sourdough with slow-cooked spicy-sweet pulled pork, 30-year family recipe from Phitsanulok.', 22000, true, ARRAY['musttry', 'emoji:🥪']::text[], 0),
  ((SELECT id FROM cat WHERE slug = 'musttry'), 'mex-beef-sour', 'Mexican Beef Sourdough Sandwich', 'เนื้อผัดเม็กซิกันซาวโดวจ์แซนด์วิช', 'Beef in Mexican sauce, mozzarella + cheddar, crispy garlic, pickled jalapeño.', 22000, true, ARRAY['musttry', 'emoji:🥪']::text[], 1),
  ((SELECT id FROM cat WHERE slug = 'musttry'), 'saeb-noodle', 'แซ่บแห้ง', 'แซ่บแห้งหมูตุ๋น เส้นไวไว หรือข้าว', 'Spicy-sweet pulled pork with holy basil, 30-year recipe from Phitsanulok. Choose Waiwai noodles or rice.', 16500, true, ARRAY['musttry', 'emoji:🍜']::text[], 2),
  ((SELECT id FROM cat WHERE slug = 'apps'), 'sw-fries-original', 'Sweet Potato Fries (Original)', 'มันหวานทอด · ออริจินัล', 'With homemade Mexican sauce or truffle mayo.', 13500, true, ARRAY['veg', 'musttry', 'emoji:🍟']::text[], 3),
  ((SELECT id FROM cat WHERE slug = 'apps'), 'sw-fries-truffle', 'Sweet Potato Fries (Truffle)', 'มันหวานทอด · ทรัฟเฟิล', 'With homemade Mexican sauce or truffle mayo.', 16500, true, ARRAY['veg', 'musttry', 'emoji:🍟']::text[], 4),
  ((SELECT id FROM cat WHERE slug = 'apps'), 'nachos', 'Nachos', 'นาโช่', 'With homemade salsa.', 16500, true, ARRAY['veg', 'emoji:🌮']::text[], 5),
  ((SELECT id FROM cat WHERE slug = 'apps'), 'ck-fingers', 'Chicken Fingers', 'สะโพกไก่ชุบแป้งทอดกรอบ', 'Crispy chicken thigh with special sauce.', 14500, true, ARRAY['emoji:🍗']::text[], 6),
  ((SELECT id FROM cat WHERE slug = 'apps'), 'mush-soup', 'Mushroom Soup', 'ซุปเห็ดแชมปิญอง', 'With garlic bread.', 18500, true, ARRAY['veg', 'emoji:🍲']::text[], 7),
  ((SELECT id FROM cat WHERE slug = 'apps'), 'tom-soup', 'Tomato Soup', 'ซุปมะเขือเทศ', 'With grilled cheese.', 19000, true, ARRAY['veg', 'emoji:🍅']::text[], 8),
  ((SELECT id FROM cat WHERE slug = 'apps'), 'garlic-br', 'Garlic Bread', 'ขนมปังมัลติเกรนบาแก็ต เนยกระเทียม', NULL, 11000, true, ARRAY['emoji:🥖']::text[], 9),
  ((SELECT id FROM cat WHERE slug = 'salad'), 'grain-sal', 'Grain Salad', 'สลัดธัญพืช', 'Quinoa, barley, purple cabbage, corn, edamame, beans, dried fruit, croutons, nut dressing.', 18000, true, ARRAY['veg', 'emoji:🥗']::text[], 10),
  ((SELECT id FROM cat WHERE slug = 'salad'), 'kale-sal', 'Kale Salad', 'สลัดเคล', 'Kale with mixed beans in honey, two-colour apple.', 22000, true, ARRAY['veg', 'emoji:🥗']::text[], 11),
  ((SELECT id FROM cat WHERE slug = 'salad'), 'mex-sal', 'Mexican Salad', 'สลัดเม็กซิกัน', 'Lettuce, corn, red beans, avocado, cherry tomato, red onion, jalapeño, tortilla chips.', 22000, true, ARRAY['veg', 'musttry', 'emoji:🥗']::text[], 12),
  ((SELECT id FROM cat WHERE slug = 'salad'), 'gc-sal', 'Grilled Chicken Salad', 'สลัดไก่ย่าง', 'Grilled chicken, beetroot, feta, dried fruit, black olive, wholewheat bread.', 22000, true, ARRAY['emoji:🥗']::text[], 13),
  ((SELECT id FROM cat WHERE slug = 'salad'), 'quin-sal', 'Quinoa Salad', 'สลัดควินัว', 'Three-colour quinoa, chickpea, cherry tomato, cucumber, Japanese pumpkin.', 14000, true, ARRAY['veg', 'emoji:🥗']::text[], 14),
  ((SELECT id FROM cat WHERE slug = 'salad'), 'caesar', 'Caesar Salad', 'สลัดซีซาร์', 'Lettuce, cherry tomato, red onion, parmesan, baked bacon.', 18000, true, ARRAY['emoji:🥗']::text[], 15),
  ((SELECT id FROM cat WHERE slug = 'main'), 'ck-waffle', 'Maple Chicken Waffle', 'ไก่ทอดเมเปิลวาฟเฟิล', 'Spiced fried chicken, maple syrup, homemade waffle, salad, cider dressing and fruit.', 27000, true, ARRAY['emoji:🧇']::text[], 16),
  ((SELECT id FROM cat WHERE slug = 'main'), 'basic-br', 'Basic Brunch', 'บรันช์เบสิก', 'Scrambled egg, wholewheat bread, salad, smoked salmon, smoked bacon, avocado, cider dressing, berries. Choose one cold-pressed juice.', 34000, true, ARRAY['emoji:🍳']::text[], 17),
  ((SELECT id FROM cat WHERE slug = 'main'), 'striploin', 'Striploin Beef Steak', 'เนื้อสเต็กสันนอก', 'With homemade mash, roasted garlic and grilled vegetables.', 99000, true, ARRAY['emoji:🥩']::text[], 18),
  ((SELECT id FROM cat WHERE slug = 'main'), 'salm-steak', 'Salmon Steak', 'สเต็กแซลมอน', 'Salmon steak, salad, quinoa, cherry tomato, anchovy and cider dressings.', 37500, true, ARRAY['emoji:🐟']::text[], 19),
  ((SELECT id FROM cat WHERE slug = 'main'), 'avo-toast', 'Avocado Toast', 'อโวคาโดโทสต์', 'Smashed avocado on multi-grain sourdough, cherry tomato, fried shallot, salad.', 29000, true, ARRAY['veg', 'emoji:🥑']::text[], 20),
  ((SELECT id FROM cat WHERE slug = 'main'), 'quesadilla-beef', 'Quesadilla (Beef)', 'เกซาดิย่า · เนื้อ', 'Pulled beef or chicken, cabbage, jalapeño, cheese. Served with guacamole, salsa and sour cream.', 23000, true, ARRAY['emoji:🫓']::text[], 21),
  ((SELECT id FROM cat WHERE slug = 'main'), 'quesadilla-chicken', 'Quesadilla (Chicken)', 'เกซาดิย่า · ไก่', 'Pulled beef or chicken, cabbage, jalapeño, cheese. Served with guacamole, salsa and sour cream.', 21000, true, ARRAY['emoji:🫓']::text[], 22),
  ((SELECT id FROM cat WHERE slug = 'main'), 'taco-beef', 'Taco (Beef)', 'ทาโก้ · เนื้อ', 'Pulled beef or chicken with special sauce, avocado hash, guacamole, sour cream.', 19000, true, ARRAY['musttry', 'emoji:🌮']::text[], 23),
  ((SELECT id FROM cat WHERE slug = 'main'), 'taco-chicken', 'Taco (Chicken)', 'ทาโก้ · ไก่', 'Pulled beef or chicken with special sauce, avocado hash, guacamole, sour cream.', 17000, true, ARRAY['musttry', 'emoji:🌮']::text[], 24),
  ((SELECT id FROM cat WHERE slug = 'pizza'), 'pz-marg', 'Margherita Pizza', 'พิซซ่าแป้งบางกรอบมาการิต้า', 'Thin crispy crust.', 21000, true, ARRAY['veg', 'emoji:🍕']::text[], 25),
  ((SELECT id FROM cat WHERE slug = 'pizza'), 'pz-truff', 'Truffle Pizza', 'พิซซ่าแป้งบางกรอบทรัฟเฟิล', 'Thin crispy crust.', 29000, true, ARRAY['veg', 'emoji:🍕']::text[], 26),
  ((SELECT id FROM cat WHERE slug = 'pizza'), 'pz-sal', 'Salami Pizza', 'พิซซ่าแป้งบางกรอบซาลามี่', 'Thin crispy crust.', 23000, true, ARRAY['emoji:🍕']::text[], 27),
  ((SELECT id FROM cat WHERE slug = 'burger'), 'og-burger-fried-chicken', 'OG Burger (Fried Chicken)', 'โอจีเบอร์เกอร์ · ไก่ทอด', 'Fried shallot, pickled cucumber, tomato, lettuce, homemade spicy mayo, sweet potato fries.', 25000, true, ARRAY['emoji:🍔']::text[], 28),
  ((SELECT id FROM cat WHERE slug = 'burger'), 'og-burger-beef-patty', 'OG Burger (Beef Patty)', 'โอจีเบอร์เกอร์ · เนื้อบด', 'Fried shallot, pickled cucumber, tomato, lettuce, homemade spicy mayo, sweet potato fries.', 27000, true, ARRAY['emoji:🍔']::text[], 29),
  ((SELECT id FROM cat WHERE slug = 'burger'), 'truff-burger-chicken', 'Truffle Burger (Chicken)', 'ทรัฟเฟิลเบอร์เกอร์ · ไก่', 'Crispy shallot, fried shallot, homemade truffle mayo, sweet potato fries.', 28000, true, ARRAY['emoji:🍔']::text[], 30),
  ((SELECT id FROM cat WHERE slug = 'burger'), 'truff-burger-beef', 'Truffle Burger (Beef)', 'ทรัฟเฟิลเบอร์เกอร์ · เนื้อ', 'Crispy shallot, fried shallot, homemade truffle mayo, sweet potato fries.', 31000, true, ARRAY['emoji:🍔']::text[], 31),
  ((SELECT id FROM cat WHERE slug = 'rice'), 'sal-men', 'Salmon Mentaiko', 'แซลมอนเมนไทโกะ', 'Salmon with homemade mentaiko sauce, grilled Japanese pumpkin.', 34000, true, ARRAY['emoji:🍣']::text[], 32),
  ((SELECT id FROM cat WHERE slug = 'rice'), 'pork-sp', 'Salt & Pepper Pork Belly', 'หมูกรอบคั่วพริกกระเทียมไข่ข้น', 'Crispy pork belly, chilli-garlic stir fry, creamy egg.', 21000, true, ARRAY['emoji:🍚']::text[], 33),
  ((SELECT id FROM cat WHERE slug = 'rice'), 'sal-sp', 'Salt & Pepper Salmon', 'แซลมอนทอดกรอบคั่วพริกกระเทียม', 'Crispy salmon with chilli-garlic stir fry.', 21000, true, ARRAY['musttry', 'emoji:🍚']::text[], 34),
  ((SELECT id FROM cat WHERE slug = 'rice'), 'ck-spicy', 'Grilled Chicken Spicy Sauce', 'ไก่หมักซอส จิ้มแจ่ว', 'Marinated chicken with Isaan dipping sauce.', 17000, true, ARRAY['emoji:🍚']::text[], 35),
  ((SELECT id FROM cat WHERE slug = 'pasta'), 'carbonara', 'Carbonara', 'พาสต้าซอสคาโบนาร่า', NULL, 19000, true, ARRAY['emoji:🍝']::text[], 36),
  ((SELECT id FROM cat WHERE slug = 'pasta'), 'tomato-pasta', 'Tomato Sauce Pasta', 'พาสต้าซอสมะเขือเทศหมู', NULL, 18000, true, ARRAY['emoji:🍝']::text[], 37),
  ((SELECT id FROM cat WHERE slug = 'pasta'), 'kee-mao', 'Kee Mao', 'พาสต้าซอสขี้เมา', NULL, 18000, true, ARRAY['emoji:🍝']::text[], 38),
  ((SELECT id FROM cat WHERE slug = 'pasta'), 'pesto-shrimp', 'Pesto Pasta (Shrimp)', 'พาสต้าซอสเพสโต้ · กุ้ง', NULL, 19000, true, ARRAY['musttry', 'emoji:🍝']::text[], 39),
  ((SELECT id FROM cat WHERE slug = 'pasta'), 'pesto-salmon', 'Pesto Pasta (Salmon)', 'พาสต้าซอสเพสโต้ · แซลมอน', NULL, 45000, true, ARRAY['musttry', 'emoji:🍝']::text[], 40),
  ((SELECT id FROM cat WHERE slug = 'pasta'), 'truff-cream', 'Truffle Cream', 'พาสต้าซอสทรัฟเฟิลครีม', NULL, 23000, true, ARRAY['veg', 'emoji:🍝']::text[], 41),
  ((SELECT id FROM cat WHERE slug = 'sour'), 'tuna-melt', 'Tuna Melt Sourdough', 'ทูน่ามูส, เชดดาร์ชีส, เพสโต้, ฮาลาเปโน่', 'Tuna mousse, cheddar, homemade pesto, jalapeño.', 19500, true, ARRAY['emoji:🥪']::text[], 42),
  ((SELECT id FROM cat WHERE slug = 'sour'), '3cheese', 'Three Cheeses Sourdough', 'เชดดาร์, มอสซาเรลล่า, พาร์เมซาน', 'Cheddar, mozzarella, parmesan, homemade pesto, caramelised onion.', 19500, true, ARRAY['veg', 'emoji:🥪']::text[], 43),
  ((SELECT id FROM cat WHERE slug = 'sour'), 'ck-avo-sour', 'Chicken Avo Sourdough', 'ไก่ย่าง, อโวคาโด, มะเขือเทศ', 'Grilled chicken, avocado, tomato, balsamic, rocket, mozzarella.', 23000, true, ARRAY['emoji:🥪']::text[], 44),
  ((SELECT id FROM cat WHERE slug = 'sour'), 'sour-set', 'Sourdough Set', 'ขนมปังโฮมเมดเพสโต้ ซัลซ่า เนย น้ำมันบัลซามิค', 'Homemade pesto, salsa, butter, balsamic olive oil.', 9500, true, ARRAY['veg', 'emoji:🍞']::text[], 45),
  ((SELECT id FROM cat WHERE slug = 'sand'), 'mex-sand', 'Mexican Sandwich', 'ไก่ย่าง, พริกหวาน, อโวคาโด, ข้าวโพด, ซัลซ่า', NULL, 9500, true, ARRAY['emoji:🥪']::text[], 46),
  ((SELECT id FROM cat WHERE slug = 'sand'), 'pesto-sand', 'Pesto Sandwich', 'ไก่, มอสซาเรลล่า, มะเขือเทศ, โหระพา, เพสโต้', NULL, 9500, true, ARRAY['emoji:🥪']::text[], 47),
  ((SELECT id FROM cat WHERE slug = 'sand'), 'classic-sand', 'Classic Sandwich', 'ไก่, กะหล่ำม่วง, พริกหวาน, ไข่ดาว, สลัด', NULL, 8000, true, ARRAY['emoji:🥪']::text[], 48),
  ((SELECT id FROM cat WHERE slug = 'bowl'), 'nutty-bowl-regular', 'Nutty Bowl (Regular)', 'สตรอว์เบอร์รี่ กล้วย อัลมอนด์บัตเตอร์', 'Strawberry, banana, granola, homemade almond butter, mixed nuts.', 12000, true, ARRAY['musttry', 'emoji:🍓']::text[], 49),
  ((SELECT id FROM cat WHERE slug = 'bowl'), 'nutty-bowl-large', 'Nutty Bowl (Large)', 'สตรอว์เบอร์รี่ กล้วย อัลมอนด์บัตเตอร์', 'Strawberry, banana, granola, homemade almond butter, mixed nuts.', 16000, true, ARRAY['musttry', 'emoji:🍓']::text[], 50),
  ((SELECT id FROM cat WHERE slug = 'bowl'), 'fruitloop-bowl-regular', 'Fruit Loop Bowl (Regular)', 'สตรอว์เบอร์รี่ องุ่น ส้ม', 'Strawberry, muscat grape, orange, blueberry, granola.', 15000, true, ARRAY['emoji:🍊']::text[], 51),
  ((SELECT id FROM cat WHERE slug = 'bowl'), 'fruitloop-bowl-large', 'Fruit Loop Bowl (Large)', 'สตรอว์เบอร์รี่ องุ่น ส้ม', 'Strawberry, muscat grape, orange, blueberry, granola.', 19000, true, ARRAY['emoji:🍊']::text[], 52),
  ((SELECT id FROM cat WHERE slug = 'bowl'), 'classic-bowl-regular', 'Classic Bowl (Regular)', 'กล้วย กีวี โกจิเบอร์รี่', 'Banana, kiwi, goji berry, granola, chia seed.', 12000, true, ARRAY['emoji:🥝']::text[], 53),
  ((SELECT id FROM cat WHERE slug = 'bowl'), 'classic-bowl-large', 'Classic Bowl (Large)', 'กล้วย กีวี โกจิเบอร์รี่', 'Banana, kiwi, goji berry, granola, chia seed.', 16000, true, ARRAY['emoji:🥝']::text[], 54),
  ((SELECT id FROM cat WHERE slug = 'bowl'), 'super-bowl-regular', 'Super Bowl (Regular)', 'อโวคาโด กราโนล่า', 'Avocado, granola, crispy coconut, dried fruit, honey.', 15000, true, ARRAY['emoji:🥑']::text[], 55),
  ((SELECT id FROM cat WHERE slug = 'bowl'), 'super-bowl-large', 'Super Bowl (Large)', 'อโวคาโด กราโนล่า', 'Avocado, granola, crispy coconut, dried fruit, honey.', 19000, true, ARRAY['emoji:🥑']::text[], 56),
  ((SELECT id FROM cat WHERE slug = 'bowl'), 'fudgy-bowl-regular', 'Fudgy Bowl (Regular)', 'สตรอว์เบอร์รี่ บลูเบอร์รี่ บราวนี่', 'Strawberry, mango, blueberry, cacao nibs, chocolate fudge, brownie, almond butter.', 15000, true, ARRAY['emoji:🍫']::text[], 57),
  ((SELECT id FROM cat WHERE slug = 'bowl'), 'fudgy-bowl-large', 'Fudgy Bowl (Large)', 'สตรอว์เบอร์รี่ บลูเบอร์รี่ บราวนี่', 'Strawberry, mango, blueberry, cacao nibs, chocolate fudge, brownie, almond butter.', 19000, true, ARRAY['emoji:🍫']::text[], 58),
  ((SELECT id FROM cat WHERE slug = 'juice'), 'veggie', 'Veggie Joint', 'ปวยเล้ง เซลาลี่ พาสลี่ย์ เคล มะนาว แอปเปิลแดง', NULL, 8500, true, ARRAY['veg', 'emoji:🥬']::text[], 59),
  ((SELECT id FROM cat WHERE slug = 'juice'), 'skin-glow', 'Skin Glow', 'เสาวรส สับปะรด ส้ม แตงกวา แคนตาลูป', NULL, 7500, true, ARRAY['veg', 'emoji:🥭']::text[], 60),
  ((SELECT id FROM cat WHERE slug = 'juice'), 'green-sport', 'Green Sport', 'สับปะรด แอปเปิลเขียว ฝรั่ง องุ่นไซมัสคัต', NULL, 7500, true, ARRAY['veg', 'emoji:🍏']::text[], 61),
  ((SELECT id FROM cat WHERE slug = 'juice'), 'belly-rem', 'Belly Remedy', 'กระชาย ขิง มะนาว แครอท สับปะรด ขมิ้น', NULL, 8500, true, ARRAY['veg', 'emoji:🫚']::text[], 62),
  ((SELECT id FROM cat WHERE slug = 'juice'), 'detox', 'Detox Potion', 'เซลาลี่ เลม่อน กีวี่', NULL, 9500, true, ARRAY['veg', 'emoji:🥒']::text[], 63),
  ((SELECT id FROM cat WHERE slug = 'juice'), 'anti-ca', 'Anti Cancer', 'บีทรูท ขิง มะนาว ส้ม สับปะรด', NULL, 7500, true, ARRAY['veg', 'emoji:🫒']::text[], 64),
  ((SELECT id FROM cat WHERE slug = 'juice'), 'sunshine', 'Sunshine', 'มะม่วง แครอท สับปะรด', NULL, 8000, true, ARRAY['veg', 'emoji:🥭']::text[], 65),
  ((SELECT id FROM cat WHERE slug = 'juice'), 'pm-sun', 'P.M. Sun', 'กะหล่ำม่วง แตงกวา ฝรั่ง มะม่วง มะนาว', NULL, 8000, true, ARRAY['veg', 'emoji:🥭']::text[], 66),
  ((SELECT id FROM cat WHERE slug = 'juice'), 'heart-b', 'Heart Beat', 'สตรอว์เบอร์รี่ แอปเปิล สับปะรด', NULL, 8000, true, ARRAY['veg', 'emoji:🍓']::text[], 67),
  ((SELECT id FROM cat WHERE slug = 'juice'), 'immunity', 'Immunity Shot', 'ขิง/กระชาย น้ำผึ้ง มะนาว', NULL, 5500, true, ARRAY['veg', 'emoji:💉']::text[], 68),
  ((SELECT id FROM cat WHERE slug = 'juice'), 'kick-shot', 'Kick Starter Shots', 'น้ำผลไม้สกัดเย็นรวม 6 สูตรในแก้วช็อต', NULL, 25000, true, ARRAY['veg', 'emoji:🥃']::text[], 69),
  ((SELECT id FROM cat WHERE slug = 'juice'), 'hny-ginger', 'Honey Lemon Ginger Soda', 'น้ำผึ้งมะนาวขิง/กระชายโซดา', NULL, 6500, true, ARRAY['veg', 'emoji:🥤']::text[], 70),
  ((SELECT id FROM cat WHERE slug = 'juice'), 'hny-soda', 'Honey Lemon Soda', 'น้ำผึ้งมะนาวโซดา', NULL, 5500, true, ARRAY['veg', 'emoji:🍋']::text[], 71),
  ((SELECT id FROM cat WHERE slug = 'smooth'), 'good-fat', 'Good Fat', 'นม อโวคาโด สไปรูลิน่า', NULL, 13000, true, ARRAY['emoji:🥤']::text[], 72),
  ((SELECT id FROM cat WHERE slug = 'smooth'), 'basic-berries', 'Basic Berries', 'เบอร์รี่รวม นม อาซาอิ', NULL, 12000, true, ARRAY['emoji:🫐']::text[], 73),
  ((SELECT id FROM cat WHERE slug = 'smooth'), 'almond-rush', 'Almond Rush', 'กล้วยหอม อัลมอนด์บัตเตอร์ นม', NULL, 12000, true, ARRAY['emoji:🥜']::text[], 74),
  ((SELECT id FROM cat WHERE slug = 'smooth'), 'coco-mango', 'Coco Mango', 'มะม่วงน้ำ กะทิ โยเกิร์ต กล้วย', NULL, 12000, true, ARRAY['emoji:🥭']::text[], 75),
  ((SELECT id FROM cat WHERE slug = 'smooth'), 'morning-fib', 'Morning Fiber', 'อโวคาโด เคล ปวยเล้ง กล้วย สับปะรด สไปรูลิน่า', NULL, 13000, true, ARRAY['emoji:🌿']::text[], 76),
  ((SELECT id FROM cat WHERE slug = 'coffee'), 'espresso', 'Espresso', 'เอสเพรสโซ่', NULL, 5000, true, ARRAY['emoji:☕']::text[], 77),
  ((SELECT id FROM cat WHERE slug = 'coffee'), 'ameri', 'Americano', 'อเมริกาโน่', NULL, 7500, true, ARRAY['emoji:☕']::text[], 78),
  ((SELECT id FROM cat WHERE slug = 'coffee'), 'latte', 'Latte', 'ลาเต้', NULL, 8500, true, ARRAY['emoji:☕']::text[], 79),
  ((SELECT id FROM cat WHERE slug = 'coffee'), 'cappu', 'Cappuccino', 'คาปูชิโน่', NULL, 8500, true, ARRAY['emoji:☕']::text[], 80),
  ((SELECT id FROM cat WHERE slug = 'coffee'), 'es-yen', 'Es-Yen', 'เอสเย็น', NULL, 9000, true, ARRAY['emoji:🧋']::text[], 81),
  ((SELECT id FROM cat WHERE slug = 'coffee'), 'orange-am', 'Orange Americano', 'ออเรนจ์อเมริกาโน่', NULL, 12000, true, ARRAY['emoji:🍊']::text[], 82),
  ((SELECT id FROM cat WHERE slug = 'coffee'), 'blk-hny-lem', 'Black Honey Lemon', 'แบล็กฮันนี่เลม่อน', NULL, 11000, true, ARRAY['musttry', 'emoji:🍋']::text[], 83),
  ((SELECT id FROM cat WHERE slug = 'tea'), 'masala', 'Masala Tea', 'ชามาซาล่า', NULL, 9500, true, ARRAY['musttry', 'emoji:🫖']::text[], 84),
  ((SELECT id FROM cat WHERE slug = 'tea'), 'matcha-la', 'Matcha Latte', 'มัทฉะลาเต้', NULL, 14000, true, ARRAY['emoji:🍵']::text[], 85),
  ((SELECT id FROM cat WHERE slug = 'tea'), 'pure-match', 'Pure Matcha', 'มัทฉะเพียว', NULL, 14000, true, ARRAY['emoji:🍵']::text[], 86),
  ((SELECT id FROM cat WHERE slug = 'tea'), 'thai-tea', 'Thai Tea', 'ชาไทย', NULL, 8500, true, ARRAY['emoji:🧋']::text[], 87),
  ((SELECT id FROM cat WHERE slug = 'tea'), 'cocoa', 'Cocoa', 'โกโก้', NULL, 8500, true, ARRAY['emoji:🍫']::text[], 88),
  ((SELECT id FROM cat WHERE slug = 'bake'), 'carrot-c', 'Carrot Cake', 'เค้กแครอท', NULL, 14500, true, ARRAY['emoji:🥕']::text[], 89),
  ((SELECT id FROM cat WHERE slug = 'bake'), 'basque', 'Basque Burnt Cheesecake', 'บาสก์เบิร์นชีสเค้ก', NULL, 14500, true, ARRAY['emoji:🍰']::text[], 90),
  ((SELECT id FROM cat WHERE slug = 'bake'), 'banana-c', 'Banana Cake', 'เค้กกล้วยหอม', NULL, 9500, true, ARRAY['emoji:🍌']::text[], 91),
  ((SELECT id FROM cat WHERE slug = 'bake'), 'lemon-c', 'Lemon Cake', 'เค้กเลม่อน', NULL, 12500, true, ARRAY['emoji:🍋']::text[], 92)
ON CONFLICT (slug) DO UPDATE SET name_en = EXCLUDED.name_en, name_th = EXCLUDED.name_th, description = EXCLUDED.description, price_satang = EXCLUDED.price_satang, sort = EXCLUDED.sort, tags = EXCLUDED.tags;

-- 3. Option groups and options (one set per item)
-- Nuke-and-pave: delete existing groups for these items so re-running stays consistent.
DELETE FROM option_groups WHERE menu_item_id IN (SELECT id FROM menu_items WHERE slug IN ('saeb-noodle', 'basic-br', 'sal-men', 'pork-sp', 'sal-sp', 'ck-spicy', 'carbonara', 'tomato-pasta', 'kee-mao', 'pesto-shrimp', 'pesto-salmon', 'truff-cream', 'mex-sand', 'pesto-sand', 'classic-sand', 'nutty-bowl-regular', 'nutty-bowl-large', 'fruitloop-bowl-regular', 'fruitloop-bowl-large', 'classic-bowl-regular', 'classic-bowl-large', 'super-bowl-regular', 'super-bowl-large', 'fudgy-bowl-regular', 'fudgy-bowl-large', 'immunity', 'kick-shot', 'hny-ginger', 'good-fat', 'basic-berries', 'almond-rush', 'morning-fib', 'ameri', 'latte', 'cappu', 'matcha-la', 'pure-match', 'cocoa'));

WITH new_group AS (
  INSERT INTO option_groups (menu_item_id, name, pick_kind, pick_count, sort)
  SELECT id, 'Base', 'one'::option_pick_kind, NULL, 0
  FROM menu_items WHERE slug = 'saeb-noodle'
  RETURNING id
)
INSERT INTO options (group_id, label, price_delta_satang, sort)
SELECT new_group.id, v.label, v.price, v.sort FROM new_group,
  (VALUES
    ('Waiwai Noodles', 0, 0),
    ('Thai Jasmine Rice', 0, 1),
    ('Japanese Brown Rice', 0, 2)
  ) AS v(label, price, sort);

WITH new_group AS (
  INSERT INTO option_groups (menu_item_id, name, pick_kind, pick_count, sort)
  SELECT id, 'Choose a juice', 'one'::option_pick_kind, NULL, 0
  FROM menu_items WHERE slug = 'basic-br'
  RETURNING id
)
INSERT INTO options (group_id, label, price_delta_satang, sort)
SELECT new_group.id, v.label, v.price, v.sort FROM new_group,
  (VALUES
    ('Veggie Joint', 0, 0),
    ('Skin Glow', 0, 1),
    ('Green Sport', 0, 2),
    ('Belly Remedy', 0, 3),
    ('Detox Potion', 0, 4),
    ('Anti Cancer', 0, 5),
    ('Sunshine', 0, 6),
    ('P.M. Sun', 0, 7),
    ('Heart Beat', 0, 8)
  ) AS v(label, price, sort);

WITH new_group AS (
  INSERT INTO option_groups (menu_item_id, name, pick_kind, pick_count, sort)
  SELECT id, 'Rice', 'one'::option_pick_kind, NULL, 0
  FROM menu_items WHERE slug = 'sal-men'
  RETURNING id
)
INSERT INTO options (group_id, label, price_delta_satang, sort)
SELECT new_group.id, v.label, v.price, v.sort FROM new_group,
  (VALUES
    ('Thai Jasmine Rice', 0, 0),
    ('Japanese Brown Rice', 0, 1)
  ) AS v(label, price, sort);

WITH new_group AS (
  INSERT INTO option_groups (menu_item_id, name, pick_kind, pick_count, sort)
  SELECT id, 'Rice', 'one'::option_pick_kind, NULL, 0
  FROM menu_items WHERE slug = 'pork-sp'
  RETURNING id
)
INSERT INTO options (group_id, label, price_delta_satang, sort)
SELECT new_group.id, v.label, v.price, v.sort FROM new_group,
  (VALUES
    ('Thai Jasmine Rice', 0, 0),
    ('Japanese Brown Rice', 0, 1)
  ) AS v(label, price, sort);

WITH new_group AS (
  INSERT INTO option_groups (menu_item_id, name, pick_kind, pick_count, sort)
  SELECT id, 'Rice', 'one'::option_pick_kind, NULL, 0
  FROM menu_items WHERE slug = 'sal-sp'
  RETURNING id
)
INSERT INTO options (group_id, label, price_delta_satang, sort)
SELECT new_group.id, v.label, v.price, v.sort FROM new_group,
  (VALUES
    ('Thai Jasmine Rice', 0, 0),
    ('Japanese Brown Rice', 0, 1)
  ) AS v(label, price, sort);

WITH new_group AS (
  INSERT INTO option_groups (menu_item_id, name, pick_kind, pick_count, sort)
  SELECT id, 'Chicken', 'one'::option_pick_kind, NULL, 0
  FROM menu_items WHERE slug = 'ck-spicy'
  RETURNING id
)
INSERT INTO options (group_id, label, price_delta_satang, sort)
SELECT new_group.id, v.label, v.price, v.sort FROM new_group,
  (VALUES
    ('Grilled chicken', 0, 0),
    ('Fried chicken', 0, 1)
  ) AS v(label, price, sort);

WITH new_group AS (
  INSERT INTO option_groups (menu_item_id, name, pick_kind, pick_count, sort)
  SELECT id, 'Rice', 'one'::option_pick_kind, NULL, 1
  FROM menu_items WHERE slug = 'ck-spicy'
  RETURNING id
)
INSERT INTO options (group_id, label, price_delta_satang, sort)
SELECT new_group.id, v.label, v.price, v.sort FROM new_group,
  (VALUES
    ('Thai Jasmine Rice', 0, 0),
    ('Japanese Brown Rice', 0, 1)
  ) AS v(label, price, sort);

WITH new_group AS (
  INSERT INTO option_groups (menu_item_id, name, pick_kind, pick_count, sort)
  SELECT id, 'Pasta', 'one'::option_pick_kind, NULL, 0
  FROM menu_items WHERE slug = 'carbonara'
  RETURNING id
)
INSERT INTO options (group_id, label, price_delta_satang, sort)
SELECT new_group.id, v.label, v.price, v.sort FROM new_group,
  (VALUES
    ('Spaghetti', 0, 0),
    ('Penne', 0, 1),
    ('Fettuccine', 0, 2)
  ) AS v(label, price, sort);

WITH new_group AS (
  INSERT INTO option_groups (menu_item_id, name, pick_kind, pick_count, sort)
  SELECT id, 'Pasta', 'one'::option_pick_kind, NULL, 0
  FROM menu_items WHERE slug = 'tomato-pasta'
  RETURNING id
)
INSERT INTO options (group_id, label, price_delta_satang, sort)
SELECT new_group.id, v.label, v.price, v.sort FROM new_group,
  (VALUES
    ('Spaghetti', 0, 0),
    ('Penne', 0, 1),
    ('Fettuccine', 0, 2)
  ) AS v(label, price, sort);

WITH new_group AS (
  INSERT INTO option_groups (menu_item_id, name, pick_kind, pick_count, sort)
  SELECT id, 'Pasta', 'one'::option_pick_kind, NULL, 0
  FROM menu_items WHERE slug = 'kee-mao'
  RETURNING id
)
INSERT INTO options (group_id, label, price_delta_satang, sort)
SELECT new_group.id, v.label, v.price, v.sort FROM new_group,
  (VALUES
    ('Spaghetti', 0, 0),
    ('Penne', 0, 1),
    ('Fettuccine', 0, 2)
  ) AS v(label, price, sort);

WITH new_group AS (
  INSERT INTO option_groups (menu_item_id, name, pick_kind, pick_count, sort)
  SELECT id, 'Pasta', 'one'::option_pick_kind, NULL, 0
  FROM menu_items WHERE slug = 'pesto-shrimp'
  RETURNING id
)
INSERT INTO options (group_id, label, price_delta_satang, sort)
SELECT new_group.id, v.label, v.price, v.sort FROM new_group,
  (VALUES
    ('Spaghetti', 0, 0),
    ('Penne', 0, 1),
    ('Fettuccine', 0, 2)
  ) AS v(label, price, sort);

WITH new_group AS (
  INSERT INTO option_groups (menu_item_id, name, pick_kind, pick_count, sort)
  SELECT id, 'Pasta', 'one'::option_pick_kind, NULL, 0
  FROM menu_items WHERE slug = 'pesto-salmon'
  RETURNING id
)
INSERT INTO options (group_id, label, price_delta_satang, sort)
SELECT new_group.id, v.label, v.price, v.sort FROM new_group,
  (VALUES
    ('Spaghetti', 0, 0),
    ('Penne', 0, 1),
    ('Fettuccine', 0, 2)
  ) AS v(label, price, sort);

WITH new_group AS (
  INSERT INTO option_groups (menu_item_id, name, pick_kind, pick_count, sort)
  SELECT id, 'Pasta', 'one'::option_pick_kind, NULL, 0
  FROM menu_items WHERE slug = 'truff-cream'
  RETURNING id
)
INSERT INTO options (group_id, label, price_delta_satang, sort)
SELECT new_group.id, v.label, v.price, v.sort FROM new_group,
  (VALUES
    ('Spaghetti', 0, 0),
    ('Penne', 0, 1),
    ('Fettuccine', 0, 2)
  ) AS v(label, price, sort);

WITH new_group AS (
  INSERT INTO option_groups (menu_item_id, name, pick_kind, pick_count, sort)
  SELECT id, 'Chicken', 'one'::option_pick_kind, NULL, 0
  FROM menu_items WHERE slug = 'mex-sand'
  RETURNING id
)
INSERT INTO options (group_id, label, price_delta_satang, sort)
SELECT new_group.id, v.label, v.price, v.sort FROM new_group,
  (VALUES
    ('Grilled chicken', 0, 0),
    ('Fried chicken', 0, 1)
  ) AS v(label, price, sort);

WITH new_group AS (
  INSERT INTO option_groups (menu_item_id, name, pick_kind, pick_count, sort)
  SELECT id, 'Chicken', 'one'::option_pick_kind, NULL, 0
  FROM menu_items WHERE slug = 'pesto-sand'
  RETURNING id
)
INSERT INTO options (group_id, label, price_delta_satang, sort)
SELECT new_group.id, v.label, v.price, v.sort FROM new_group,
  (VALUES
    ('Grilled chicken', 0, 0),
    ('Fried chicken', 0, 1)
  ) AS v(label, price, sort);

WITH new_group AS (
  INSERT INTO option_groups (menu_item_id, name, pick_kind, pick_count, sort)
  SELECT id, 'Chicken', 'one'::option_pick_kind, NULL, 0
  FROM menu_items WHERE slug = 'classic-sand'
  RETURNING id
)
INSERT INTO options (group_id, label, price_delta_satang, sort)
SELECT new_group.id, v.label, v.price, v.sort FROM new_group,
  (VALUES
    ('Grilled chicken', 0, 0),
    ('Fried chicken', 0, 1)
  ) AS v(label, price, sort);

WITH new_group AS (
  INSERT INTO option_groups (menu_item_id, name, pick_kind, pick_count, sort)
  SELECT id, 'Bowl base', 'one'::option_pick_kind, NULL, 0
  FROM menu_items WHERE slug = 'nutty-bowl-regular'
  RETURNING id
)
INSERT INTO options (group_id, label, price_delta_satang, sort)
SELECT new_group.id, v.label, v.price, v.sort FROM new_group,
  (VALUES
    ('Acai Mixed Berries', 0, 0),
    ('Greek Yoghurt', 1000, 1)
  ) AS v(label, price, sort);

WITH new_group AS (
  INSERT INTO option_groups (menu_item_id, name, pick_kind, pick_count, sort)
  SELECT id, 'Bowl base', 'one'::option_pick_kind, NULL, 0
  FROM menu_items WHERE slug = 'nutty-bowl-large'
  RETURNING id
)
INSERT INTO options (group_id, label, price_delta_satang, sort)
SELECT new_group.id, v.label, v.price, v.sort FROM new_group,
  (VALUES
    ('Acai Mixed Berries', 0, 0),
    ('Greek Yoghurt', 1000, 1)
  ) AS v(label, price, sort);

WITH new_group AS (
  INSERT INTO option_groups (menu_item_id, name, pick_kind, pick_count, sort)
  SELECT id, 'Bowl base', 'one'::option_pick_kind, NULL, 0
  FROM menu_items WHERE slug = 'fruitloop-bowl-regular'
  RETURNING id
)
INSERT INTO options (group_id, label, price_delta_satang, sort)
SELECT new_group.id, v.label, v.price, v.sort FROM new_group,
  (VALUES
    ('Acai Mixed Berries', 0, 0),
    ('Greek Yoghurt', 1000, 1)
  ) AS v(label, price, sort);

WITH new_group AS (
  INSERT INTO option_groups (menu_item_id, name, pick_kind, pick_count, sort)
  SELECT id, 'Bowl base', 'one'::option_pick_kind, NULL, 0
  FROM menu_items WHERE slug = 'fruitloop-bowl-large'
  RETURNING id
)
INSERT INTO options (group_id, label, price_delta_satang, sort)
SELECT new_group.id, v.label, v.price, v.sort FROM new_group,
  (VALUES
    ('Acai Mixed Berries', 0, 0),
    ('Greek Yoghurt', 1000, 1)
  ) AS v(label, price, sort);

WITH new_group AS (
  INSERT INTO option_groups (menu_item_id, name, pick_kind, pick_count, sort)
  SELECT id, 'Bowl base', 'one'::option_pick_kind, NULL, 0
  FROM menu_items WHERE slug = 'classic-bowl-regular'
  RETURNING id
)
INSERT INTO options (group_id, label, price_delta_satang, sort)
SELECT new_group.id, v.label, v.price, v.sort FROM new_group,
  (VALUES
    ('Acai Mixed Berries', 0, 0),
    ('Greek Yoghurt', 1000, 1)
  ) AS v(label, price, sort);

WITH new_group AS (
  INSERT INTO option_groups (menu_item_id, name, pick_kind, pick_count, sort)
  SELECT id, 'Bowl base', 'one'::option_pick_kind, NULL, 0
  FROM menu_items WHERE slug = 'classic-bowl-large'
  RETURNING id
)
INSERT INTO options (group_id, label, price_delta_satang, sort)
SELECT new_group.id, v.label, v.price, v.sort FROM new_group,
  (VALUES
    ('Acai Mixed Berries', 0, 0),
    ('Greek Yoghurt', 1000, 1)
  ) AS v(label, price, sort);

WITH new_group AS (
  INSERT INTO option_groups (menu_item_id, name, pick_kind, pick_count, sort)
  SELECT id, 'Bowl base', 'one'::option_pick_kind, NULL, 0
  FROM menu_items WHERE slug = 'super-bowl-regular'
  RETURNING id
)
INSERT INTO options (group_id, label, price_delta_satang, sort)
SELECT new_group.id, v.label, v.price, v.sort FROM new_group,
  (VALUES
    ('Acai Mixed Berries', 0, 0),
    ('Greek Yoghurt', 1000, 1)
  ) AS v(label, price, sort);

WITH new_group AS (
  INSERT INTO option_groups (menu_item_id, name, pick_kind, pick_count, sort)
  SELECT id, 'Bowl base', 'one'::option_pick_kind, NULL, 0
  FROM menu_items WHERE slug = 'super-bowl-large'
  RETURNING id
)
INSERT INTO options (group_id, label, price_delta_satang, sort)
SELECT new_group.id, v.label, v.price, v.sort FROM new_group,
  (VALUES
    ('Acai Mixed Berries', 0, 0),
    ('Greek Yoghurt', 1000, 1)
  ) AS v(label, price, sort);

WITH new_group AS (
  INSERT INTO option_groups (menu_item_id, name, pick_kind, pick_count, sort)
  SELECT id, 'Bowl base', 'one'::option_pick_kind, NULL, 0
  FROM menu_items WHERE slug = 'fudgy-bowl-regular'
  RETURNING id
)
INSERT INTO options (group_id, label, price_delta_satang, sort)
SELECT new_group.id, v.label, v.price, v.sort FROM new_group,
  (VALUES
    ('Acai Mixed Berries', 0, 0),
    ('Greek Yoghurt', 1000, 1)
  ) AS v(label, price, sort);

WITH new_group AS (
  INSERT INTO option_groups (menu_item_id, name, pick_kind, pick_count, sort)
  SELECT id, 'Bowl base', 'one'::option_pick_kind, NULL, 0
  FROM menu_items WHERE slug = 'fudgy-bowl-large'
  RETURNING id
)
INSERT INTO options (group_id, label, price_delta_satang, sort)
SELECT new_group.id, v.label, v.price, v.sort FROM new_group,
  (VALUES
    ('Acai Mixed Berries', 0, 0),
    ('Greek Yoghurt', 1000, 1)
  ) AS v(label, price, sort);

WITH new_group AS (
  INSERT INTO option_groups (menu_item_id, name, pick_kind, pick_count, sort)
  SELECT id, 'Base', 'one'::option_pick_kind, NULL, 0
  FROM menu_items WHERE slug = 'immunity'
  RETURNING id
)
INSERT INTO options (group_id, label, price_delta_satang, sort)
SELECT new_group.id, v.label, v.price, v.sort FROM new_group,
  (VALUES
    ('Ginger', 0, 0),
    ('Fingerroot', 0, 1)
  ) AS v(label, price, sort);

WITH new_group AS (
  INSERT INTO option_groups (menu_item_id, name, pick_kind, pick_count, sort)
  SELECT id, 'Choose 6 juices', 'exact'::option_pick_kind, 6, 0
  FROM menu_items WHERE slug = 'kick-shot'
  RETURNING id
)
INSERT INTO options (group_id, label, price_delta_satang, sort)
SELECT new_group.id, v.label, v.price, v.sort FROM new_group,
  (VALUES
    ('Veggie Joint', 0, 0),
    ('Skin Glow', 0, 1),
    ('Green Sport', 0, 2),
    ('Belly Remedy', 0, 3),
    ('Detox Potion', 0, 4),
    ('Anti Cancer', 0, 5),
    ('Sunshine', 0, 6),
    ('P.M. Sun', 0, 7),
    ('Heart Beat', 0, 8)
  ) AS v(label, price, sort);

WITH new_group AS (
  INSERT INTO option_groups (menu_item_id, name, pick_kind, pick_count, sort)
  SELECT id, 'Base', 'one'::option_pick_kind, NULL, 0
  FROM menu_items WHERE slug = 'hny-ginger'
  RETURNING id
)
INSERT INTO options (group_id, label, price_delta_satang, sort)
SELECT new_group.id, v.label, v.price, v.sort FROM new_group,
  (VALUES
    ('Ginger', 0, 0),
    ('Fingerroot', 0, 1)
  ) AS v(label, price, sort);

WITH new_group AS (
  INSERT INTO option_groups (menu_item_id, name, pick_kind, pick_count, sort)
  SELECT id, 'Milk', 'one'::option_pick_kind, NULL, 0
  FROM menu_items WHERE slug = 'good-fat'
  RETURNING id
)
INSERT INTO options (group_id, label, price_delta_satang, sort)
SELECT new_group.id, v.label, v.price, v.sort FROM new_group,
  (VALUES
    ('Milk', 0, 0),
    ('Oat milk', 1000, 1),
    ('Almond milk', 1000, 2)
  ) AS v(label, price, sort);

WITH new_group AS (
  INSERT INTO option_groups (menu_item_id, name, pick_kind, pick_count, sort)
  SELECT id, 'Milk', 'one'::option_pick_kind, NULL, 0
  FROM menu_items WHERE slug = 'basic-berries'
  RETURNING id
)
INSERT INTO options (group_id, label, price_delta_satang, sort)
SELECT new_group.id, v.label, v.price, v.sort FROM new_group,
  (VALUES
    ('Milk', 0, 0),
    ('Oat milk', 1000, 1),
    ('Almond milk', 1000, 2)
  ) AS v(label, price, sort);

WITH new_group AS (
  INSERT INTO option_groups (menu_item_id, name, pick_kind, pick_count, sort)
  SELECT id, 'Milk', 'one'::option_pick_kind, NULL, 0
  FROM menu_items WHERE slug = 'almond-rush'
  RETURNING id
)
INSERT INTO options (group_id, label, price_delta_satang, sort)
SELECT new_group.id, v.label, v.price, v.sort FROM new_group,
  (VALUES
    ('Milk', 0, 0),
    ('Oat milk', 1000, 1),
    ('Almond milk', 1000, 2)
  ) AS v(label, price, sort);

WITH new_group AS (
  INSERT INTO option_groups (menu_item_id, name, pick_kind, pick_count, sort)
  SELECT id, 'Milk', 'one'::option_pick_kind, NULL, 0
  FROM menu_items WHERE slug = 'morning-fib'
  RETURNING id
)
INSERT INTO options (group_id, label, price_delta_satang, sort)
SELECT new_group.id, v.label, v.price, v.sort FROM new_group,
  (VALUES
    ('Milk', 0, 0),
    ('Oat milk', 1000, 1),
    ('Almond milk', 1000, 2)
  ) AS v(label, price, sort);

WITH new_group AS (
  INSERT INTO option_groups (menu_item_id, name, pick_kind, pick_count, sort)
  SELECT id, 'Temperature', 'one'::option_pick_kind, NULL, 0
  FROM menu_items WHERE slug = 'ameri'
  RETURNING id
)
INSERT INTO options (group_id, label, price_delta_satang, sort)
SELECT new_group.id, v.label, v.price, v.sort FROM new_group,
  (VALUES
    ('Hot', 0, 0),
    ('Iced', 500, 1)
  ) AS v(label, price, sort);

WITH new_group AS (
  INSERT INTO option_groups (menu_item_id, name, pick_kind, pick_count, sort)
  SELECT id, 'Temperature', 'one'::option_pick_kind, NULL, 0
  FROM menu_items WHERE slug = 'latte'
  RETURNING id
)
INSERT INTO options (group_id, label, price_delta_satang, sort)
SELECT new_group.id, v.label, v.price, v.sort FROM new_group,
  (VALUES
    ('Hot', 0, 0),
    ('Iced', 500, 1)
  ) AS v(label, price, sort);

WITH new_group AS (
  INSERT INTO option_groups (menu_item_id, name, pick_kind, pick_count, sort)
  SELECT id, 'Temperature', 'one'::option_pick_kind, NULL, 0
  FROM menu_items WHERE slug = 'cappu'
  RETURNING id
)
INSERT INTO options (group_id, label, price_delta_satang, sort)
SELECT new_group.id, v.label, v.price, v.sort FROM new_group,
  (VALUES
    ('Hot', 0, 0),
    ('Iced', 500, 1)
  ) AS v(label, price, sort);

WITH new_group AS (
  INSERT INTO option_groups (menu_item_id, name, pick_kind, pick_count, sort)
  SELECT id, 'Temperature', 'one'::option_pick_kind, NULL, 0
  FROM menu_items WHERE slug = 'matcha-la'
  RETURNING id
)
INSERT INTO options (group_id, label, price_delta_satang, sort)
SELECT new_group.id, v.label, v.price, v.sort FROM new_group,
  (VALUES
    ('Hot', 0, 0),
    ('Iced', 1000, 1)
  ) AS v(label, price, sort);

WITH new_group AS (
  INSERT INTO option_groups (menu_item_id, name, pick_kind, pick_count, sort)
  SELECT id, 'Temperature', 'one'::option_pick_kind, NULL, 0
  FROM menu_items WHERE slug = 'pure-match'
  RETURNING id
)
INSERT INTO options (group_id, label, price_delta_satang, sort)
SELECT new_group.id, v.label, v.price, v.sort FROM new_group,
  (VALUES
    ('Hot', 0, 0),
    ('Iced', 1000, 1)
  ) AS v(label, price, sort);

WITH new_group AS (
  INSERT INTO option_groups (menu_item_id, name, pick_kind, pick_count, sort)
  SELECT id, 'Temperature', 'one'::option_pick_kind, NULL, 0
  FROM menu_items WHERE slug = 'cocoa'
  RETURNING id
)
INSERT INTO options (group_id, label, price_delta_satang, sort)
SELECT new_group.id, v.label, v.price, v.sort FROM new_group,
  (VALUES
    ('Hot', 0, 0),
    ('Iced', -3500, 1)
  ) AS v(label, price, sort);

COMMIT;