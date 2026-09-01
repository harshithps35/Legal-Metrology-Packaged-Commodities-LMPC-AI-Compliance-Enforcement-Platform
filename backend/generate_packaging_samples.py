"""
Generate 6 canonical FMCG packaging label images for generalization testing:
1. Biscuit (Parle-G Gold)
2. Edible Oil (Fortune Sunflower Oil 1L)
3. Shampoo (Dove Hair Care 180ml)
4. Toothpaste (Colgate Strong Teeth 150g)
5. Milk (Amul Taaza Milk 500ml)
6. Spices (Catch Super Garam Masala 100g)
"""

import os
import json
from PIL import Image, ImageDraw, ImageFont

DATASET_IMG_DIR = os.path.abspath("dataset/images")
DATASET_ANN_DIR = os.path.abspath("dataset/annotations")
DOCS_SAMPLES_DIR = os.path.abspath("docs/samples")

os.makedirs(DATASET_IMG_DIR, exist_ok=True)
os.makedirs(DATASET_ANN_DIR, exist_ok=True)
os.makedirs(DOCS_SAMPLES_DIR, exist_ok=True)

PACKAGES = [
    {
        "filename": "sample_001_biscuit.jpg",
        "product_name": "Parle-G Gold Biscuits",
        "brand": "Parle",
        "category": "food",
        "lines": [
            ("PARLE-G GOLD BISCUITS", 26, (180, 50, 20)),
            ("Generic Name: Glucose Biscuits", 16, (30, 30, 30)),
            ("Net Weight: 200 g", 20, (10, 10, 10)),
            ("MRP Rs 30.00 (Inclusive of all taxes)", 18, (10, 10, 10)),
            ("Unit Sale Price: Rs 0.15 / g", 14, (60, 60, 60)),
            ("Mfg Date: 05/2026   Best Before: 11/2026", 15, (40, 40, 40)),
            ("Mfd By: Parle Products Pvt Ltd, Vile Parle East, Mumbai 400057", 13, (50, 50, 50)),
            ("Consumer Care: 1800-22-7799 / care@parle.biz", 13, (50, 50, 50)),
            ("FSSAI Lic. No. 10015022003891  •  Country of Origin: India", 13, (50, 50, 50)),
        ],
        "bg": (254, 249, 231),
        "border": (217, 119, 6),
        "annotation": {
            "commodity_name": "Glucose Biscuits",
            "net_quantity": 200.0,
            "unit": "g",
            "mrp": 30.0,
            "usp": "0.15/g",
            "compliant": True
        }
    },
    {
        "filename": "sample_002_edible_oil.jpg",
        "product_name": "Fortune Sunlite Refined Sunflower Oil",
        "brand": "Fortune",
        "category": "food",
        "lines": [
            ("FORTUNE SUNLITE SUNFLOWER OIL", 26, (180, 120, 10)),
            ("Generic Name: Edible Refined Sunflower Oil", 16, (30, 30, 30)),
            ("Net Volume: 1 L (910 g at 30 deg C)", 20, (10, 10, 10)),
            ("MRP Rs 165.00 (Inclusive of all taxes)", 18, (10, 10, 10)),
            ("Unit Sale Price: Rs 165.00 / L", 14, (60, 60, 60)),
            ("Packed: 06/2026   Expiry: 03/2027", 15, (40, 40, 40)),
            ("Packed by: Adani Wilmar Ltd, Fortune House, Ahmedabad 380009", 13, (50, 50, 50)),
            ("Consumer Helpline: 1800-233-9999 / customercare@adaniwilmar.in", 13, (50, 50, 50)),
            ("FSSAI Lic. No. 10013021000540  •  Product of India", 13, (50, 50, 50)),
        ],
        "bg": (255, 253, 235),
        "border": (234, 179, 8),
        "annotation": {
            "commodity_name": "Edible Refined Sunflower Oil",
            "net_quantity": 1000.0,
            "unit": "ml",
            "mrp": 165.0,
            "usp": "165.00/L",
            "compliant": True
        }
    },
    {
        "filename": "sample_003_shampoo.jpg",
        "product_name": "Dove Daily Shine Shampoo",
        "brand": "Dove",
        "category": "cosmetics",
        "lines": [
            ("DOVE DAILY SHINE SHAMPOO", 26, (30, 58, 138)),
            ("Generic Name: Shampoo", 16, (30, 30, 30)),
            ("Net Volume: 180 ml", 20, (10, 10, 10)),
            ("MRP Rs 190.00 (Inclusive of all taxes)", 18, (10, 10, 10)),
            ("Unit Sale Price: Rs 1.05 / ml", 14, (60, 60, 60)),
            ("Mfg Date: 04/2026   Use Before: 04/2028", 15, (40, 40, 40)),
            ("Mfd By: Hindustan Unilever Ltd, Unilever House, Mumbai 400099", 13, (50, 50, 50)),
            ("Consumer Care: 1800-10-22-221 / lever.care@unilever.com", 13, (50, 50, 50)),
            ("Cosmetic Lic No. M/C-1122  •  Made in India", 13, (50, 50, 50)),
        ],
        "bg": (240, 249, 255),
        "border": (59, 130, 246),
        "annotation": {
            "commodity_name": "Shampoo",
            "net_quantity": 180.0,
            "unit": "ml",
            "mrp": 190.0,
            "usp": "1.05/ml",
            "compliant": True
        }
    },
    {
        "filename": "sample_004_toothpaste.jpg",
        "product_name": "Colgate Strong Teeth Dental Cream",
        "brand": "Colgate",
        "category": "cosmetics",
        "lines": [
            ("COLGATE STRONG TEETH DENTAL CREAM", 25, (220, 38, 38)),
            ("Generic Name: Toothpaste", 16, (30, 30, 30)),
            ("Net Weight: 150 g", 20, (10, 10, 10)),
            ("MRP Rs 95.00 (Inclusive of all taxes)", 18, (10, 10, 10)),
            ("Unit Sale Price: Rs 0.63 / g", 14, (60, 60, 60)),
            ("Mfg: 06/2026   Exp: 05/2028", 15, (40, 40, 40)),
            ("Mfd By: Colgate-Palmolive (India) Ltd, Hiranandani, Mumbai 400076", 13, (50, 50, 50)),
            ("Consumer Service: 1800-225599 / consumeraffairs@colpal.com", 13, (50, 50, 50)),
            ("Ayush Lic. No. HP-202  •  Recyclable Tube", 13, (50, 50, 50)),
        ],
        "bg": (254, 242, 242),
        "border": (239, 68, 68),
        "annotation": {
            "commodity_name": "Toothpaste",
            "net_quantity": 150.0,
            "unit": "g",
            "mrp": 95.0,
            "usp": "0.63/g",
            "compliant": True
        }
    },
    {
        "filename": "sample_005_milk.jpg",
        "product_name": "Amul Taaza Toned Milk",
        "brand": "Amul",
        "category": "food",
        "lines": [
            ("AMUL TAAZA HOMOGENISED TONED MILK", 25, (16, 185, 129)),
            ("Generic Name: Homogenised Toned Milk", 16, (30, 30, 30)),
            ("Net Content: 500 ml", 20, (10, 10, 10)),
            ("MRP Rs 28.00 (Inclusive of all taxes)", 18, (10, 10, 10)),
            ("Unit Sale Price: Rs 0.056 / ml", 14, (60, 60, 60)),
            ("Packed On: 28/08/2026   Use By: 04/09/2026", 15, (40, 40, 40)),
            ("Mkt By: Gujarat Co-operative Milk Marketing Federation Ltd, Anand 388001", 13, (50, 50, 50)),
            ("Toll Free: 1800-258-3333 / customercare@amul.coop", 13, (50, 50, 50)),
            ("FSSAI Lic. No. 10012021000071  •  Refrigerate Below 8 deg C", 13, (50, 50, 50)),
        ],
        "bg": (240, 253, 244),
        "border": (34, 197, 94),
        "annotation": {
            "commodity_name": "Homogenised Toned Milk",
            "net_quantity": 500.0,
            "unit": "ml",
            "mrp": 28.0,
            "usp": "0.056/ml",
            "compliant": True
        }
    },
    {
        "filename": "sample_006_spices.jpg",
        "product_name": "Catch Super Garam Masala",
        "brand": "Catch",
        "category": "food",
        "lines": [
            ("CATCH SUPER GARAM MASALA", 26, (147, 51, 234)),
            ("Generic Name: Blended Spices Powder", 16, (30, 30, 30)),
            ("Net Weight: 100 g", 20, (10, 10, 10)),
            ("MRP Rs 82.00 (Inclusive of all taxes)", 18, (10, 10, 10)),
            ("Unit Sale Price: Rs 0.82 / g", 14, (60, 60, 60)),
            ("Date of Packaging: 07/2026   Best Before: 12 Months", 15, (40, 40, 40)),
            ("Mfd By: DS Spiceco Pvt Ltd, Sector 67, Noida, UP 201301", 13, (50, 50, 50)),
            ("Helpline: 0120-4032000 / spices@dsgroup.com", 13, (50, 50, 50)),
            ("FSSAI Lic. No. 10019051003022  •  100% Pure & Aromatic", 13, (50, 50, 50)),
        ],
        "bg": (250, 245, 255),
        "border": (168, 85, 247),
        "annotation": {
            "commodity_name": "Blended Spices Powder",
            "net_quantity": 100.0,
            "unit": "g",
            "mrp": 82.0,
            "usp": "0.82/g",
            "compliant": True
        }
    }
]

def generate_samples():
    width, height = 750, 450
    for pkg in PACKAGES:
        img = Image.new("RGB", (width, height), color=pkg["bg"])
        draw = ImageDraw.Draw(img)

        # Draw decorative outer border
        draw.rectangle([10, 10, width - 10, height - 10], outline=pkg["border"], width=4)
        draw.rectangle([16, 16, width - 16, height - 16], outline=(200, 200, 200), width=1)

        # Header tag
        draw.rectangle([20, 20, 320, 44], fill=pkg["border"])
        draw.text((28, 25), "LMPC STATUTORY DECLARATION PANEL", fill=(255, 255, 255))

        y_offset = 60
        for text, size, color in pkg["lines"]:
            # Draw line
            draw.text((30, y_offset), text, fill=color)
            y_offset += size + 16

        # Draw simulated barcode at bottom right
        bx, by = width - 180, height - 85
        draw.rectangle([bx, by, bx + 150, by + 55], fill=(255, 255, 255), outline=(0, 0, 0), width=1)
        for i in range(12):
            w = 2 if i % 2 == 0 else 4
            draw.line([(bx + 12 + i * 10, by + 6), (bx + 12 + i * 10, by + 40)], fill=(0, 0, 0), width=w)
        draw.text((bx + 20, by + 42), "8901030012345", fill=(0, 0, 0))

        # Save to dataset/images and docs/samples
        img_path = os.path.join(DATASET_IMG_DIR, pkg["filename"])
        docs_path = os.path.join(DOCS_SAMPLES_DIR, pkg["filename"])
        img.save(img_path, quality=95)
        img.save(docs_path, quality=95)

        # Save annotation json
        ann_filename = pkg["filename"].replace(".jpg", ".json")
        ann_path = os.path.join(DATASET_ANN_DIR, ann_filename)
        with open(ann_path, "w", encoding="utf-8") as f:
            json.dump({
                "filename": pkg["filename"],
                "product_name": pkg["product_name"],
                "brand": pkg["brand"],
                "category": pkg["category"],
                "annotation": pkg["annotation"]
            }, f, indent=2)

        print(f"Generated: {pkg['filename']}")

if __name__ == "__main__":
    generate_samples()
