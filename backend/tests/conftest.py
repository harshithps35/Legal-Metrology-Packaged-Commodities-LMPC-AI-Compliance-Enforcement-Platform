import pytest_asyncio
from app.core.database import init_db
from app.db.seed_governance import seed_governance_data

@pytest_asyncio.fixture(autouse=True, scope="session")
async def setup_test_db():
    await seed_governance_data()
