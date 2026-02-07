from __future__ import annotations

from pathlib import Path


def load_dotenv(path: Path) -> dict[str, str]:
    if not path.exists():
        raise FileNotFoundError(f"Missing {path}. Copy .env.example to .env and fill values.")

    out: dict[str, str] = {}
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        k, v = line.split("=", 1)
        k = k.strip()
        v = v.strip().strip('"').strip("'")
        if k:
            out[k] = v
    return out


def main() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    env = load_dotenv(repo_root / ".env")

    url = env.get("SDD_SUPABASE_URL", "").strip()
    anon = env.get("SDD_SUPABASE_ANON_KEY", "").strip()

    if not url or not anon:
        raise SystemExit("SDD_SUPABASE_URL and SDD_SUPABASE_ANON_KEY must be set in .env")

    out_path = repo_root / "Frontend" / "silent disease" / "env.js"
    out_path.parent.mkdir(parents=True, exist_ok=True)

    # IMPORTANT: anon key is public, but keep it out of git anyway.
    out_path.write_text(
        "// Generated from .env by tools/generate_frontend_env.py\n"
        "// Do not commit this file.\n"
        f"window.SDD_SUPABASE_URL = {url!r};\n"
        f"window.SDD_SUPABASE_ANON_KEY = {anon!r};\n",
        encoding="utf-8",
    )

    print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
