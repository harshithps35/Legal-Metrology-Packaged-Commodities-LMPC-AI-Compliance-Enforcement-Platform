"""
Tests for the NER-based entity extractor.

Tests phone/email extraction, consumer care section detection,
and commodity name extraction. spaCy NER tests are skipped
if the model is not installed.
"""

import pytest
from app.nlp.ner_extractor import (
    extract_phone_numbers,
    extract_emails,
    detect_consumer_care_section,
    extract_consumer_care,
    extract_commodity_name,
    run_all_ner_extractors,
)


# ============================================================
# Phone Number Extraction
# ============================================================

class TestPhoneExtraction:

    def test_toll_free(self):
        phones = extract_phone_numbers("Call 1800-123-4567 for help")
        assert len(phones) >= 1
        assert any("1800" in p for p in phones)

    def test_toll_free_no_dashes(self):
        phones = extract_phone_numbers("Toll Free: 18001234567")
        assert len(phones) >= 1

    def test_mobile_10digit(self):
        phones = extract_phone_numbers("Contact: 9876543210")
        assert len(phones) >= 1

    def test_plus91(self):
        phones = extract_phone_numbers("Call +91 98765 43210")
        assert len(phones) >= 1

    def test_landline_with_std(self):
        phones = extract_phone_numbers("Tel: 022-12345678")
        assert len(phones) >= 1

    def test_no_phone(self):
        phones = extract_phone_numbers("No phone number here")
        assert len(phones) == 0


# ============================================================
# Email Extraction
# ============================================================

class TestEmailExtraction:

    def test_simple_email(self):
        emails = extract_emails("Email: consumer@parle.com")
        assert len(emails) == 1
        assert emails[0] == "consumer@parle.com"

    def test_email_with_dots(self):
        emails = extract_emails("support.team@company.co.in")
        assert len(emails) == 1

    def test_multiple_emails(self):
        emails = extract_emails("a@b.com and x@y.org")
        assert len(emails) == 2

    def test_no_email(self):
        emails = extract_emails("No email here @ all")
        assert len(emails) == 0


# ============================================================
# Consumer Care Section Detection
# ============================================================

class TestConsumerCareDetection:

    def test_consumer_care_header(self):
        text = "Some text\nConsumer Care: Call 1800-123-4567\nEmail: help@co.com\n\nMRP ₹50"
        section = detect_consumer_care_section(text)
        assert section is not None
        _, _, section_text = section
        assert "1800" in section_text

    def test_customer_helpline(self):
        text = "Customer Helpline: 1800 200 3000"
        section = detect_consumer_care_section(text)
        assert section is not None

    def test_toll_free_trigger(self):
        text = "Toll Free 1800-425-1234 for complaints"
        section = detect_consumer_care_section(text)
        assert section is not None

    def test_no_consumer_care(self):
        text = "MRP ₹100\nNet Wt 200g\nMfg by XYZ"
        section = detect_consumer_care_section(text)
        assert section is None


class TestExtractConsumerCare:

    def test_full_consumer_care(self):
        text = "Consumer Care: 1800-123-4567, Email: help@company.com"
        result = extract_consumer_care(text)
        assert result is not None
        assert result.field_id == "consumer_care"
        assert len(result.metadata["phones"]) > 0
        assert len(result.metadata["emails"]) > 0
        assert result.confidence >= 0.90

    def test_phone_only_no_header(self):
        text = "MRP ₹50\n9876543210\nNet Wt 200g"
        result = extract_consumer_care(text)
        # Should find phone even without header, but low confidence
        if result:
            assert result.confidence < 0.50


# ============================================================
# Commodity Name Extraction
# ============================================================

class TestCommodityName:

    def test_keyword_label(self):
        text = "Product: Glucose Biscuits\nMRP ₹30"
        result = extract_commodity_name(text)
        assert result is not None
        assert "Glucose Biscuits" in result.value
        assert result.confidence > 0.80

    def test_contents_label(self):
        text = "Contents: Dark Chocolate\nNet Wt 100g"
        result = extract_commodity_name(text)
        assert result is not None
        assert "Chocolate" in result.value

    def test_first_line_heuristic(self):
        lines = ["Parle-G Gold", "Glucose Biscuits", "MRP ₹30", "Net Wt 200g"]
        result = extract_commodity_name("", lines=lines)
        assert result is not None
        assert result.confidence < 0.50  # Low confidence for heuristic

    def test_skips_mrp_lines(self):
        lines = ["MRP ₹199", "Net Wt 500g", "Delicious Chips"]
        result = extract_commodity_name("", lines=lines)
        if result:
            assert "MRP" not in result.value
            assert "Net" not in result.value


# ============================================================
# Run All NER Extractors
# ============================================================

class TestRunAllNER:

    def test_comprehensive(self):
        text = """
Consumer Care: 1800-123-4567
Email: help@company.com
Mfg by ABC Industries Ltd, Delhi, India
Product: Instant Noodles
"""
        results = run_all_ner_extractors(text, lines=text.strip().split("\n"))

        assert "consumer_care" in results
        assert "commodity_name" in results
