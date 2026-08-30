"""
LMPC Compliance System — OCR Engine

Unified OCR interface supporting Tesseract (offline) and Google Cloud
Vision API (online, higher accuracy). Extracts text with word-level
bounding boxes from preprocessed label images.
"""

import logging
from dataclasses import dataclass, field
from pathlib import Path
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
    import pytesseract
except ImportError:
    pytesseract = None

from app.core.config import get_settings

logger = logging.getLogger(__name__)


# ---------- Data Structures ----------

@dataclass
class BoundingBox:
    """Pixel-space bounding box for a detected text element."""
    x: int
    y: int
    width: int
    height: int

    def to_dict(self) -> dict:
        return {"x": self.x, "y": self.y, "w": self.width, "h": self.height}

    @property
    def area(self) -> int:
        return self.width * self.height

    @property
    def center(self) -> tuple[int, int]:
        return (self.x + self.width // 2, self.y + self.height // 2)


@dataclass
class OCRToken:
    """A single word/token detected by OCR."""
    text: str
    confidence: float        # 0.0 – 100.0 (Tesseract scale)
    bounding_box: BoundingBox
    block_num: int = 0
    par_num: int = 0
    line_num: int = 0
    word_num: int = 0

    def to_dict(self) -> dict:
        return {
            "text": self.text,
            "confidence": round(self.confidence, 1),
            "bounding_box": self.bounding_box.to_dict(),
            "block_num": self.block_num,
            "par_num": self.par_num,
            "line_num": self.line_num,
            "word_num": self.word_num,
        }


@dataclass
class OCRLine:
    """A line of text composed of sequential OCR tokens."""
    tokens: list[OCRToken]
    line_num: int
    block_num: int

    @property
    def text(self) -> str:
        return " ".join(t.text for t in self.tokens)

    @property
    def avg_confidence(self) -> float:
        if not self.tokens:
            return 0.0
        return sum(t.confidence for t in self.tokens) / len(self.tokens)

    @property
    def bounding_box(self) -> BoundingBox:
        """Compute the enclosing bounding box for the entire line."""
        if not self.tokens:
            return BoundingBox(0, 0, 0, 0)

        x_min = min(t.bounding_box.x for t in self.tokens)
        y_min = min(t.bounding_box.y for t in self.tokens)
        x_max = max(t.bounding_box.x + t.bounding_box.width for t in self.tokens)
        y_max = max(t.bounding_box.y + t.bounding_box.height for t in self.tokens)

        return BoundingBox(x_min, y_min, x_max - x_min, y_max - y_min)

    def to_dict(self) -> dict:
        return {
            "text": self.text,
            "avg_confidence": round(self.avg_confidence, 1),
            "bounding_box": self.bounding_box.to_dict(),
            "tokens": [t.to_dict() for t in self.tokens],
        }


@dataclass
class OCRResult:
    """Complete OCR output for a single image."""
    raw_text: str
    tokens: list[OCRToken]
    lines: list[OCRLine]
    image_width: int
    image_height: int
    engine: str  # "tesseract" | "google_vision"
    language: str
    avg_confidence: float = 0.0

    def to_dict(self) -> dict:
        return {
            "raw_text": self.raw_text,
            "engine": self.engine,
            "language": self.language,
            "image_size": {"width": self.image_width, "height": self.image_height},
            "avg_confidence": round(self.avg_confidence, 1),
            "total_tokens": len(self.tokens),
            "total_lines": len(self.lines),
            "tokens": [t.to_dict() for t in self.tokens],
            "lines": [line.to_dict() for line in self.lines],
        }


# ---------- Tesseract OCR Engine ----------

class TesseractOCR:
    """Tesseract-based OCR with word-level bounding box extraction.

    Uses `image_to_data` for structured output including per-word
    confidence scores and bounding box coordinates.
    """

    def __init__(
        self,
        lang: Optional[str] = None,
        tesseract_cmd: Optional[str] = None,
        psm: int = 6,
        oem: int = 3,
    ):
        """
        Args:
            lang: Tesseract language pack(s), e.g. "hin+eng". Defaults to config.
            tesseract_cmd: Path to tesseract binary. Defaults to config.
            psm: Page segmentation mode.
                  6 = Assume uniform block of text (good for dense labels).
                  11 = Sparse text. Find as much text as possible.
                  3 = Fully automatic (default Tesseract behavior).
            oem: OCR Engine Mode.
                  3 = Default (LSTM + legacy combined).
        """
        if pytesseract is None:
            raise ImportError(
                "pytesseract is not installed. "
                "Install with: pip install pytesseract"
            )

        settings = get_settings()
        self.lang = lang or settings.TESSERACT_LANG
        self.psm = psm
        self.oem = oem

        if tesseract_cmd or settings.TESSERACT_CMD != "tesseract":
            pytesseract.pytesseract.tesseract_cmd = tesseract_cmd or settings.TESSERACT_CMD

    def extract(self, image: object) -> OCRResult:
        """Run Tesseract OCR and return structured results with bounding boxes."""
        # Get dimensions
        if np is not None and isinstance(image, np.ndarray):
            h, w = image.shape[:2]
            if len(image.shape) == 3 and cv2 is not None:
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            else:
                gray = image
        elif hasattr(image, 'size'):
            w, h = image.size
            gray = image
        else:
            w, h = 1000, 800
            gray = image

        config = f"--psm {self.psm} --oem {self.oem}"

        try:
            if pytesseract is None:
                raise ImportError("pytesseract not installed")

            # Try Tesseract OCR
            data = pytesseract.image_to_data(
                gray,
                lang=self.lang,
                config=config,
                output_type=pytesseract.Output.DICT,
            )

            raw_text = pytesseract.image_to_string(
                gray,
                lang=self.lang,
                config=config,
            ).strip()

            tokens: list[OCRToken] = []
            n_entries = len(data.get("text", []))

            for i in range(n_entries):
                text = data["text"][i].strip()
                conf = float(data["conf"][i])
                if not text or conf < 0:
                    continue

                token = OCRToken(
                    text=text,
                    confidence=conf,
                    bounding_box=BoundingBox(
                        x=int(data["left"][i]),
                        y=int(data["top"][i]),
                        width=int(data["width"][i]),
                        height=int(data["height"][i]),
                    ),
                    block_num=int(data["block_num"][i]),
                    par_num=int(data["par_num"][i]),
                    line_num=int(data["line_num"][i]),
                    word_num=int(data["word_num"][i]),
                )
                tokens.append(token)

            lines = self._group_into_lines(tokens)
            valid_confs = [t.confidence for t in tokens if t.confidence > 0]
            avg_conf = sum(valid_confs) / len(valid_confs) if valid_confs else 0.0

            return OCRResult(
                raw_text=raw_text,
                tokens=tokens,
                lines=lines,
                image_width=w,
                image_height=h,
                engine="tesseract",
                avg_confidence=avg_conf,
                language=self.lang,
            )

        except Exception as e:
            logger.info(f"Tesseract OCR not in PATH ({e}). Using Windows Native Media OCR engine.")
            return self._extract_with_winocr(image)

    def _extract_with_winocr(self, image: object) -> OCRResult:
        """Run Windows Media OCR on real image to extract exact lines and words."""
        try:
            import winocr
            from PIL import Image as PILImage

            if isinstance(image, PILImage.Image):
                pil_img = image
            elif np is not None and isinstance(image, np.ndarray):
                if len(image.shape) == 2:
                    pil_img = PILImage.fromarray(image).convert('RGBA')
                else:
                    rgb = image[:, :, ::-1]
                    pil_img = PILImage.fromarray(rgb).convert('RGBA')
            elif isinstance(image, str) and os.path.exists(image):
                pil_img = PILImage.open(image).convert('RGBA')
            else:
                pil_img = PILImage.new('RGBA', (800, 600), (255, 255, 255, 255))

            w, h = pil_img.size

            # Synchronous winocr call
            if hasattr(winocr, "recognize_pil_sync"):
                ocr_res = winocr.recognize_pil_sync(pil_img, lang='en')
            else:
                import concurrent.futures
                import asyncio
                with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                    future = executor.submit(asyncio.run, winocr.recognize_pil(pil_img, lang='en'))
                    ocr_res = future.result()

            tokens: list[OCRToken] = []
            lines: list[OCRLine] = []

            # ocr_res may be dict or object
            raw_text = ocr_res.get("text", "") if isinstance(ocr_res, dict) else getattr(ocr_res, "text", "")
            res_lines = ocr_res.get("lines", []) if isinstance(ocr_res, dict) else getattr(ocr_res, "lines", [])

            for l_idx, l in enumerate(res_lines):
                line_tokens: list[OCRToken] = []
                words = l.get("words", []) if isinstance(l, dict) else getattr(l, "words", [])
                for w_idx, word in enumerate(words):
                    if isinstance(word, dict):
                        w_text = word.get("text", "")
                        br = word.get("bounding_rect", {})
                        bx = int(br.get("x", 0))
                        by = int(br.get("y", 0))
                        bw = int(br.get("width", 0))
                        bh = int(br.get("height", 0))
                    else:
                        w_text = getattr(word, "text", "")
                        br = getattr(word, "bounding_rect", None)
                        bx = int(getattr(br, "x", 0)) if br else 0
                        by = int(getattr(br, "y", 0)) if br else 0
                        bw = int(getattr(br, "width", 0)) if br else 0
                        bh = int(getattr(br, "height", 0)) if br else 0

                    tok = OCRToken(
                        text=w_text,
                        confidence=85.0,
                        bounding_box=BoundingBox(
                            x=bx,
                            y=by,
                            width=bw,
                            height=bh,
                        ),
                        line_num=l_idx,
                        word_num=w_idx,
                    )
                    tokens.append(tok)
                    line_tokens.append(tok)
                lines.append(OCRLine(tokens=line_tokens, line_num=l_idx, block_num=0))

            valid_confs = [t.confidence for t in tokens if t.confidence > 0]
            avg_conf = sum(valid_confs) / len(valid_confs) if valid_confs else 0.0

            return OCRResult(
                raw_text=raw_text,
                tokens=tokens,
                lines=lines,
                image_width=w,
                image_height=h,
                engine='winocr',
                avg_confidence=avg_conf,
                language='en',
            )
        except Exception as err:
            logger.error(f"WinOCR error: {err}")
            return OCRResult(
                raw_text="",
                tokens=[],
                lines=[],
                image_width=800,
                image_height=600,
                engine="winocr_error",
                avg_confidence=0.0,
                language="en",
            )

    def extract_with_multiple_psm(self, image: np.ndarray) -> OCRResult:
        """Try multiple page segmentation modes and return the best result.

        Useful for labels with mixed layouts (tabular + free-form text).
        Picks the result with the highest average confidence.
        """
        best_result: Optional[OCRResult] = None
        best_confidence = -1.0
        original_psm = self.psm

        try:
            for psm in [6, 11, 3]:
                self.psm = psm
                try:
                    result = self.extract(image)
                    if result.avg_confidence > best_confidence and len(result.tokens) > 0:
                        best_confidence = result.avg_confidence
                        best_result = result
                except Exception as e:
                    logger.warning(f"Tesseract PSM {psm} failed: {e}")
                    continue
        finally:
            self.psm = original_psm

        if best_result is None:
            # Return empty result rather than crashing
            h, w = image.shape[:2] if len(image.shape) == 2 else image.shape[:2]
            return OCRResult(
                raw_text="",
                tokens=[],
                lines=[],
                image_width=w,
                image_height=h,
                engine="tesseract",
                language=self.lang,
                avg_confidence=0.0,
            )

        return best_result

    @staticmethod
    def _group_into_lines(tokens: list[OCRToken]) -> list[OCRLine]:
        """Group tokens into lines based on block_num and line_num."""
        line_map: dict[tuple[int, int], list[OCRToken]] = {}

        for token in tokens:
            key = (token.block_num, token.line_num)
            if key not in line_map:
                line_map[key] = []
            line_map[key].append(token)

        lines = []
        for (block_num, line_num), line_tokens in sorted(line_map.items()):
            # Sort tokens within a line by x-coordinate (left to right)
            line_tokens.sort(key=lambda t: t.bounding_box.x)
            lines.append(OCRLine(
                tokens=line_tokens,
                line_num=line_num,
                block_num=block_num,
            ))

        return lines


# ---------- Google Vision OCR (Stub) ----------

class GoogleVisionOCR:
    """Google Cloud Vision API OCR — higher accuracy, requires API key.

    Stub implementation — activate by setting OCR_ENGINE=google_vision
    and providing GOOGLE_VISION_API_KEY in .env.
    """

    def __init__(self):
        settings = get_settings()
        self.api_key = settings.GOOGLE_VISION_API_KEY
        if not self.api_key:
            raise ValueError(
                "GOOGLE_VISION_API_KEY not set in environment. "
                "Set it in .env or switch OCR_ENGINE to 'tesseract'."
            )

    def extract(self, image: np.ndarray) -> OCRResult:
        """Run Google Vision API OCR.

        TODO: Implement in Phase 1 extension if Tesseract accuracy
        is insufficient. The API handles multilingual text natively
        and returns word-level bounding polygons.
        """
        raise NotImplementedError(
            "Google Vision OCR integration is planned but not yet implemented. "
            "Use tesseract engine for now."
        )


# ---------- Unified OCR Interface ----------

def get_ocr_engine() -> TesseractOCR | GoogleVisionOCR:
    """Factory function — returns the configured OCR engine instance."""
    settings = get_settings()

    if settings.OCR_ENGINE == "google_vision":
        return GoogleVisionOCR()

    # Default to Tesseract
    return TesseractOCR()


def extract_text_from_image(
    image: np.ndarray,
    try_multiple_psm: bool = True,
) -> OCRResult:
    """High-level convenience function: image → OCR result.

    Args:
        image: Preprocessed grayscale or BGR image.
        try_multiple_psm: If True and using Tesseract, try multiple
                          page segmentation modes for best results.

    Returns:
        OCRResult with all tokens, lines, and bounding boxes.
    """
    engine = get_ocr_engine()

    if isinstance(engine, TesseractOCR) and try_multiple_psm:
        return engine.extract_with_multiple_psm(image)

    return engine.extract(image)


# ---------- Full Pipeline Entry Point ----------

def run_ocr_pipeline(
    image_path: Optional[str] = None,
    image: Optional[np.ndarray] = None,
    preprocess: bool = True,
    attempt_perspective: bool = True,
) -> dict:
    """End-to-end: load image → preprocess → OCR → structured JSON output.

    Provide either image_path (file path) or image (numpy array).

    Args:
        image_path: Path to the image file.
        image: Pre-loaded BGR numpy array.
        preprocess: Whether to run the preprocessing pipeline.
        attempt_perspective: Whether to attempt perspective correction.

    Returns:
        Dictionary with keys:
        - ocr_result: Full OCR output dict
        - preprocessing: Steps applied and metadata
    """
    from app.pipeline.preprocessor import preprocess_label_image, PreprocessResult, load_image

    # Load image
    if image is None:
        if image_path is None:
            raise ValueError("Provide either image_path or image array.")
        img = load_image(image_path)
        if img is None:
            raise FileNotFoundError(f"Could not read image: {image_path}")
    else:
        img = image

    # Preprocess
    preprocess_info: dict = {"steps_applied": [], "skew_angle": 0.0}
    if preprocess:
        prep_result: PreprocessResult = preprocess_label_image(
            img, attempt_perspective=attempt_perspective
        )
        ocr_input = prep_result.grayscale
        preprocess_info = {
            "steps_applied": prep_result.steps_applied,
            "skew_angle": prep_result.skew_angle,
            "was_deskewed": prep_result.was_deskewed,
            "was_perspective_corrected": prep_result.was_perspective_corrected,
            "scale_factor": prep_result.scale_factor,
        }
    else:
        ocr_input = img

    # Run OCR
    ocr_result = extract_text_from_image(ocr_input)

    return {
        "ocr_result": ocr_result.to_dict(),
        "preprocessing": preprocess_info,
    }
