"""
LMPC Compliance System — Image Preprocessing Pipeline

OpenCV and Pillow-based preprocessing to clean raw camera photos of product labels
before OCR extraction. Handles noise, uneven lighting, skew, and
perspective distortion common in smartphone-captured label images.
"""

import math
import os
from dataclasses import dataclass, field
from typing import Optional

try:
    import cv2
except ImportError:
    cv2 = None

try:
    import numpy as np
except ImportError:
    np = None

try:
    from PIL import Image as PILImage, ImageEnhance, ImageFilter, ImageOps
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False


@dataclass
class PreprocessResult:
    """Result of the preprocessing pipeline."""
    original: Optional[object] = None
    processed: Optional[object] = None
    grayscale: Optional[object] = None
    binary: Optional[object] = None
    skew_angle: float = 0.0
    was_deskewed: bool = False
    was_perspective_corrected: bool = False
    scale_factor: float = 1.0
    steps_applied: list[str] = field(default_factory=list)


def load_image(image_path: str) -> Optional[np.ndarray]:
    """Load an image from file path using OpenCV or Pillow fallback.

    Returns:
        BGR/RGB numpy array if possible, or PIL Image object.
    """
    candidates = [
        image_path,
        image_path.lstrip("/\\"),
        os.path.join("uploads", os.path.basename(image_path)),
    ]
    actual_path = image_path
    for c in candidates:
        if os.path.exists(c):
            actual_path = c
            break

    if cv2 is not None:
        try:
            img = cv2.imread(actual_path)
            if img is not None:
                return img
        except Exception:
            pass

    if PIL_AVAILABLE:
        try:
            pil_img = PILImage.open(actual_path).convert('RGB')
            if np is not None:
                # Convert RGB to BGR numpy array
                rgb_arr = np.array(pil_img)
                return rgb_arr[:, :, ::-1].copy()
            return pil_img
        except Exception:
            pass

    return None


class LabelPreprocessor:
    """Multi-step image preprocessing pipeline optimized for product label OCR."""

    def __init__(
        self,
        target_width: int = 2000,
        min_width: int = 800,
        bilateral_d: int = 9,
        bilateral_sigma_color: float = 75.0,
        bilateral_sigma_space: float = 75.0,
        clahe_clip_limit: float = 2.0,
        clahe_tile_size: tuple[int, int] = (8, 8),
        max_skew_angle: float = 15.0,
        morph_kernel_size: tuple[int, int] = (1, 1),
    ):
        self.target_width = target_width
        self.min_width = min_width
        self.bilateral_d = bilateral_d
        self.bilateral_sigma_color = bilateral_sigma_color
        self.bilateral_sigma_space = bilateral_sigma_space
        self.clahe_clip_limit = clahe_clip_limit
        self.clahe_tile_size = clahe_tile_size
        self.max_skew_angle = max_skew_angle
        self.morph_kernel_size = morph_kernel_size

    def preprocess(self, image: object) -> PreprocessResult:
        """Run the preprocessing pipeline on a raw label image."""
        steps: list[str] = []

        if cv2 is None or np is None or not isinstance(image, np.ndarray):
            # PIL fallback pipeline
            if PIL_AVAILABLE and hasattr(image, 'convert'):
                pil_img = image
            elif PIL_AVAILABLE and np is not None and isinstance(image, np.ndarray):
                # Convert BGR array to PIL
                rgb_arr = image[:, :, ::-1]
                pil_img = PILImage.fromarray(rgb_arr)
            else:
                return PreprocessResult(original=image, processed=image, grayscale=image, binary=image)

            # Resize if too large
            w, h = pil_img.size
            scale = 1.0
            if w > self.target_width:
                scale = self.target_width / w
                pil_img = pil_img.resize((int(w * scale), int(h * scale)), PILImage.Resampling.LANCZOS)
                steps.append(f"resized (scale={scale:.2f})")

            # Grayscale & Contrast
            gray = pil_img.convert('L')
            steps.append("grayscale")

            enhancer = ImageEnhance.Contrast(gray)
            gray = enhancer.enhance(1.5)
            steps.append("contrast_enhanced")

            # Binary threshold
            binary = gray.point(lambda p: 255 if p > 128 else 0)
            steps.append("threshold")

            gray_arr = np.array(gray) if np is not None else gray
            bin_arr = np.array(binary) if np is not None else binary

            return PreprocessResult(
                original=image,
                processed=bin_arr,
                grayscale=gray_arr,
                binary=bin_arr,
                skew_angle=0.0,
                was_deskewed=False,
                was_perspective_corrected=False,
                scale_factor=scale,
                steps_applied=steps,
            )

        # Full OpenCV Pipeline
        original = image.copy()
        img, scale = self._resize_if_needed(image)
        if scale != 1.0:
            steps.append(f"resized (scale={scale:.2f})")

        img = self._denoise(img)
        steps.append("bilateral_filter")

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        steps.append("grayscale")

        gray = self._enhance_contrast(gray)
        steps.append("clahe_contrast")

        gray, skew_angle, was_deskewed = self._deskew(gray)
        if was_deskewed:
            steps.append(f"deskewed ({skew_angle:.1f}°)")

        binary = self._threshold(gray)
        steps.append("adaptive_threshold")

        binary = self._morphological_cleanup(binary)
        steps.append("morph_cleanup")

        return PreprocessResult(
            original=original,
            processed=cv2.cvtColor(binary, cv2.COLOR_GRAY2BGR),
            grayscale=gray,
            binary=binary,
            skew_angle=skew_angle,
            was_deskewed=was_deskewed,
            was_perspective_corrected=False,
            scale_factor=scale,
            steps_applied=steps,
        )

    def _resize_if_needed(self, image: np.ndarray) -> tuple[np.ndarray, float]:
        if cv2 is None:
            return image, 1.0
        h, w = image.shape[:2]
        if w > self.target_width:
            scale = self.target_width / w
            resized = cv2.resize(image, (self.target_width, int(h * scale)), interpolation=cv2.INTER_AREA)
            return resized, scale
        if w < self.min_width:
            scale = self.min_width / w
            resized = cv2.resize(image, (self.min_width, int(h * scale)), interpolation=cv2.INTER_CUBIC)
            return resized, scale
        return image, 1.0

    def _denoise(self, image: np.ndarray) -> np.ndarray:
        if cv2 is None:
            return image
        return cv2.bilateralFilter(image, self.bilateral_d, self.bilateral_sigma_color, self.bilateral_sigma_space)

    def _enhance_contrast(self, gray: np.ndarray) -> np.ndarray:
        if cv2 is None:
            return gray
        clahe = cv2.createCLAHE(clipLimit=self.clahe_clip_limit, tileGridSize=self.clahe_tile_size)
        return clahe.apply(gray)

    def _deskew(self, gray: np.ndarray) -> tuple[np.ndarray, float, bool]:
        if cv2 is None or np is None:
            return gray, 0.0, False
        angle = compute_skew_angle(gray)
        if abs(angle) > self.max_skew_angle or abs(angle) < 0.5:
            return gray, 0.0, False
        rotated = rotate_image(gray, angle)
        return rotated, angle, True

    def _threshold(self, gray: np.ndarray) -> np.ndarray:
        if cv2 is None:
            return gray
        blurred = cv2.GaussianBlur(gray, (3, 3), 0)
        _, otsu = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        adaptive = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 21, 10)
        combined = cv2.bitwise_and(otsu, adaptive)
        return combined

    def _morphological_cleanup(self, binary: np.ndarray) -> np.ndarray:
        if cv2 is None:
            return binary
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, self.morph_kernel_size)
        cleaned = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)
        return cleaned


def compute_skew_angle(gray: np.ndarray) -> float:
    if cv2 is None or np is None:
        return 0.0
    try:
        edges = cv2.Canny(gray, 50, 150, apertureSize=3)
        lines = cv2.HoughLinesP(edges, 1, np.pi / 180, threshold=100, minLineLength=100, maxLineGap=10)
        if lines is None or len(lines) == 0:
            return 0.0
        angles: list[float] = []
        for line in lines:
            # Safely handle both (1, 4) and (4,) shapes
            coords = np.array(line).flatten()
            if len(coords) < 4:
                continue
            x1, y1, x2, y2 = int(coords[0]), int(coords[1]), int(coords[2]), int(coords[3])
            dx = x2 - x1
            dy = y2 - y1
            if dx == 0:
                continue
            angle = math.degrees(math.atan2(dy, dx))
            if abs(angle) < 45.0:
                angles.append(angle)
        if not angles:
            return 0.0
        return float(np.median(angles))
    except Exception:
        return 0.0


def rotate_image(image: np.ndarray, angle: float) -> np.ndarray:
    if cv2 is None:
        return image
    h, w = image.shape[:2]
    center = (w // 2, h // 2)
    matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
    return cv2.warpAffine(image, matrix, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)


def detect_label_contour(image: np.ndarray) -> Optional[np.ndarray]:
    if cv2 is None or np is None:
        return None
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edged = cv2.Canny(blurred, 75, 200)
    contours, _ = cv2.findContours(edged, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)[:5]
    for c in contours:
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02 * peri, True)
        if len(approx) == 4:
            return approx.reshape(4, 2)
    return None


def perspective_transform(image: np.ndarray, pts: np.ndarray) -> np.ndarray:
    if cv2 is None or np is None:
        return image
    rect = order_points(pts)
    (tl, tr, br, bl) = rect
    width_a = np.linalg.norm(br - bl)
    width_b = np.linalg.norm(tr - tl)
    max_width = max(int(width_a), int(width_b))
    height_a = np.linalg.norm(tr - br)
    height_b = np.linalg.norm(tl - bl)
    max_height = max(int(height_a), int(height_b))
    dst = np.array([
        [0, 0],
        [max_width - 1, 0],
        [max_width - 1, max_height - 1],
        [0, max_height - 1],
    ], dtype=np.float32)
    matrix = cv2.getPerspectiveTransform(rect, dst)
    return cv2.warpPerspective(image, matrix, (max_width, max_height))


def order_points(pts: np.ndarray) -> np.ndarray:
    if np is None:
        return pts
    rect = np.zeros((4, 2), dtype=np.float32)
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]
    d = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(d)]
    rect[3] = pts[np.argmax(d)]
    return rect


def preprocess_label_image(
    image: np.ndarray,
    attempt_perspective: bool = True,
) -> PreprocessResult:
    preprocessor = LabelPreprocessor()
    quad = None
    if attempt_perspective and cv2 is not None and isinstance(image, np.ndarray):
        quad = detect_label_contour(image)
        if quad is not None:
            image = perspective_transform(image, quad)

    result = preprocessor.preprocess(image)
    if attempt_perspective and quad is not None:
        result.was_perspective_corrected = True
        result.steps_applied.insert(0, "perspective_corrected")
    return result
