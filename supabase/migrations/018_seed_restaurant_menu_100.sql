-- Tule Resort demo restaurant menu: exactly 100 food/drink items.
-- Safe to rerun: removes only items with the exact demo names below before reseeding.

BEGIN;

DO $$
DECLARE
  restaurant_department_id INTEGER;
BEGIN
  SELECT id INTO restaurant_department_id FROM public.departments WHERE name = 'Restaurant' LIMIT 1;
  IF restaurant_department_id IS NULL THEN
    INSERT INTO public.departments (name) VALUES ('Restaurant') RETURNING id INTO restaurant_department_id;
  END IF;

  DELETE FROM public.menu_items
  WHERE name IN (
    'Chechebsa','Firfir','Fetira','Genfo','Full Medames','Scrambled Eggs','Tule Breakfast','Pancakes','French Toast','Avocado Toast',
    'Shiro','Doro Wot','Key Wot','Alicha Wot','Tibs','Awaze Tibs','Gored Gored','Kitfo','Beyaynetu','Vegetable Shiro','Misir Wot','Azifa','Gomen','Fosolia','Atkilt Alicha',
    'Grilled Chicken Breast','Chicken Schnitzel','Chicken Alfredo','Chicken Curry','Chicken Teriyaki','Beef Steak','Pepper Steak','Beef Stroganoff','Grilled Lamb Chops','Lamb Curry',
    'Grilled Tilapia','Fried Tilapia','Fish and Chips','Garlic Butter Fish','Fish Curry','Grilled Prawns','Prawn Pasta','Seafood Rice','Crispy Calamari','Lemon Herb Fish',
    'Margherita Pizza','Chicken Pizza','Beef Pizza','Veggie Pizza','Pepperoni Pizza','Tuna Pizza','Four Cheese Pizza','Hawassa Special Pizza','Garlic Cheese Pizza','Spicy Berbere Pizza',
    'Spaghetti Bolognese','Spaghetti Arrabbiata','Penne Alfredo','Chicken Penne','Beef Lasagna','Vegetable Lasagna','Pesto Pasta','Seafood Linguine','Mac and Cheese','Tuna Pasta',
    'Tule Classic Burger','Cheese Burger','Chicken Burger','Double Beef Burger','Spicy Chicken Burger','Club Sandwich','Chicken Wrap','Beef Wrap','Tuna Sandwich','Veggie Sandwich',
    'French Fries','Sweet Potato Fries','Potato Wedges','Garlic Bread','Mixed Green Salad','Greek Salad','Coleslaw','Steamed Vegetables','Rice Pilaf','Roasted Potatoes',
    'Mango Cheesecake','Chocolate Cake','Carrot Cake','Tiramisu','Brownie','Fruit Salad','Banana Pancakes','Ice Cream','Lemon Tart','Honey Baklava',
    'Ethiopian Coffee','Macchiato','Cappuccino','Latte','Fresh Mango Juice','Fresh Avocado Juice','Fresh Papaya Juice','Lemonade','Tropical Juice','Orange Juice'
  );

  INSERT INTO public.menu_items (name, amharic_name, description, category, price, image_url, department_id) VALUES
  ('Chechebsa','ጨጨብሳ','Shredded flatbread tossed with spiced butter and honey.','Breakfast',180,NULL,restaurant_department_id),
  ('Firfir','ፍርፍር','Torn injera simmered with berbere sauce and clarified butter.','Breakfast',170,NULL,restaurant_department_id),
  ('Fetira','ፈጢራ','Layered pan-fried bread served with honey and egg.','Breakfast',220,NULL,restaurant_department_id),
  ('Genfo','ገንፎ','Traditional barley porridge with spiced butter and berbere.','Breakfast',160,NULL,restaurant_department_id),
  ('Full Medames','ፉል ሜዳመስ','Warm fava beans with tomato, onion, oil and spices.','Breakfast',180,NULL,restaurant_department_id),
  ('Scrambled Eggs','የተደባለቁ እንቁላሎች','Creamy scrambled eggs with toast and fresh vegetables.','Breakfast',160,NULL,restaurant_department_id),
  ('Tule Breakfast','የቱሌ ቁርስ','Eggs, ful, toast, fruit and Ethiopian coffee.','Breakfast',320,NULL,restaurant_department_id),
  ('Pancakes','ፓንኬክ','Fluffy pancakes served with honey and fresh fruit.','Breakfast',240,NULL,restaurant_department_id),
  ('French Toast','ፈረንሳይ ቶስት','Golden French toast with honey and seasonal fruit.','Breakfast',230,NULL,restaurant_department_id),
  ('Avocado Toast','አቮካዶ ቶስት','Toasted bread topped with avocado, tomato and herbs.','Breakfast',260,NULL,restaurant_department_id),

  ('Shiro','ሽሮ','Smooth chickpea stew seasoned with berbere and garlic.','Ethiopian',260,NULL,restaurant_department_id),
  ('Doro Wot','ዶሮ ወጥ','Classic spicy chicken stew with egg and injera.','Ethiopian',420,NULL,restaurant_department_id),
  ('Key Wot','ቀይ ወጥ','Tender beef cubes cooked slowly in berbere sauce.','Ethiopian',440,NULL,restaurant_department_id),
  ('Alicha Wot','አሊቻ ወጥ','Mild beef stew with turmeric, ginger and garlic.','Ethiopian',420,NULL,restaurant_department_id),
  ('Tibs','ጥብስ','Sautéed beef with onions, peppers and rosemary.','Ethiopian',440,NULL,restaurant_department_id),
  ('Awaze Tibs','አዋዜ ጥብስ','Sizzling beef tibs with spicy awaze sauce.','Ethiopian',470,NULL,restaurant_department_id),
  ('Gored Gored','ጎረድ ጎረድ','Diced beef tossed with mitmita and spiced butter.','Ethiopian',460,NULL,restaurant_department_id),
  ('Kitfo','ክትፎ','Minced beef seasoned with mitmita and spiced butter.','Ethiopian',480,NULL,restaurant_department_id),
  ('Beyaynetu','በየአይነቱ','Assorted vegetarian stews and salads served with injera.','Ethiopian',360,NULL,restaurant_department_id),
  ('Vegetable Shiro','የአትክልት ሽሮ','Chickpea stew enriched with seasonal vegetables.','Ethiopian',280,NULL,restaurant_department_id),
  ('Misir Wot','ምስር ወጥ','Spicy red lentils cooked with berbere and onions.','Ethiopian',250,NULL,restaurant_department_id),
  ('Azifa','አዚፋ','Green lentil salad with lemon, mustard and herbs.','Ethiopian',230,NULL,restaurant_department_id),
  ('Gomen','ጎመን','Collard greens sautéed with garlic and ginger.','Ethiopian',220,NULL,restaurant_department_id),
  ('Fosolia','ፎሶሊያ','Green beans and carrots sautéed with onions and spices.','Ethiopian',220,NULL,restaurant_department_id),
  ('Atkilt Alicha','አትክልት አሊቻ','Potato, cabbage and carrot stew with turmeric.','Ethiopian',230,NULL,restaurant_department_id),

  ('Grilled Chicken Breast','የተጠበሰ የዶሮ ሥጋ','Herb-marinated chicken breast with vegetables.','Mains',420,NULL,restaurant_department_id),
  ('Chicken Schnitzel','የዶሮ ሽኒትዘል','Crispy breaded chicken with fries and salad.','Mains',450,NULL,restaurant_department_id),
  ('Chicken Alfredo','የዶሮ አልፍሬዶ','Creamy pasta with grilled chicken and parmesan.','Mains',470,NULL,restaurant_department_id),
  ('Chicken Curry','የዶሮ ካሪ','Mild coconut curry with chicken and steamed rice.','Mains',440,NULL,restaurant_department_id),
  ('Chicken Teriyaki','የዶሮ ቴሪያኪ','Glazed chicken with vegetables and steamed rice.','Mains',450,NULL,restaurant_department_id),
  ('Beef Steak','የበሬ ስቴክ','Grilled beef steak with potatoes and vegetables.','Mains',650,NULL,restaurant_department_id),
  ('Pepper Steak','የፔፐር ስቴክ','Beef strips in creamy pepper sauce with fries.','Mains',560,NULL,restaurant_department_id),
  ('Beef Stroganoff','የበሬ ስትሮጋኖፍ','Tender beef in mushroom cream sauce with rice.','Mains',580,NULL,restaurant_department_id),
  ('Grilled Lamb Chops','የበግ ቁርጥራጭ','Herb-grilled lamb chops with roasted vegetables.','Mains',620,NULL,restaurant_department_id),
  ('Lamb Curry','የበግ ካሪ','Slow-cooked lamb in aromatic curry sauce.','Mains',580,NULL,restaurant_department_id),

  ('Grilled Tilapia','የተጠበሰ ጥብላፒያ','Fresh tilapia with lemon, vegetables and potatoes.','Fish & Seafood',500,NULL,restaurant_department_id),
  ('Fried Tilapia','የተጠበሰ ጥብላፒያ','Crispy fried tilapia with chips and salad.','Fish & Seafood',520,NULL,restaurant_department_id),
  ('Fish and Chips','ዓሣ እና ቺፕስ','Crispy fish fillet with fries and tartar sauce.','Fish & Seafood',480,NULL,restaurant_department_id),
  ('Garlic Butter Fish','የዓሣ ጋርሊክ በተር','Pan-seared fish with garlic butter and rice.','Fish & Seafood',520,NULL,restaurant_department_id),
  ('Fish Curry','የዓሣ ካሪ','Tender fish in a fragrant coconut curry.','Fish & Seafood',510,NULL,restaurant_department_id),
  ('Grilled Prawns','የተጠበሰ ሽሪምፕ','Char-grilled prawns with garlic, lemon and salad.','Fish & Seafood',620,NULL,restaurant_department_id),
  ('Prawn Pasta','የሽሪምፕ ፓስታ','Creamy pasta tossed with prawns and herbs.','Fish & Seafood',650,NULL,restaurant_department_id),
  ('Seafood Rice','የባህር ምግብ ሩዝ','Seasoned rice with mixed seafood and vegetables.','Fish & Seafood',620,NULL,restaurant_department_id),
  ('Crispy Calamari','ክሪስፒ ካላማሪ','Lightly fried calamari with lemon and dipping sauce.','Fish & Seafood',560,NULL,restaurant_department_id),
  ('Lemon Herb Fish','ሎሚ እና ሀርብ ዓሣ','Oven-baked fish with lemon herbs and vegetables.','Fish & Seafood',500,NULL,restaurant_department_id),

  ('Margherita Pizza','ማርጋሪታ ፒዛ','Tomato, mozzarella, basil and olive oil.','Pizza',390,NULL,restaurant_department_id),
  ('Chicken Pizza','የዶሮ ፒዛ','Chicken, mozzarella, peppers and onions.','Pizza',450,NULL,restaurant_department_id),
  ('Beef Pizza','የበሬ ፒዛ','Seasoned beef, cheese, onions and peppers.','Pizza',470,NULL,restaurant_department_id),
  ('Veggie Pizza','የአትክልት ፒዛ','Mushrooms, peppers, onions, tomato and olives.','Pizza',410,NULL,restaurant_department_id),
  ('Pepperoni Pizza','ፔፐሮኒ ፒዛ','Pepperoni, mozzarella and tomato sauce.','Pizza',460,NULL,restaurant_department_id),
  ('Tuna Pizza','ቱና ፒዛ','Tuna, sweet corn, onion and mozzarella.','Pizza',450,NULL,restaurant_department_id),
  ('Four Cheese Pizza','አራት አይነት አይብ ፒዛ','Rich blend of four cheeses on tomato sauce.','Pizza',490,NULL,restaurant_department_id),
  ('Hawassa Special Pizza','የሐዋሳ ስፔሻል ፒዛ','Chicken, beef, peppers, onions and olives.','Pizza',520,NULL,restaurant_department_id),
  ('Garlic Cheese Pizza','ነጭ ሽንኩርት እና አይብ ፒዛ','Garlic butter, mozzarella and herbs.','Pizza',420,NULL,restaurant_department_id),
  ('Spicy Berbere Pizza','በርበሬ ስፒሲ ፒዛ','Spiced beef, berbere, onions and mozzarella.','Pizza',490,NULL,restaurant_department_id),

  ('Spaghetti Bolognese','ስፓጌቲ ቦሎኛይዝ','Classic spaghetti with slow-cooked beef tomato sauce.','Pasta',400,NULL,restaurant_department_id),
  ('Spaghetti Arrabbiata','ስፓጌቲ አራቢያታ','Spaghetti with spicy tomato and garlic sauce.','Pasta',350,NULL,restaurant_department_id),
  ('Penne Alfredo','ፔኔ አልፍሬዶ','Penne with creamy parmesan sauce.','Pasta',380,NULL,restaurant_department_id),
  ('Chicken Penne','የዶሮ ፔኔ','Penne with grilled chicken, tomato and herbs.','Pasta',440,NULL,restaurant_department_id),
  ('Beef Lasagna','የበሬ ላዛኛ','Layered pasta with beef ragù and cheese.','Pasta',470,NULL,restaurant_department_id),
  ('Vegetable Lasagna','የአትክልት ላዛኛ','Layers of vegetables, tomato and cheese.','Pasta',420,NULL,restaurant_department_id),
  ('Pesto Pasta','ፔስቶ ፓስታ','Pasta with basil pesto, parmesan and cherry tomatoes.','Pasta',390,NULL,restaurant_department_id),
  ('Seafood Linguine','የባህር ምግብ ሊንጉዊኒ','Linguine with mixed seafood in garlic tomato sauce.','Pasta',610,NULL,restaurant_department_id),
  ('Mac and Cheese','ማካሮኒ እና አይብ','Creamy baked macaroni with melted cheese.','Pasta',360,NULL,restaurant_department_id),
  ('Tuna Pasta','ቱና ፓስታ','Pasta with tuna, sweet corn and light cream sauce.','Pasta',390,NULL,restaurant_department_id),

  ('Tule Classic Burger','የቱሌ በርገር','Beef patty, cheese, lettuce, tomato and fries.','Burgers & Sandwiches',420,NULL,restaurant_department_id),
  ('Cheese Burger','ቺዝ በርገር','Beef patty with cheddar, lettuce and tomato.','Burgers & Sandwiches',440,NULL,restaurant_department_id),
  ('Chicken Burger','የዶሮ በርገር','Crispy chicken, lettuce, tomato and fries.','Burgers & Sandwiches',420,NULL,restaurant_department_id),
  ('Double Beef Burger','ድርብ የበሬ በርገር','Two beef patties, cheese and special sauce.','Burgers & Sandwiches',560,NULL,restaurant_department_id),
  ('Spicy Chicken Burger','ቅመም የዶሮ በርገር','Spicy crispy chicken with jalapeño and sauce.','Burgers & Sandwiches',450,NULL,restaurant_department_id),
  ('Club Sandwich','ክለብ ሳንድዊች','Chicken, egg, lettuce, tomato and toasted bread.','Burgers & Sandwiches',390,NULL,restaurant_department_id),
  ('Chicken Wrap','የዶሮ ውራፕ','Grilled chicken, vegetables and garlic sauce in flatbread.','Burgers & Sandwiches',360,NULL,restaurant_department_id),
  ('Beef Wrap','የበሬ ውራፕ','Beef strips, peppers, onions and sauce in flatbread.','Burgers & Sandwiches',390,NULL,restaurant_department_id),
  ('Tuna Sandwich','ቱና ሳንድዊች','Tuna, lettuce, tomato and mayonnaise on toasted bread.','Burgers & Sandwiches',340,NULL,restaurant_department_id),
  ('Veggie Sandwich','የአትክልት ሳንድዊች','Fresh vegetables, avocado and cheese on toasted bread.','Burgers & Sandwiches',320,NULL,restaurant_department_id),

  ('French Fries','ፈረንሳይ ጥብስ','Crispy golden fries with house seasoning.','Sides',140,NULL,restaurant_department_id),
  ('Sweet Potato Fries','የስኳር ድንች ጥብስ','Crispy sweet potato fries.','Sides',170,NULL,restaurant_department_id),
  ('Potato Wedges','የድንች ዋጅስ','Seasoned roasted potato wedges.','Sides',160,NULL,restaurant_department_id),
  ('Garlic Bread','የነጭ ሽንኩርት ዳቦ','Warm bread with garlic butter and herbs.','Sides',150,NULL,restaurant_department_id),
  ('Mixed Green Salad','የአረንጓዴ ሰላጣ','Fresh greens, tomato, cucumber and vinaigrette.','Sides',190,NULL,restaurant_department_id),
  ('Greek Salad','ግሪክ ሰላጣ','Cucumber, tomato, olives, onion and feta.','Sides',240,NULL,restaurant_department_id),
  ('Coleslaw','ኮልስላው','Creamy cabbage and carrot slaw.','Sides',140,NULL,restaurant_department_id),
  ('Steamed Vegetables','የተንፋሱ አትክልቶች','Seasonal vegetables lightly steamed and seasoned.','Sides',160,NULL,restaurant_department_id),
  ('Rice Pilaf','ሩዝ ፒላፍ','Fragrant rice with herbs and vegetables.','Sides',170,NULL,restaurant_department_id),
  ('Roasted Potatoes','የተጠበሰ ድንች','Herb-roasted potatoes with garlic.','Sides',160,NULL,restaurant_department_id),

  ('Mango Cheesecake','ማንጎ ቺዝኬክ','Creamy cheesecake topped with mango.','Desserts',260,NULL,restaurant_department_id),
  ('Chocolate Cake','ቸኮሌት ኬክ','Rich chocolate layer cake.','Desserts',240,NULL,restaurant_department_id),
  ('Carrot Cake','ካሮት ኬክ','Moist carrot cake with cream cheese frosting.','Desserts',230,NULL,restaurant_department_id),
  ('Tiramisu','ቲራሚሱ','Coffee-soaked cake with mascarpone cream.','Desserts',280,NULL,restaurant_department_id),
  ('Brownie','ብራውኒ','Warm chocolate brownie with a soft center.','Desserts',210,NULL,restaurant_department_id),
  ('Fruit Salad','የፍራፍሬ ሰላጣ','Seasonal fresh fruit with honey and lime.','Desserts',200,NULL,restaurant_department_id),
  ('Banana Pancakes','የሙዝ ፓንኬክ','Warm banana pancakes with honey.','Desserts',230,NULL,restaurant_department_id),
  ('Ice Cream','አይስክሬም','Two scoops of house-selected ice cream.','Desserts',180,NULL,restaurant_department_id),
  ('Lemon Tart','የሎሚ ታርት','Tangy lemon tart with crisp pastry.','Desserts',230,NULL,restaurant_department_id),
  ('Honey Baklava','ማር ባክላቫ','Crisp pastry layers with nuts and honey.','Desserts',250,NULL,restaurant_department_id),

  ('Ethiopian Coffee','የኢትዮጵያ ቡና','Freshly brewed Ethiopian coffee, served hot.','Drinks',120,NULL,restaurant_department_id),
  ('Macchiato','ማኪያቶ','Espresso topped with steamed milk.','Drinks',130,NULL,restaurant_department_id),
  ('Cappuccino','ካፑቺኖ','Espresso with steamed milk and foam.','Drinks',160,NULL,restaurant_department_id),
  ('Latte','ላቴ','Smooth espresso with steamed milk.','Drinks',170,NULL,restaurant_department_id),
  ('Fresh Mango Juice','ትኩስ ማንጎ ጭማቂ','Freshly blended mango juice.','Drinks',180,NULL,restaurant_department_id),
  ('Fresh Avocado Juice','ትኩስ አቮካዶ ጭማቂ','Fresh avocado juice with a light citrus finish.','Drinks',190,NULL,restaurant_department_id),
  ('Fresh Papaya Juice','ትኩስ ፓፓያ ጭማቂ','Fresh papaya juice served chilled.','Drinks',170,NULL,restaurant_department_id),
  ('Lemonade','ሎሚናዴ','Fresh lemon juice with a touch of honey.','Drinks',140,NULL,restaurant_department_id),
  ('Tropical Juice','ትሮፒካል ጭማቂ','Refreshing blend of pineapple, passion fruit and orange.','Drinks',190,NULL,restaurant_department_id),
  ('Orange Juice','የብርቱካን ጭማቂ','Fresh orange juice served chilled.','Drinks',160,NULL,restaurant_department_id);
END $$;

COMMIT;
