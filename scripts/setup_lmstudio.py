#!/usr/bin/env python3
"""
scripts/setup_lmstudio.py - one script, any OS (Windows / macOS / Linux), Python 3.8+, no pip installs.

Sets up N-ATLaS locally in LM Studio from the community GGUF repo tosinamuda/N-ATLaS-GGUF:
  1. downloads ONE pinned quant (default Q4_K_M, ~4.9 GB) into LM Studio's models folder (resumable)
  2. verifies size + SHA-256 against the Hugging Face Hub's own record
  3. if the `lms` CLI is installed: starts the server and loads the model
  4. smoke-tests http://localhost:1234/v1 with a Hausa prompt

Examples:
  python scripts/setup_lmstudio.py                  # Q4_K_M, asks you to accept the N-ATLaS terms
  python scripts/setup_lmstudio.py --yes            # non-interactive
  python scripts/setup_lmstudio.py --quant Q5_K_M   # better quality, needs a bit more RAM
  python scripts/setup_lmstudio.py --list           # show available quants
  python scripts/setup_lmstudio.py --no-load        # download + verify only

Env overrides: LMSTUDIO_MODELS_DIR, HF_TOKEN (optional), NATLAS_ACCEPT_TERMS=1
"""
import argparse
import hashlib
import http.client
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import HTTPRedirectHandler, Request, build_opener

REPO = "tosinamuda/N-ATLaS-GGUF"
# Pinned commit: if the uploader changes a file later, this script still fetches the one we checked.
PINNED_REV = "af9195261dd163807b31318b9b9d577de5ae3b7e"

# quant -> (filename, approx size in GB as listed on the Hub, note)
QUANTS = {
    "Q4_K_M": ("N-ATLaS-GGUF-Q4_K_M.gguf", 4.92, "default - laptops, no GPU needed (8-16 GB RAM)"),
    "Q5_K_M": ("N-ATLaS-GGUF-Q5_K_M.gguf", 5.73, "a bit better quality, ~16 GB RAM"),
    "Q6_K":   ("N-ATLaS-GGUF-Q6_K.gguf",   6.60, "near-lossless, ~16 GB RAM"),
    "Q8_0":   ("N-ATLaS-GGUF-Q8_0.gguf",   8.54, "highest practical quality, ~16-24 GB RAM"),
    "F16":    ("N-ATLaS-GGUF-F16.gguf",   16.10, "full precision - needs a big GPU / 32 GB RAM"),
}

TERMS = f"""
N-ATLaS Terms of Use (summary - full text: https://huggingface.co/{REPO} and https://huggingface.co/NCAIR1/N-ATLaS)
  * Use is limited to organizations/projects with no more than 1,000 active end-users (rolling 30 days).
    Beyond that you need a commercial license from Awarri Technologies.
  * Intended for research, education, civic tech, accessibility and community projects; it is not
    an enterprise-grade or commercial system.
  * Prohibited: surveillance, discriminatory profiling, disinformation/impersonation/fraud, military use,
    and unauthorized personal-data scraping or profiling.
  * Derivatives must be released under the same terms. If you rename the model it must carry the suffix
    "Powered by Awarri".
  * Required attribution in public use: "N-ATLaS is an initiative of the Federal Ministry of
    Communications, Innovation and Digital Economy, and powered by Awarri Technologies."
This GGUF is an unofficial community quantization of NCAIR1/N-ATLaS ({REPO}).
"""


def say(msg):
    print("==> " + msg, flush=True)


def warn(msg):
    print("WARN: " + msg, file=sys.stderr, flush=True)


def die(msg, code=1):
    print("ERROR: " + msg, file=sys.stderr, flush=True)
    sys.exit(code)


class _StripAuthOnRedirect(HTTPRedirectHandler):
    """Don't forward the HF token to the CDN host the Hub redirects downloads to."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        new = super().redirect_request(req, fp, code, msg, headers, newurl)
        if new is not None and urlparse(newurl).netloc != urlparse(req.full_url).netloc:
            new.headers.pop("Authorization", None)
        return new


_OPENER = build_opener(_StripAuthOnRedirect)


def hf_headers():
    h = {"User-Agent": "natlas-toolkit-setup/1.0"}
    if os.environ.get("HF_TOKEN"):
        h["Authorization"] = "Bearer " + os.environ["HF_TOKEN"]
    return h


def fetch(url, headers=None, data=None, timeout=60):
    return _OPENER.open(Request(url, data=data, headers=headers or {}), timeout=timeout)


def hub_meta(rev, filename):
    """Return (sha256, size_bytes) for `filename` at `rev`, or (None, None) if the Hub won't say."""
    try:
        with fetch(f"https://huggingface.co/api/models/{REPO}/tree/{rev}", hf_headers()) as r:
            for entry in json.load(r):
                if entry.get("path") == filename:
                    lfs = entry.get("lfs") or {}
                    return lfs.get("oid"), (lfs.get("size") or entry.get("size"))
    except Exception as exc:  # network down, API change, etc. - not fatal
        warn(f"Could not read file metadata from the Hub ({exc}).")
    return None, None


def sha256_of(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def download(url, dest, expected_size, attempts=5):
    """Resumable download to dest (via dest.part). Retries on network errors."""
    part = dest.with_name(dest.name + ".part")
    for attempt in range(1, attempts + 1):
        try:
            pos = part.stat().st_size if part.exists() else 0
            if expected_size and pos == expected_size:
                break
            headers = hf_headers()
            if pos:
                headers["Range"] = f"bytes={pos}-"
            try:
                resp = fetch(url, headers, timeout=60)
            except HTTPError as e:
                if e.code == 416 and part.exists():  # range past EOF -> already complete
                    break
                raise
            with resp:
                if pos and resp.status != 206:  # server ignored Range: start over
                    pos = 0
                total = expected_size or 0
                if not total:
                    cl = resp.headers.get("Content-Length")
                    total = (int(cl) + pos) if cl else 0
                done, last = pos, 0.0
                with open(part, "ab" if pos else "wb") as f:
                    while True:
                        chunk = resp.read(1 << 20)
                        if not chunk:
                            break
                        f.write(chunk)
                        done += len(chunk)
                        now = time.time()
                        if now - last > 1.0:
                            last = now
                            pct = f"{done * 100 // total}%" if total else ""
                            sys.stderr.write(f"\r    {done / 1e9:6.2f} / {total / 1e9:.2f} GB {pct}   ")
                            sys.stderr.flush()
                sys.stderr.write("\n")
            if total and done < total:
                raise http.client.IncompleteRead(b"", total - done)
            break
        except HTTPError as e:
            if e.code < 500:
                die(f"Download failed: HTTP {e.code} {e.reason}. If the repo became gated, set HF_TOKEN.")
            warn(f"Server error {e.code} (attempt {attempt}/{attempts}); retrying ...")
        except (URLError, OSError, http.client.HTTPException) as e:
            warn(f"Network problem: {e} (attempt {attempt}/{attempts}); retrying ...")
        if attempt == attempts:
            die("Download did not finish. Re-run the script to resume where it stopped.")
        time.sleep(3 * attempt)
    part.replace(dest)


def find_lms():
    exe = shutil.which("lms")
    if exe:
        return exe
    for name in ("lms.exe", "lms"):
        p = Path.home() / ".lmstudio" / "bin" / name
        if p.exists():
            return str(p)
    return None


def wait_for_server(port, seconds=30):
    for _ in range(seconds):
        try:
            with fetch(f"http://localhost:{port}/v1/models", timeout=2):
                return True
        except Exception:
            time.sleep(1)
    return False


def smoke_test(port, ident):
    body = {
        "model": ident,
        "messages": [
            {"role": "system", "content": "You are a friendly assistant and you are here to help."},
            {"role": "user", "content": "Sannu! Ka gaya mini game da Najeriya a jumla guda."},
        ],
        "max_tokens": 80,
        "temperature": 0.1,
    }
    with fetch(f"http://localhost:{port}/v1/chat/completions",
              {"Content-Type": "application/json"}, json.dumps(body).encode(), timeout=300) as r:
        out = json.load(r)
    print("\n  " + out["choices"][0]["message"]["content"].strip().replace("\n", "\n  ") + "\n")


def main():
    for stream in (sys.stdout, sys.stderr):  # Hausa/Yoruba/Igbo characters on Windows consoles
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

    ap = argparse.ArgumentParser(description="Set up N-ATLaS (GGUF) in LM Studio.")
    ap.add_argument("--quant", default="Q4_K_M", help="Q4_K_M (default), Q5_K_M, Q6_K, Q8_0, F16")
    ap.add_argument("--list", action="store_true", help="list available quants and exit")
    ap.add_argument("-y", "--yes", action="store_true", help="accept the N-ATLaS terms non-interactively")
    ap.add_argument("--skip-hash", action="store_true", help="skip SHA-256 verification")
    ap.add_argument("--no-load", action="store_true", help="download + verify only; don't touch LM Studio")
    ap.add_argument("--models-dir", default=os.environ.get("LMSTUDIO_MODELS_DIR"),
                    help="LM Studio models folder (default ~/.lmstudio/models)")
    ap.add_argument("--port", type=int, default=1234, help="LM Studio server port (default 1234)")
    ap.add_argument("--context", type=int, default=4096,
                    help="context length to load with (default 4096; model is tuned for ~8k)")
    ap.add_argument("--identifier", default="NCAIR1/N-ATLaS",
                    help="model name exposed by the server (default NCAIR1/N-ATLaS, what the toolkit examples use)")
    ap.add_argument("--revision", default=PINNED_REV, help="repo commit to download (default: pinned)")
    args = ap.parse_args()

    if args.list:
        print(f"Quants in {REPO}:")
        for name, (fname, gb, note) in QUANTS.items():
            print(f"  {name:7} {gb:6.2f} GB  {note}")
        return

    quant = args.quant.upper()
    if quant not in QUANTS:
        die(f"Unknown quant '{args.quant}'. Choose one of: {', '.join(QUANTS)}")
    filename, approx_gb, _ = QUANTS[quant]
    if quant == "F16":
        warn("F16 is 16 GB and needs a large GPU or ~32 GB RAM. Most laptops want Q4_K_M or Q5_K_M.")
    if args.revision != PINNED_REV:
        warn(f"Using revision '{args.revision}' instead of the pinned, checked commit.")

    # ---- terms gate -------------------------------------------------------------------------
    print(TERMS)
    accepted = args.yes or os.environ.get("NATLAS_ACCEPT_TERMS") == "1"
    if not accepted:
        if not sys.stdin.isatty():
            die("Non-interactive shell: re-run with --yes to accept the terms.")
        if input("Continue? [y/N] ").strip().lower() not in ("y", "yes"):
            die("Aborted.")

    models_dir = Path(args.models_dir).expanduser() if args.models_dir else Path.home() / ".lmstudio" / "models"
    dest = models_dir / REPO / filename  # LM Studio layout: <models>/<publisher>/<model>/<file>.gguf
    dest.parent.mkdir(parents=True, exist_ok=True)
    key = f"{REPO}/{filename}"

    # ---- download + verify ------------------------------------------------------------------
    oid, size = hub_meta(args.revision, filename)
    floor = size or int(approx_gb * 1e9 * 0.95)
    if dest.exists() and dest.stat().st_size >= floor:
        say(f"Already downloaded: {dest}")
    else:
        part = dest.with_name(dest.name + ".part")
        have = part.stat().st_size if part.exists() else 0
        need = (size or int(approx_gb * 1e9)) - have + 10**9  # +1 GB headroom
        free = shutil.disk_usage(dest.parent).free
        if free < need:
            die(f"Not enough disk space in {dest.parent}: need ~{need / 1e9:.1f} GB, have {free / 1e9:.1f} GB.")
        say(f"Downloading {filename} (~{approx_gb} GB, resumable) ...")
        download(f"https://huggingface.co/{REPO}/resolve/{args.revision}/{filename}", dest, size)

    actual_size = dest.stat().st_size
    if size and actual_size != size:
        die(f"Size mismatch (expected {size}, got {actual_size}). Delete {dest} and re-run.")
    if actual_size < floor:
        die(f"File looks truncated ({actual_size} bytes). Delete {dest} and re-run.")

    if args.skip_hash:
        warn("Skipping hash check (--skip-hash).")
    else:
        say("Verifying SHA-256 (takes a minute) ...")
        actual = sha256_of(dest)
        if not oid:
            warn(f"The Hub did not return a hash for {filename}. Actual SHA-256: {actual}")
        elif actual.lower() == oid.lower():
            say(f"SHA-256 OK: {actual}")
        else:
            dest.unlink()
            die(f"SHA-256 mismatch (expected {oid}, got {actual}). Corrupt file deleted; re-run.")
    say(f"Model file ready: {dest}")

    # ---- LM Studio ---------------------------------------------------------------------------
    if args.no_load:
        say("Skipping LM Studio steps (--no-load).")
    else:
        lms = find_lms()
        if not lms:
            warn("LM Studio CLI ('lms') not found. Do this once by hand:")
            print(f"""  1. Install LM Studio: https://lmstudio.ai  (open it once, then restart it so it rescans models)
  2. 'My Models' should now list: {key}
  3. Developer tab -> load that model, set Context Length to {args.context}, Start Server (port {args.port})
  4. Optional: run 'lms bootstrap' (inside ~/.lmstudio/bin) so the 'lms' command works, then re-run this script.""")
        else:
            say(f"Starting LM Studio server on port {args.port} ...")
            r = subprocess.run([lms, "server", "start", "--port", str(args.port)], capture_output=True, text=True)
            if r.returncode != 0:
                warn("'lms server start' returned non-zero (it may already be running).")
            say(f"Loading model as '{args.identifier}' (context {args.context}) ...")
            r = subprocess.run([lms, "load", key, "--identifier", args.identifier,
                                "--context-length", str(args.context), "-y"])
            if r.returncode != 0:
                warn("'lms load' failed - load the model from LM Studio's Developer tab instead.")

        say(f"Waiting for http://localhost:{args.port}/v1 ...")
        if wait_for_server(args.port):
            say("Smoke test (the first reply on CPU can take a minute) ...")
            try:
                smoke_test(args.port, args.identifier)
            except Exception as exc:
                warn(f"Server is up but the chat request failed ({exc}). Check the model is loaded in LM Studio.")
        else:
            warn(f"Server not reachable on port {args.port}; start it from LM Studio's Developer tab.")

    # ---- wrap-up -----------------------------------------------------------------------------
    base = f"http://localhost:{args.port}/v1"
    print("\nDone. Point the toolkit at it:\n")
    if os.name == "nt":
        print(f'  $env:NATLAS_BASE_URL = "{base}"      # PowerShell')
        print('  $env:NATLAS_API_KEY  = "lm-studio"')
        print(f"  (cmd.exe: set NATLAS_BASE_URL={base}  and  set NATLAS_API_KEY=lm-studio)")
    else:
        print(f'  export NATLAS_BASE_URL="{base}"')
        print('  export NATLAS_API_KEY="lm-studio"   # LM Studio ignores the value; clients just need one')
    print(f"  model name: {args.identifier}\n")
    print("Tips: the model card recommends temperature 0.1 and repetition_penalty 1.12, and its chat template\n"
          "takes today's date. If replies look odd, add a system prompt that states the date.")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        die("Interrupted. Re-run to resume the download.", 130)
