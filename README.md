# Bank Statement Processor

Extracts transactions from Targobank PDF statements (Girokonto and Kreditkarte), normalizes them into a single format, and categorizes them for financial analysis. I built it to stop drowning at tax time: instead of handing my tax advisor a shoebox of PDFs, I hand over categorized transaction reports. It is a personal tool, built for the statement layouts of exactly one bank, and documented accordingly.

## Architecture

Three services and a database. The pipeline is extraction, then normalization, then categorization and reporting.

```
PDF / ZIP upload
      |
      v
React webapp (Vite, :5173 in dev)
      |                \
      | ingest          \  everything else
      v                  v
Python extraction     C# API (ASP.NET Core, :5201)
service (Flask, :5001)   auth, statements, reports,
      |                  categorization, rules, receipts
      v                  |
   MongoDB  <------------+
   (statements, rules, reports, users;
    page images and receipts in GridFS)
```

### Extraction and normalization (`python/`)

A Flask service that accepts single PDFs or ZIP archives of them. The two statement types take different paths:

- Girokonto statements ("Ihr Finanzstatus") are parsed with pdfplumber. Table detection uses a set of tolerances (line spacing, column intersection, text positioning) that can be adjusted per upload from the webapp for statements the defaults misread.
- Kreditkarte statements ("Ihre Kreditkartenabrechnung") are converted to text with poppler's `pdftotext` and parsed with regular expressions.

Extraction is in Python because the PDF tooling (pdfplumber, poppler) lives there. Both paths render page images (full page, plus a cropped table region for Girokonto) into GridFS, stream progress to the browser via server-sent events, and normalize into one statement model: German decimal parsing, the Girokonto Ausgaben/Einnahmen columns collapsed into a single signed amount, and the statement date taken from the PDF filename. The result is written to MongoDB.

### Categorization and reporting (`backend/`)

An ASP.NET Core minimal API that owns everything after extraction: browsing extracted statements, reports, categorization, and user management. Auth is JWT with an RSA keypair and three roles (Admin, ReadWrite, ReadOnly).

Reports are the working surface: transactions are copied from statements into a report and edited there, so the original extraction stays untouched. Categorization is rule-based. A category rule holds one or more regex patterns and a priority; enabled rules are evaluated in priority order against a transaction's Buchungstext, and the first match wins. Rules are written by hand, or a pattern can be suggested from a sample Buchungstext by a language model (prompt in `backend/derivePatternPrompt.md`, optional, configured via `LLM_*` in `.env`). Whatever the rules miss is assigned manually, with bulk assignment and pattern-based "find similar transactions" to make that less tedious. Naming rules work the same way for turning raw merchant strings into readable names. Receipts (PDF or image) can be attached to transactions and are stored in GridFS.

### Webapp (`webapp/`)

React 19 with Vite and Tailwind. The ingest pages talk directly to the Python service; everything else goes through the C# API. Route-level feature flags (`VITE_ENABLE_*`) exclude disabled pages from the production bundle entirely (see `webapp/FEATURE_FLAGS.md`). Reports export to an EÜR-style PDF (jspdf) and to Excel (exceljs). In production the C# API serves the built webapp from `wwwroot`.

## Stack

- Python 3.11, Flask, pdfplumber, poppler (`pdftotext`), pymongo
- C# / .NET 9, ASP.NET Core minimal APIs, MongoDB C# driver, BCrypt.Net
- React 19, Vite, Tailwind CSS 4
- MongoDB, with GridFS for page images and receipts
- Docker Compose (all four services; hot reload via bind mounts)
- Any server speaking the OpenAI Responses API — OpenAI or a local runner such as LM Studio (optional, only for suggesting regex patterns)

## Running it

Prerequisites: Docker. Everything else — .NET 9, Python 3.11, Node, poppler — lives in the images.

### 1. Configure

```
cp .env.example .env
```

Every port and secret the stack uses lives in that one file. Changing a port there is enough: the compose port mappings, the C# CORS policy, the Flask bind port, and the webapp's generated `public/config.json` are all derived from it.

Generate an RSA keypair for JWT signing (once):

```
openssl genrsa -out backend/jwt-private-key.pem 2048
openssl rsa -in backend/jwt-private-key.pem -pubout -out backend/jwt-public-key.pem
```

The `LLM_*` block is optional — see [Pattern suggestions](#pattern-suggestions) below.

### 2. Run

```
docker compose up -d
```

Four containers: MongoDB (:27017), the Python extraction service (:5001), the C# API (:5201), and the webapp (:5173). All three services bind-mount their source from the host, so edits hot-reload — Vite HMR, the Flask reloader, and `dotnet watch` respectively. Open http://localhost:5173.

Only MongoDB holds state, in the `mongodb_data` volume.

### 3. First user

There is no registration endpoint and no seeding: user management requires an Admin token, which means the first admin has to be inserted into MongoDB by hand. Generate a BCrypt hash of your chosen password (any BCrypt tool works, for example `pip install bcrypt` and):

```
python3 -c "import bcrypt; print(bcrypt.hashpw(b'your-password-here', bcrypt.gensalt()).decode())"
```

Then insert the user (field names are PascalCase, matching the C# driver's defaults):

```
docker exec -it mongodb mongosh bankstatements --eval '
db.users.insertOne({
  UserName: "admin",
  FirstName: "Ada",
  LastName: "Muster",
  Email: "admin@example.invalid",
  Roles: ["Admin"],
  PasswordHash: "<bcrypt hash from above>",
  IsActive: true,
  FailedLoginAttempts: 0,
  LastLogin: null,
  LockoutEndTime: null,
  CreatedDate: new Date()
})'
```

### Pattern suggestions

Optional. The only place a language model is used is the "auto-generate" button that suggests a regex for a category or naming rule from a sample Buchungstext (prompt in `backend/derivePatternPrompt.md`). Extraction and categorization are entirely deterministic and unaffected — with `LLM_*` unset, that one button reports an error and everything else works.

It speaks the OpenAI Responses API, so it points at either OpenAI or a local runner:

```
LLM_BASE_URL=https://api.openai.com/v1     LLM_MODEL=gpt-4.1-2025-04-14
LLM_BASE_URL=http://<lan-ip>:3000/v1       LLM_MODEL=qwen/qwen3.6-35b-a3b
```

For LM Studio, enable "Serve on Local Network" and use the machine's LAN address — `localhost` inside a container is the container, not your Mac.

### Running services on the host instead

The containers are the supported path, but nothing stops you running a service directly: install its toolchain (.NET 9 SDK, Python 3.11, Node, and poppler via `brew install poppler`), `docker compose stop <service>`, and point the equivalent environment variables at `localhost` instead of the compose service names.

## What it does not do

- Any bank other than Targobank, and within Targobank exactly two document layouts: the Girokonto "Finanzstatus" and the Kreditkarte "Kreditkartenabrechnung". The parsers are admittedly brittle: if Targobank changes their layout, this breaks.
- Scanned statements. There is no OCR; the PDFs must contain real text.
- Statement dates for files that have been renamed. The date is parsed from the original download filename ("... vom YYYY-MM-DD.pdf").
- Automated ingestion. No bank API, no FinTS, no email fetching. You download the PDFs from online banking and upload them.
- Machine-learned categorization. Rules are regex, matching is first-match-wins, and accuracy is exactly as good as the rules you write. Nothing here is measured or benchmarked.
- Multi-tenancy or hardened deployment. There is login, role-based access, and account lockout, but this is not hardened for the open internet. Run it locally.
- Tests. There is no test suite.

## License

MIT. This is a personal tool that solved a personal problem; use it if it is useful to you.
