# Study Spark AI

I built Study Spark AI as a study assistant for turning course material into something easier to search, browse, and ask questions about. The main idea was to let a student upload lecture PDFs, process them into structured study content, and then use a chat interface to ask grounded questions against that material.

## What This Repo Contains

- A SvelteKit web app under `src/` for login, class navigation, lecture viewing, PDF upload, and chat.
- A document ingestion and indexing flow for uploaded PDFs.
- Supporting Python endpoints under `api/` and `lib/` for document processing and markdown generation.
- Supabase configuration and migrations under `supabase/`.
- Older API experiments preserved under `src/routes/api-deprecated/`.

## What The App Does

- Supports Google sign-in through Supabase auth.
- Organizes uploaded material by class or study context.
- Uploads and stores lecture PDFs.
- Processes documents into chapters, chunks, and derived notes.
- Lets users open lecture PDFs in-app for reference.
- Provides a chat interface called SparkChat that answers questions using indexed course material and shows references back to the source.

## Why I Built It

- I wanted course material and lecture notes in one place instead of scattered across files.
- I wanted uploaded PDFs to become searchable and usable as study context.
- I wanted a question-and-answer interface tied back to actual class documents instead of generic responses.
- I wanted answers to be traceable to specific lectures and pages.

## Repo Layout

- `src/routes/`
  App routes for the dashboard, chat, lecture viewer, upload flow, login, invite flow, and deprecated API endpoints.
- `src/lib/`
  Frontend components, client utilities, document loaders, OpenAI helpers, PDF rendering logic, and database types.
- `api/`
  Python entrypoints and config used by the document processing pipeline.
- `lib/`
  Python helpers for PDF parsing, chapter generation, and markdown revision.
- `supabase/`
  Local Supabase config, schema migrations, and seed scaffolding.
- `static/`
  Images and branded assets used by the UI.

## Main User Flows

- Sign in with Google.
- Open a study class.
- Upload a PDF into the active class.
- Process that document into structured study material.
- Open a lecture viewer for page-level reference.
- Ask SparkChat questions and review source-linked context.

## Tech Stack

- SvelteKit + TypeScript
- Tailwind CSS + DaisyUI
- Supabase auth, database, and storage
- Vercel-oriented runtime configuration
- Python helpers for document processing
- OpenAI-backed summarization and response generation
- Google Document AI and AWS Textract-related ingestion code paths

## Environment Variables

This repo expects configuration for the services it integrates with. The current code references:

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY`
- `PRIVATE_OPENAI_API_KEY` or `OPENAI_API_KEY`
- `PRIVATE_GOOGLE_DOCUMENTAI`
- `PRIVATE_GOOGLE_SERVICE_KEY`
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_SESSION_TOKEN`

## Local Development

Install JavaScript dependencies:

```bash
npm install
```

Install Python dependencies for the Python endpoints:

```bash
pip install -r requirements.txt
```

Start the Svelte app locally:

```bash
npm run dev
```

Start the Supabase/Vercel-oriented local workflow:

```bash
npm run develop
```

Useful scripts:

- `npm run build` builds the app.
- `npm run check` runs Svelte type and project checks.
- `npm run lint` runs formatting and lint checks.
- `npm run update-types` refreshes generated Supabase TypeScript types.
