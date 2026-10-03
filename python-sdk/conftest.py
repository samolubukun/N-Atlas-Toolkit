"""Pytest configuration for natlas python-sdk.

Ensures 'natlas' is importable in tests whether the package is installed
regularly (pip install ./python-sdk) or in development/editable mode
(pip install -e ./python-sdk), where setuptools may expose the src tree
under the name 'src' instead of 'natlas'.
"""
import sys
from pathlib import Path

# In editable installs setuptools maps src/ as 'src' not 'natlas'.
# Register an alias so `import natlas` always works during tests.
try:
    import natlas  # noqa: F401 — already available, nothing to do
except ModuleNotFoundError:
    import importlib
    import importlib.util

    _src = str(Path(__file__).parent / "src")
    if _src not in sys.path:
        sys.path.insert(0, _src)

    # Create a 'natlas' alias in sys.modules pointing to the 'src' package
    import src as _src_pkg  # type: ignore[import-not-found]

    sys.modules.setdefault("natlas", _src_pkg)
    # Register all sub-modules under the natlas namespace
    for _key in list(sys.modules):
        if _key.startswith("src."):
            _alias = "natlas" + _key[3:]
            sys.modules.setdefault(_alias, sys.modules[_key])
