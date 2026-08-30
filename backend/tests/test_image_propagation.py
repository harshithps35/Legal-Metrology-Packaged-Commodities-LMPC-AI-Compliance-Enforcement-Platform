import asyncio
import io
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.config import get_settings
from app.core.database import get_db, init_db
from app.db.models.models import User, UserRole, PreMarketApplication, Scan

@pytest.mark.asyncio
async def test_brand_image_propagation():
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Login as brand owner
        login_res = await client.post("/api/v1/auth/token", data={"username": "employer_parle", "password": "employer123"})
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        brand_token = login_res.json()["access_token"]
        brand_headers = {"Authorization": f"Bearer {brand_token}"}

        # 2. Upload label image as brand owner
        from PIL import Image as PILImage
        img = PILImage.new("RGB", (100, 100), color="blue")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        dummy_img_bytes = buf.getvalue()
        
        files = {"file": ("brand_test_product.png", io.BytesIO(dummy_img_bytes), "image/png")}
        scan_res = await client.post(
            "/api/v1/scan",
            files=files,
            data={"product_name": "Test Brand Biscuit", "brand": "Parle", "category": "food"},
            headers=brand_headers,
        )

        assert scan_res.status_code == 201, f"Scan failed: {scan_res.text}"
        scan_data = scan_res.json()
        scan_id = scan_data["id"]
        img_url = scan_data["image_url"]
        assert img_url.startswith("/uploads/"), f"Image URL must start with /uploads/: {img_url}"
        assert "\\" not in img_url, f"Image URL must not contain Windows backslashes: {img_url}"

        # 3. Submit pre-market application with this scan
        submit_res = await client.post(
            "/api/v1/employer/pre-market/submit",
            json={
                "product_name": "Test Brand Biscuit",
                "brand": "Parle",
                "category": "food",
                "packaging_type": "Pouch / Box",
                "declared_mrp": 25.0,
                "declared_net_quantity": "200 g",
                "artwork_file_path": img_url,
                "scan_id": scan_id,
            },
            headers=brand_headers,
        )
        assert submit_res.status_code == 200, f"Submit failed: {submit_res.text}"
        app_id = submit_res.json()["id"]

        # 4. Check Brand Owner's own applications list
        emp_apps_res = await client.get("/api/v1/employer/my-applications", headers=brand_headers)
        assert emp_apps_res.status_code == 200
        emp_app = next(a for a in emp_apps_res.json() if a["id"] == app_id)
        assert emp_app["artwork_file_path"] == img_url
        assert emp_app["image_url"] == img_url

        # 5. Check Inspector Pre-Market Queue
        insp_login = await client.post("/api/v1/auth/token", data={"username": "inspector_sharma", "password": "inspector123"})
        assert insp_login.status_code == 200
        insp_headers = {"Authorization": f"Bearer {insp_login.json()['access_token']}"}
        insp_queue_res = await client.get("/api/v1/inspector/pre-market-queue", headers=insp_headers)
        assert insp_queue_res.status_code == 200
        insp_app = next(a for a in insp_queue_res.json() if a["id"] == app_id)
        assert insp_app["image_url"] == img_url
        assert insp_app["artwork_file_path"] == img_url

        # 6. Check ALMO / Supervisor Products History
        almo_login = await client.post("/api/v1/auth/token", data={"username": "almo_noida", "password": "supervisor123"})
        assert almo_login.status_code == 200
        almo_headers = {"Authorization": f"Bearer {almo_login.json()['access_token']}"}
        almo_hist_res = await client.get("/api/v1/supervisor/products-history", headers=almo_headers)
        assert almo_hist_res.status_code == 200
        almo_app = next(a for a in almo_hist_res.json() if a["id"] == app_id and a["source_type"] == "PRE_MARKET_APPLICATION")
        assert almo_app["image_url"] == img_url
        assert almo_app["artwork_file_path"] == img_url

        # 7. Check Sub-Inspector Applications Queue
        sub_login = await client.post("/api/v1/auth/token", data={"username": "sub_inspector_sanjay", "password": "inspector123"})
        assert sub_login.status_code == 200
        sub_headers = {"Authorization": f"Bearer {sub_login.json()['access_token']}"}
        sub_queue_res = await client.get("/api/v1/sub-inspector/applications", headers=sub_headers)
        assert sub_queue_res.status_code == 200
        sub_app = next(a for a in sub_queue_res.json() if a["id"] == app_id)
        assert sub_app["image_url"] == img_url
        assert sub_app["artwork_file_path"] == img_url



        # 8. Check direct static file serving
        static_res = await client.get(img_url)
        assert static_res.status_code == 200, f"Static image file retrieval failed with {static_res.status_code}"
        assert len(static_res.content) == len(dummy_img_bytes)

        # 9. Check scan image endpoint
        scan_img_res = await client.get(f"/api/v1/scans/{scan_id}/image", headers=insp_headers)
        assert scan_img_res.status_code == 200, f"Scan image endpoint failed with {scan_img_res.status_code}"

        print("\nALL IMAGE PROPAGATION CHECKS PASSED SUCCESSFULLY!")
