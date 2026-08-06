"""
image_processing.py

Normalizes an uploaded image (whatever format/dimensions the admin's
file happens to be - phone photos, screenshots, PNGs with transparency,
HEIC-that-the-browser-already-converted, etc.) into one consistent
format before it's ever handed to storage.py. Used by app.py's fellow
photo upload/edit routes so every fellow's photo renders identically
in the Fellowship page's fixed-size <FellowCard> photo slot, instead of
depending on whoever uploaded it having already cropped/resized/
re-encoded it correctly by hand.

Deliberately narrow: this isn't a general image-processing utility,
it's "make this into a fellow headshot" - a fixed square, center-cropped
to fill (not letterboxed), re-encoded as JPEG at a fixed quality.
"""

import io

from PIL import Image, ImageOps

PHOTO_SIZE = (600, 600)
JPEG_QUALITY = 85


class UnsupportedImageError(ValueError):
    """Raised when the uploaded file isn't a readable image at all."""


def normalize_photo(file_obj):
    """
    Reads an uploaded image (a Werkzeug FileStorage or any file-like
    object Pillow can open) and returns (bytes, "image/jpeg") - always
    a JPEG at PHOTO_SIZE, regardless of the original format, dimensions,
    or aspect ratio:
      - EXIF orientation is applied and then stripped (ImageOps.exif_transpose),
        so a photo taken sideways on a phone doesn't end up sideways here.
      - Transparency (PNG/WEBP) is flattened onto a white background,
        since JPEG has no alpha channel.
      - ImageOps.fit center-crops to PHOTO_SIZE's aspect ratio and then
        resizes - fills the frame completely rather than letterboxing,
        which is what a portrait photo grid needs.
    Raises UnsupportedImageError if the file can't be read as an image
    at all (wrong file type, corrupted upload).
    """
    try:
        image = Image.open(file_obj)
        image.load()  # force-read now so a truncated/corrupt file fails here, not later
    except Exception as e:  # noqa: BLE001 - Pillow raises several different exception types for "not an image"
        raise UnsupportedImageError(f"Could not read this file as an image: {e}") from e

    image = ImageOps.exif_transpose(image)

    if image.mode in ("RGBA", "LA", "P"):
        background = Image.new("RGB", image.size, (255, 255, 255))
        rgba = image.convert("RGBA")
        background.paste(rgba, mask=rgba.split()[-1])
        image = background
    else:
        image = image.convert("RGB")

    image = ImageOps.fit(image, PHOTO_SIZE, method=Image.LANCZOS)

    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=JPEG_QUALITY, optimize=True)
    return buffer.getvalue(), "image/jpeg"