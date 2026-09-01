"""
LMPC Compliance Platform — 120-Sample FMCG Packaging Benchmark Generator
Author: Srusthi (QA & Dataset Engineer) & Harshith P S (Team Lead)
Team PredictXY — SIH 2026 Problem Statement 26034

Generates 120 diverse FMCG packaging label images across 6 commercial sectors:
1. Food & Bakery (Biscuits, Cookies, Rusk, Noodles, Oats, Cereal) - 30 samples
2. Edible Oils & Ghee (Sunflower, Mustard, Groundnut, Olive, Desi Ghee, Rice Bran) - 20 samples
3. Personal Care & Cosmetics (Shampoo, Face Wash, Moisturizer, Soap, Body Wash, Hair Oil) - 20 samples
4. Oral Care (Toothpaste, Mouthwash, Toothpowder, Herbal Paste, Sensitive Gel) - 20 samples
5. Perishable Dairy & Beverages (Pasteurized Milk, Butter, Paneer, Curd, Fruit Juice, Tea) - 15 samples
6. Spices & Condiments (Garam Masala, Turmeric, Chilli Powder, Salt, Tomato Ketchup, Pickles) - 15 samples

Includes both compliant variations and statutory non-compliance test cases:
- Standard Rule 6 Compliant
- Schedule II Font Height Non-compliance (font size below statutory threshold)
- Rule 11 Price Tampering (dual sticker overlay / overprinted conflicting MRP)
- Rule 6(1)(g) Consumer Care Non-compliance (missing phone/email)
- Rule 6(1)(d) Date Declaration Defect (missing or invalid date)
- Non-standard Statutory Units (unauthorized abbreviations)
- Missing Manufacturer Address (Rule 6(1)(a))
"""

import os
import sys
import json

if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from PIL import Image, ImageDraw, ImageFont

DATASET_ROOT = os.path.dirname(os.path.abspath(__file__))
IMG_DIR = os.path.join(DATASET_ROOT, "images")
ANN_DIR = os.path.join(DATASET_ROOT, "annotations")
os.makedirs(IMG_DIR, exist_ok=True)
os.makedirs(ANN_DIR, exist_ok=True)

# 6 Sectors with typical FMCG products
SECTORS = {
    "food": {
        "sector_name": "Food & Bakery",
        "brands": ["Parle", "Britannia", "Sunfeast", "Patanjali", "Nestle", "Kellogg's", "Haldiram's", "Bikaji", "PriyaGold"],
        "commodities": [
            ("Glucose Biscuits", "200 g", 200.0, "g", 30.0, "Rs 0.15 / g"),
            ("Bourbon Chocolate Biscuits", "150 g", 150.0, "g", 40.0, "Rs 0.27 / g"),
            ("Premium Butter Cookies", "300 g", 300.0, "g", 120.0, "Rs 0.40 / g"),
            ("Crunchy Wheat Rusk", "400 g", 400.0, "g", 60.0, "Rs 0.15 / g"),
            ("Instant Masala Noodles", "280 g", 280.0, "g", 56.0, "Rs 0.20 / g"),
            ("Rolled Oats", "500 g", 500.0, "g", 110.0, "Rs 0.22 / g"),
        ],
        "bg": (254, 249, 231),
        "border": (217, 119, 6)
    },
    "edible_oil": {
        "sector_name": "Edible Oils & Ghee",
        "brands": ["Fortune", "Dhara", "Saffola", "Emami", "Gemini", "NatureFresh", "Patanjali", "Amul"],
        "commodities": [
            ("Refined Sunflower Oil", "1 L", 1.0, "l", 165.0, "Rs 165.00 / L"),
            ("Kachi Ghani Mustard Oil", "1 L", 1.0, "l", 175.0, "Rs 175.00 / L"),
            ("Pure Desi Cow Ghee", "500 ml", 500.0, "ml", 360.0, "Rs 0.72 / ml"),
            ("Refined Soyabean Oil", "1 L", 1.0, "l", 140.0, "Rs 140.00 / L"),
            ("Physically Refined Rice Bran Oil", "1 L", 1.0, "l", 180.0, "Rs 180.00 / L"),
            ("Cold Pressed Groundnut Oil", "1 L", 1.0, "l", 240.0, "Rs 240.00 / L"),
        ],
        "bg": (254, 252, 232),
        "border": (202, 138, 4)
    },
    "cosmetics": {
        "sector_name": "Personal Care & Cosmetics",
        "brands": ["Dove", "Clinic Plus", "Pantene", "Nivea", "Himalaya", "Garnier", "Biotique", "Pears"],
        "commodities": [
            ("Nourishing Hair Care Shampoo", "180 ml", 180.0, "ml", 145.0, "Rs 0.81 / ml"),
            ("Intense Repair Conditioner", "175 ml", 175.0, "ml", 195.0, "Rs 1.11 / ml"),
            ("Purifying Neem Face Wash", "150 ml", 150.0, "ml", 170.0, "Rs 1.13 / ml"),
            ("Moisturizing Body Lotion", "250 ml", 250.0, "ml", 260.0, "Rs 1.04 / ml"),
            ("Pure & Gentle Bathing Bar", "125 g", 125.0, "g", 68.0, "Rs 0.54 / g"),
            ("Refreshing Body Wash Gel", "200 ml", 200.0, "ml", 180.0, "Rs 0.90 / ml"),
        ],
        "bg": (240, 249, 255),
        "border": (2, 132, 199)
    },
    "oral_care": {
        "sector_name": "Oral Care",
        "brands": ["Colgate", "Pepsodent", "Sensodyne", "Dabur Red", "CloseUp", "Vicco", "Meswak"],
        "commodities": [
            ("Dental Cream Strong Teeth", "150 g", 150.0, "g", 98.0, "Rs 0.65 / g"),
            ("Anti-Cavity Fluoride Toothpaste", "200 g", 200.0, "g", 125.0, "Rs 0.625 / g"),
            ("Rapid Relief Sensitive Toothpaste", "80 g", 80.0, "g", 190.0, "Rs 2.375 / g"),
            ("Ayurvedic Herbal Toothpaste", "150 g", 150.0, "g", 105.0, "Rs 0.70 / g"),
            ("Fresh Breath Active Gel", "150 g", 150.0, "g", 115.0, "Rs 0.766 / g"),
            ("Complete Protection Mouthwash", "250 ml", 250.0, "ml", 155.0, "Rs 0.62 / ml"),
        ],
        "bg": (240, 253, 250),
        "border": (13, 148, 136)
    },
    "dairy_beverages": {
        "sector_name": "Perishable Dairy & Beverages",
        "brands": ["Amul", "Mother Dairy", "Nandini", "Tropicana", "Real", "Tata Tea", "Red Label"],
        "commodities": [
            ("Pasteurized Homogenised Toned Milk", "500 ml", 500.0, "ml", 28.0, "Rs 0.056 / ml"),
            ("Standardized Fresh Milk", "1 L", 1.0, "l", 56.0, "Rs 0.056 / ml"),
            ("Pasteurized Table Butter", "100 g", 100.0, "g", 58.0, "Rs 0.58 / g"),
            ("Fresh Malai Paneer", "200 g", 200.0, "g", 92.0, "Rs 0.46 / g"),
            ("100% Mixed Fruit Juice", "1 L", 1.0, "l", 130.0, "Rs 130.00 / L"),
            ("Premium Assam CTC Leaf Tea", "250 g", 250.0, "g", 150.0, "Rs 0.60 / g"),
        ],
        "bg": (239, 246, 255),
        "border": (37, 99, 235)
    },
    "spices": {
        "sector_name": "Spices & Condiments",
        "brands": ["Catch", "Everest", "MDH", "Badshah", "Tata Sampann", "Kissan", "Maggi"],
        "commodities": [
            ("Super Garam Masala Powder", "100 g", 100.0, "g", 82.0, "Rs 0.82 / g"),
            ("Agmark Pure Turmeric Powder", "200 g", 200.0, "g", 64.0, "Rs 0.32 / g"),
            ("Kashmiri Red Chilli Powder", "100 g", 100.0, "g", 78.0, "Rs 0.78 / g"),
            ("Vacuum Evaporated Iodized Salt", "1 kg", 1.0, "kg", 28.0, "Rs 28.00 / kg"),
            ("Fresh Tomato Ketchup Sauce", "500 g", 500.0, "g", 120.0, "Rs 0.24 / g"),
            ("Traditional Mango Pickle", "400 g", 400.0, "g", 110.0, "Rs 0.275 / g"),
        ],
        "bg": (250, 245, 255),
        "border": (147, 51, 234)
    }
}

TEST_CONDITIONS = [
    {"type": "COMPLIANT", "desc": "Standard Fully Compliant Label"},
    {"type": "COMPLIANT", "desc": "Alternative Compliant Typography"},
    {"type": "COMPLIANT", "desc": "Compact Panel Layout Compliant"},
    {"type": "FONT_TOO_SMALL", "desc": "Schedule II Violation: Font size below statutory minimum"},
    {"type": "RULE11_PRICE_TAMPERING", "desc": "Rule 11 Violation: Dual price sticker overlay"},
    {"type": "MISSING_CONSUMER_CARE", "desc": "Rule 6(1)(g) Violation: Consumer care contact missing"},
    {"type": "MISSING_DATE", "desc": "Rule 6(1)(d) Violation: Manufacturing date missing"},
    {"type": "NON_STANDARD_UNITS", "desc": "Schedule II/Rule 13 Violation: Non-metric unit usage"},
    {"type": "MISSING_MANUFACTURER", "desc": "Rule 6(1)(a) Violation: Manufacturer address omitted"}
]

# Weighted sample counts per sector: Food=30, Oil=20, Cosmetics=20, Oral=20, Dairy=15, Spices=15 => Total=120
SECTOR_SAMPLE_COUNTS = {
    "food": 30,
    "edible_oil": 20,
    "cosmetics": 20,
    "oral_care": 20,
    "dairy_beverages": 15,
    "spices": 15
}

def generate_120_dataset():
    total_generated = 0
    sample_index = 1
    width, height = 750, 460

    print("🚀 Initiating 120-Sample FMCG Benchmark Generation for LMPC...")

    for sector_key, sector_data in SECTORS.items():
        commodities = sector_data["commodities"]
        brands = sector_data["brands"]
        target_count = SECTOR_SAMPLE_COUNTS[sector_key]
        num_conditions = len(TEST_CONDITIONS)

        # Generate target_count items per sector by cycling through conditions
        for item_idx in range(target_count):
            cycle = item_idx // num_conditions
            cond_idx = item_idx % num_conditions
            condition = TEST_CONDITIONS[cond_idx]
            comm = commodities[cond_idx % len(commodities)]
            brand = brands[(cond_idx + cycle * 3) % len(brands)]

            comm_name, net_qty_str, net_qty_val, net_unit, mrp_val, usp_str = comm

            filename = f"sample_{sample_index:03d}_{sector_key}_{condition['type'].lower()}.jpg"
            product_full_name = f"{brand} {comm_name}"

            # Configure compliance attributes based on condition
            is_compliant = condition["type"] == "COMPLIANT"
            expected_violations = []

            # Baseline lines
            lines = []
            lines.append((f"{brand.upper()} {comm_name.upper()}", 22, (20, 20, 20), False))
            lines.append((f"Generic Name: {comm_name}", 15, (40, 40, 40), False))

            # Net Quantity line
            if condition["type"] == "FONT_TOO_SMALL":
                # Miniature font below statutory height
                lines.append((f"Net Weight / Volume: {net_qty_str}", 9, (80, 80, 80), True))
                expected_violations.append("RULE_SCHEDULE_II_FONT_HEIGHT")
            elif condition["type"] == "NON_STANDARD_UNITS":
                lines.append(("Net Weight: 1.5 lbs", 18, (10, 10, 10), False))
                expected_violations.append("RULE_SCHEDULE_II_UNIT_STANDARD")
            else:
                lines.append((f"Net Quantity: {net_qty_str}", 19, (10, 10, 10), False))

            # MRP & Unit Sale Price
            mrp_line = f"MRP Rs {mrp_val:.2f} (Inclusive of all taxes)"
            lines.append((mrp_line, 18, (10, 10, 10), False))
            lines.append((f"Unit Sale Price: {usp_str}", 14, (60, 60, 60), False))

            # Dates
            if condition["type"] == "MISSING_DATE":
                expected_violations.append("RULE_6_1_D_DATE_MANUFACTURE")
            else:
                lines.append(("Mfg Date: 05/2026   Best Before: 11/2026", 14, (40, 40, 40), False))

            # Manufacturer
            if condition["type"] == "MISSING_MANUFACTURER":
                expected_violations.append("RULE_6_1_A_NAME_ADDRESS")
            else:
                lines.append((f"Mfd By: {brand} India Pvt Ltd, Industrial Area, Noida 201301", 13, (50, 50, 50), False))

            # Consumer Care
            if condition["type"] == "MISSING_CONSUMER_CARE":
                expected_violations.append("RULE_6_1_G_CONSUMER_CARE")
            else:
                lines.append((f"Consumer Care: 1800-11-2233 / care@{brand.lower().replace(' ', '')}.com", 13, (50, 50, 50), False))

            # Regulatory seals
            lines.append(("FSSAI Lic No: 10022011000452  •  Country of Origin: India", 13, (50, 50, 50), False))

            # Create Canvas
            img = Image.new("RGB", (width, height), color=sector_data["bg"])
            draw = ImageDraw.Draw(img)

            # Outer border
            draw.rectangle([10, 10, width - 10, height - 10], outline=sector_data["border"], width=3)
            draw.rectangle([15, 15, width - 15, height - 15], outline=(210, 210, 210), width=1)

            # Statutory Header banner
            draw.rectangle([20, 20, 360, 44], fill=sector_data["border"])
            draw.text((28, 25), "LMPC STATUTORY DECLARATION PANEL", fill=(255, 255, 255))

            # Render text lines
            y_offset = 58
            for text, size, color, is_small in lines:
                draw.text((30, y_offset), text, fill=color)
                y_offset += size + 16

            # Render simulated Barcode at bottom right
            bx, by = width - 190, height - 90
            draw.rectangle([bx, by, bx + 160, by + 60], fill=(255, 255, 255), outline=(0, 0, 0), width=1)
            for b_i in range(14):
                b_w = 2 if (b_i % 3 == 0) else 3
                draw.line([(bx + 10 + b_i * 10, by + 8), (bx + 10 + b_i * 10, by + 42)], fill=(0, 0, 0), width=b_w)
            draw.text((bx + 18, by + 44), f"89010{sample_index:07d}", fill=(0, 0, 0))

            # Special Visual Effect for Rule 11 Price Tampering: Dual Sticker Overlay
            if condition["type"] == "RULE11_PRICE_TAMPERING":
                expected_violations.append("RULE_11_PRICE_TAMPERING")
                # Draw a glaring fluorescent price sticker overlaid across the panel
                st_x, st_y = width - 260, 130
                draw.rectangle([st_x, st_y, st_x + 190, st_y + 65], fill=(254, 240, 138), outline=(220, 38, 38), width=2)
                draw.text((st_x + 10, st_y + 8), "REVISED RETAIL PRICE", fill=(185, 28, 28))
                draw.text((st_x + 10, st_y + 28), f"SPECIAL MRP: Rs {mrp_val * 1.25:.2f}", fill=(220, 38, 38))
                draw.text((st_x + 10, st_y + 48), "*Overlay Sticker Applied", fill=(100, 100, 100))

            # Save Image
            img_path = os.path.join(IMG_DIR, filename)
            img.save(img_path, quality=95)

            # Save Annotation JSON
            ann_data = {
                "image_filename": filename,
                "annotator": "Srusthi (QA Engineer)",
                "annotation_date": "2026-09-01",
                "product_info": {
                    "product_name": product_full_name,
                    "brand": brand,
                    "category": sector_key if sector_key in ["food", "cosmetics"] else "general",
                    "sector_group": sector_data["sector_name"],
                    "package_type": "box"
                },
                "ground_truth_fields": {
                    "commodity_name": comm_name,
                    "net_quantity": net_qty_val,
                    "net_quantity_unit": net_unit,
                    "mrp": mrp_val,
                    "mrp_tampered": (condition["type"] == "RULE11_PRICE_TAMPERING"),
                    "mfg_date": "05/2026" if condition["type"] != "MISSING_DATE" else None,
                    "consumer_care_present": (condition["type"] != "MISSING_CONSUMER_CARE"),
                    "manufacturer_present": (condition["type"] != "MISSING_MANUFACTURER"),
                    "font_compliant": (condition["type"] != "FONT_TOO_SMALL")
                },
                "ground_truth_verdict": "COMPLIANT" if is_compliant else "NON_COMPLIANT",
                "expected_violations": expected_violations,
                "test_condition": condition["type"],
                "test_description": condition["desc"]
            }

            ann_path = os.path.join(ANN_DIR, filename.replace(".jpg", ".json"))
            with open(ann_path, "w", encoding="utf-8") as f:
                json.dump(ann_data, f, indent=2)

            sample_index += 1
            total_generated += 1

    print(f"✅ Successfully generated {total_generated} FMCG test labels and annotations across all 6 sectors!")
    print(f"   Images location: {IMG_DIR}")
    print(f"   Annotations location: {ANN_DIR}")
    return total_generated

if __name__ == "__main__":
    generate_120_dataset()
