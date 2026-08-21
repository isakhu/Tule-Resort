-- Client demo enrichment for the 100-item restaurant menu.
-- Prices are SAMPLE ESTIMATES for presentation only; replace with final business prices later.
-- Every demo item receives a representative food image so the client can preview the visual menu.

BEGIN;

UPDATE public.menu_items
SET
  price = CASE name
    WHEN 'Chechebsa' THEN 220
    WHEN 'Firfir' THEN 210
    WHEN 'Fetira' THEN 260
    WHEN 'Genfo' THEN 190
    WHEN 'Full Medames' THEN 220
    WHEN 'Scrambled Eggs' THEN 200
    WHEN 'Tule Breakfast' THEN 380
    WHEN 'Pancakes' THEN 280
    WHEN 'French Toast' THEN 270
    WHEN 'Avocado Toast' THEN 320

    WHEN 'Shiro' THEN 320
    WHEN 'Doro Wot' THEN 520
    WHEN 'Key Wot' THEN 540
    WHEN 'Alicha Wot' THEN 520
    WHEN 'Tibs' THEN 560
    WHEN 'Awaze Tibs' THEN 590
    WHEN 'Gored Gored' THEN 590
    WHEN 'Kitfo' THEN 620
    WHEN 'Beyaynetu' THEN 450
    WHEN 'Vegetable Shiro' THEN 340
    WHEN 'Misir Wot' THEN 310
    WHEN 'Azifa' THEN 290
    WHEN 'Gomen' THEN 280
    WHEN 'Fosolia' THEN 280
    WHEN 'Atkilt Alicha' THEN 290

    WHEN 'Grilled Chicken Breast' THEN 520
    WHEN 'Chicken Schnitzel' THEN 560
    WHEN 'Chicken Alfredo' THEN 590
    WHEN 'Chicken Curry' THEN 560
    WHEN 'Chicken Teriyaki' THEN 570
    WHEN 'Beef Steak' THEN 820
    WHEN 'Pepper Steak' THEN 700
    WHEN 'Beef Stroganoff' THEN 720
    WHEN 'Grilled Lamb Chops' THEN 850
    WHEN 'Lamb Curry' THEN 730

    WHEN 'Grilled Tilapia' THEN 620
    WHEN 'Fried Tilapia' THEN 640
    WHEN 'Fish and Chips' THEN 590
    WHEN 'Garlic Butter Fish' THEN 650
    WHEN 'Fish Curry' THEN 620
    WHEN 'Grilled Prawns' THEN 780
    WHEN 'Prawn Pasta' THEN 760
    WHEN 'Seafood Rice' THEN 740
    WHEN 'Crispy Calamari' THEN 690
    WHEN 'Lemon Herb Fish' THEN 640

    WHEN 'Margherita Pizza' THEN 520
    WHEN 'Chicken Pizza' THEN 590
    WHEN 'Beef Pizza' THEN 620
    WHEN 'Veggie Pizza' THEN 550
    WHEN 'Pepperoni Pizza' THEN 620
    WHEN 'Tuna Pizza' THEN 600
    WHEN 'Four Cheese Pizza' THEN 650
    WHEN 'Hawassa Special Pizza' THEN 690
    WHEN 'Garlic Cheese Pizza' THEN 560
    WHEN 'Spicy Berbere Pizza' THEN 650

    WHEN 'Spaghetti Bolognese' THEN 540
    WHEN 'Spaghetti Arrabbiata' THEN 470
    WHEN 'Penne Alfredo' THEN 500
    WHEN 'Chicken Penne' THEN 570
    WHEN 'Beef Lasagna' THEN 620
    WHEN 'Vegetable Lasagna' THEN 560
    WHEN 'Pesto Pasta' THEN 520
    WHEN 'Seafood Linguine' THEN 760
    WHEN 'Mac and Cheese' THEN 480
    WHEN 'Tuna Pasta' THEN 540

    WHEN 'Tule Classic Burger' THEN 520
    WHEN 'Cheese Burger' THEN 560
    WHEN 'Chicken Burger' THEN 540
    WHEN 'Double Beef Burger' THEN 680
    WHEN 'Spicy Chicken Burger' THEN 580
    WHEN 'Club Sandwich' THEN 520
    WHEN 'Chicken Wrap' THEN 500
    WHEN 'Beef Wrap' THEN 540
    WHEN 'Tuna Sandwich' THEN 490
    WHEN 'Veggie Sandwich' THEN 450

    WHEN 'French Fries' THEN 220
    WHEN 'Sweet Potato Fries' THEN 260
    WHEN 'Potato Wedges' THEN 240
    WHEN 'Garlic Bread' THEN 210
    WHEN 'Mixed Green Salad' THEN 280
    WHEN 'Greek Salad' THEN 320
    WHEN 'Coleslaw' THEN 220
    WHEN 'Steamed Vegetables' THEN 250
    WHEN 'Rice Pilaf' THEN 220
    WHEN 'Roasted Potatoes' THEN 240

    WHEN 'Mango Cheesecake' THEN 380
    WHEN 'Chocolate Cake' THEN 340
    WHEN 'Carrot Cake' THEN 320
    WHEN 'Tiramisu' THEN 390
    WHEN 'Brownie' THEN 300
    WHEN 'Fruit Salad' THEN 280
    WHEN 'Banana Pancakes' THEN 320
    WHEN 'Ice Cream' THEN 260
    WHEN 'Lemon Tart' THEN 320
    WHEN 'Honey Baklava' THEN 300

    WHEN 'Ethiopian Coffee' THEN 180
    WHEN 'Macchiato' THEN 160
    WHEN 'Cappuccino' THEN 190
    WHEN 'Latte' THEN 210
    WHEN 'Fresh Mango Juice' THEN 220
    WHEN 'Fresh Avocado Juice' THEN 220
    WHEN 'Fresh Papaya Juice' THEN 210
    WHEN 'Lemonade' THEN 170
    WHEN 'Tropical Juice' THEN 230
    WHEN 'Orange Juice' THEN 200
    ELSE price
  END,
  image_url = CASE category
    WHEN 'Breakfast' THEN 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=1200&q=85'
    WHEN 'Ethiopian' THEN 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=1200&q=85'
    WHEN 'Mains' THEN 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=85'
    WHEN 'Fish & Seafood' THEN 'https://images.unsplash.com/photo-1544943910-4c1dc44aab44?auto=format&fit=crop&w=1200&q=85'
    WHEN 'Pizza' THEN 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=1200&q=85'
    WHEN 'Pasta' THEN 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=1200&q=85'
    WHEN 'Burgers & Sandwiches' THEN 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=85'
    WHEN 'Sides & Salads' THEN 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=85'
    WHEN 'Desserts' THEN 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=1200&q=85'
    WHEN 'Drinks' THEN 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=1200&q=85'
    ELSE image_url
  END,
  is_active = true,
  is_available = true
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

COMMIT;
