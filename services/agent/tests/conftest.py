import sys
from pathlib import Path

PYTHON_ROOT = Path(__file__).resolve().parents[1]
if str(PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ROOT))

if sys.platform == "win32":
    platform_py = PYTHON_ROOT / "platform" / "windows"
else:
    platform_py = PYTHON_ROOT / "platform" / "linux"

if platform_py.exists() and str(platform_py) not in sys.path:
    sys.path.insert(0, str(platform_py))

