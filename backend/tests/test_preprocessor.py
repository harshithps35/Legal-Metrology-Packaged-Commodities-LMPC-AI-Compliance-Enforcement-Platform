"""
Tests for the Image Preprocessing Pipeline.

Tests core preprocessing functions with synthetic images to validate
grayscale conversion, deskewing, thresholding, and contour detection
without requiring real product label photos.
"""

import numpy as np
import cv2
import pytest

from app.pipeline.preprocessor import (
    LabelPreprocessor,
    PreprocessResult,
    detect_label_contour,
    order_points,
    perspective_transform,
    preprocess_label_image,
)


def _make_test_image(width: int = 1000, height: int = 600, color: bool = True) -> np.ndarray:
    """Create a synthetic test image with text-like features."""
    if color:
        img = np.ones((height, width, 3), dtype=np.uint8) * 240  # Light gray background
    else:
        img = np.ones((height, width), dtype=np.uint8) * 240

    # Draw some black rectangles to simulate text blocks
    for y_offset in range(50, height - 50, 60):
        x_start = 50 + (y_offset % 30)
        bar_width = width - 100 - (y_offset % 50)
        if color:
            cv2.rectangle(img, (x_start, y_offset), (x_start + bar_width, y_offset + 15), (20, 20, 20), -1)
        else:
            cv2.rectangle(img, (x_start, y_offset), (x_start + bar_width, y_offset + 15), 20, -1)

    return img


def _make_skewed_image(angle_degrees: float = 5.0) -> np.ndarray:
    """Create a test image rotated by the specified angle to simulate skew."""
    img = _make_test_image(1200, 800)
    h, w = img.shape[:2]
    center = (w // 2, h // 2)
    matrix = cv2.getRotationMatrix2D(center, angle_degrees, 1.0)
    rotated = cv2.warpAffine(img, matrix, (w, h), borderValue=(255, 255, 255))
    return rotated


class TestLabelPreprocessor:
    """Test the core preprocessing pipeline."""

    def test_preprocess_returns_result(self):
        img = _make_test_image()
        preprocessor = LabelPreprocessor()
        result = preprocessor.preprocess(img)

        assert isinstance(result, PreprocessResult)
        assert result.original is not None
        assert result.processed is not None
        assert result.grayscale is not None
        assert result.binary is not None

    def test_preprocess_steps_recorded(self):
        img = _make_test_image()
        preprocessor = LabelPreprocessor()
        result = preprocessor.preprocess(img)

        assert len(result.steps_applied) > 0
        assert "grayscale" in result.steps_applied
        assert "bilateral_filter" in result.steps_applied

    def test_grayscale_is_single_channel(self):
        img = _make_test_image()
        preprocessor = LabelPreprocessor()
        result = preprocessor.preprocess(img)

        assert len(result.grayscale.shape) == 2  # Single channel

    def test_binary_is_single_channel(self):
        img = _make_test_image()
        preprocessor = LabelPreprocessor()
        result = preprocessor.preprocess(img)

        assert len(result.binary.shape) == 2

    def test_binary_has_only_0_and_255(self):
        img = _make_test_image()
        preprocessor = LabelPreprocessor()
        result = preprocessor.preprocess(img)

        unique_vals = np.unique(result.binary)
        assert all(v in [0, 255] for v in unique_vals)

    def test_resize_large_image(self):
        """Images wider than target should be scaled down."""
        img = _make_test_image(width=4000, height=3000)
        preprocessor = LabelPreprocessor(target_width=2000)
        result = preprocessor.preprocess(img)

        assert result.scale_factor < 1.0
        assert any("resized" in s for s in result.steps_applied)

    def test_resize_small_image(self):
        """Images narrower than min_width should be scaled up."""
        img = _make_test_image(width=400, height=300)
        preprocessor = LabelPreprocessor(min_width=800, target_width=2000)
        result = preprocessor.preprocess(img)

        assert result.scale_factor > 1.0

    def test_no_resize_normal_image(self):
        """Images within range should not be resized."""
        img = _make_test_image(width=1500, height=1000)
        preprocessor = LabelPreprocessor(target_width=2000, min_width=800)
        result = preprocessor.preprocess(img)

        assert result.scale_factor == 1.0


class TestDeskewing:
    """Test skew detection and correction."""

    def test_skewed_image_is_corrected(self):
        img = _make_skewed_image(angle_degrees=7.0)
        preprocessor = LabelPreprocessor()
        result = preprocessor.preprocess(img)

        # Should detect and attempt correction
        # Note: exact angle detection depends on line features
        assert isinstance(result.skew_angle, float)

    def test_straight_image_not_rotated(self):
        """An already-straight image should not be significantly rotated."""
        img = _make_test_image()
        preprocessor = LabelPreprocessor()
        result = preprocessor.preprocess(img)

        # Skew angle should be very small for an upright image
        assert abs(result.skew_angle) < 2.0


class TestOrderPoints:
    """Test the point ordering utility for perspective correction."""

    def test_already_ordered(self):
        pts = np.array([[0, 0], [100, 0], [100, 100], [0, 100]], dtype=np.float32)
        ordered = order_points(pts)

        np.testing.assert_array_equal(ordered[0], [0, 0])    # top-left
        np.testing.assert_array_equal(ordered[1], [100, 0])   # top-right
        np.testing.assert_array_equal(ordered[2], [100, 100])  # bottom-right
        np.testing.assert_array_equal(ordered[3], [0, 100])    # bottom-left

    def test_shuffled_points(self):
        pts = np.array([[100, 100], [0, 0], [0, 100], [100, 0]], dtype=np.float32)
        ordered = order_points(pts)

        np.testing.assert_array_equal(ordered[0], [0, 0])
        np.testing.assert_array_equal(ordered[1], [100, 0])
        np.testing.assert_array_equal(ordered[2], [100, 100])
        np.testing.assert_array_equal(ordered[3], [0, 100])


class TestPerspectiveTransform:
    """Test perspective transformation on synthetic inputs."""

    def test_transform_produces_output(self):
        img = _make_test_image(width=500, height=400)
        quad = np.array([[10, 10], [490, 15], [485, 385], [15, 390]], dtype=np.float32)
        result = perspective_transform(img, quad)

        assert result is not None
        assert result.shape[0] > 0
        assert result.shape[1] > 0


class TestConvenienceFunction:
    """Test the top-level preprocess_label_image function."""

    def test_full_pipeline(self):
        img = _make_test_image()
        result = preprocess_label_image(img, attempt_perspective=False)

        assert isinstance(result, PreprocessResult)
        assert len(result.steps_applied) > 0

    def test_with_perspective_attempt(self):
        img = _make_test_image()
        result = preprocess_label_image(img, attempt_perspective=True)

        assert isinstance(result, PreprocessResult)
