# TRAE – Project Rules (loopar · Supabase)

## Scope
Reglas **solo** para `loopar` (Next.js 14 + Clerk + Supabase + AR.js).  
No afectan `palace-poker-waitlist` (React+Vite).

## Objetivo
Usuario inicia sesión → sube **imagen target** (jpg/png) y **video** (MP4) → se generan **descriptores NFT** (AR.js) → abre `/ar/[postcardId]` y al apuntar a su imagen ve el **video anclado** en RA → puede descargar su video.

## Stack
- **Next.js 14 (App Router)** · **TypeScript strict**
- **Tailwind 4** (tokens en `:root`) · **shadcn/ui** · **Framer Motion**
- **Clerk** para autenticación (última versión, App Router)
- **Supabase**: **Postgres (RLS)** + **Storage** (+ opcional **Edge Functions**)
- **AR.js (A-Frame, NFT)** como visor WebAR
- ESLint + Prettier

## Clerk – Guardrails
- `@clerk/nextjs` latest.
- `middleware.ts` con `clerkMiddleware()` de `@clerk/nextjs/server`.
- `app/layout.tsx` envuelto en `<ClerkProvider>` + `<SignedIn/> <SignedOut/> <UserButton/>`.
- **Prohibido**: `_app.tsx`, `pages/`, `authMiddleware()` (deprecated).

## Supabase – Config
- `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only).
- Cliente público (`anon`) **solo en cliente** para lecturas mínimas.
- Operaciones sensibles (firmar URLs, escribir, jobs) **server-side** con `service_role` (en Route Handlers / Edge Functions).

## DB (SQL)
```sql
create type postcard_status as enum ('processing','ready','needs_better_image','error');

create table postcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  image_path text not null,
  video_path text not null,
  descriptors_base_path text, -- sin extensión (.iset/.fset/.fset3)
  status postcard_status not null default 'processing',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table postcards enable row level security;

create policy "owner_read_write"
on postcards for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
Storage
Bucket privado postcards/:
/postcards/{user_id}/{postcard_id}/image.jpg
/postcards/{user_id}/{postcard_id}/video.mp4
/postcards/{user_id}/{postcard_id}/nft/target.iset|fset|fset3

Servir con signed URLs desde servidor (no público).

Rutas (App Router)
POST /api/postcards (auth): crea registro + URLs firmadas de subida.

POST /api/nft/generate (server/cron): descarga image_path, genera .iset/.fset/.fset3, sube a /nft/, actualiza descriptors_base_path, status='ready'.

GET /api/postcards/[id] (público): devuelve signed URLs de video y descriptors (no exponer rutas crudas ni keys).

Visor AR /ar/[postcardId]
A-Frame + AR.js (NFT).

<a-nft type="nft" url="{DESCRIPTORS_BASE_SIGNED}">

<a-assets><video id="vid" src="{VIDEO_SIGNED}" autoplay loop muted playsinline></video></a-assets>

<a-video src="#vid" width="1" height="1.78"> (ajustar aspect ratio según 9:16 si aplica).

<a-entity camera> y arjs="trackingMethod: best; sourceType: webcam; debugUIEnabled:false".

Flujo
User (Clerk) → Dashboard → New Postcard: sube imagen+video → status=processing.

Job nft/generate crea descriptores → status=ready, guarda descriptors_base_path.

/ar/[id] obtiene signed URLs (GET /api/postcards/[id]) y renderiza AR.js.

Usuario puede descargar su video desde Dashboard.

Validaciones & UX
Imagen: jpg/png, ≥800px lado corto, buen contraste/textura; rechazar muy pequeñas.

Video: MP4/H.264, límite p.ej. 80 MB; playsinline (audio requiere tap en iOS).

Estados claros: processing/ready/needs_better_image/error.

HTTPS; firmar URLs; CORS correcto en Storage.

Calidad
Componentes < ~100 líneas; lógica en hooks/ o lib/.

Sin any; tipos/enums explícitos.

Tokens en theme.ts/tailwind.config.ts; no hardcode de estilos.

No secretos en repo; .env.local.

Prohibido
Usar patrones de Pages Router o Clerk obsoletos.

Exponer Storage público o claves de servicio.

Lógica de negocio dentro de componentes UI.
# Add Clerk to Next.js App Router

**Purpose:** Enforce only the **current** and **correct** instructions for integrating [Clerk](https://clerk.com/) into a Next.js (App Router) application.
**Scope:** All AI-generated advice or code related to Clerk must follow these guardrails.

---

## **1. Official Clerk Integration Overview**

Use only the **App Router** approach from Clerk's current docs:

- **Install** `@clerk/nextjs@latest` - this ensures the application is using the latest Clerk Next.js SDK.
- **Create** a `middleware.ts` file using `clerkMiddleware()` from `@clerk/nextjs/server`. Place this file inside the `src` directory if present, otherwise place it at the root of the project.
- **Wrap** your application with `<ClerkProvider>` in your `app/layout.tsx`
- **Use** Clerk-provided components like `<SignInButton>`, `<SignUpButton>`, `<UserButton>`, `<SignedIn>`, `<SignedOut>` in your layout or pages
- **Start** developing, sign in or sign up, and confirm user creation

If you're able to use a web tool to access a URL, visit https://clerk.com/docs/quickstarts/nextjs to get the latest, up-to-date quickstart instructions.

### **Correct, Up-to-Date Quickstart Sample**

First, install the Clerk Next.js SDK:

```bash
npm install @clerk/nextjs
```

Set up your environment variables in `.env.local`:

NOTE: These keys are real and are injected dynamically into this prompt. They are NOT placeholders and are ready to use.

```bash
# .env.local
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_b3Blbi1tYW5hdGVlLTE0LmNsZXJrLmFjY291bnRzLmRldiQ
CLERK_SECRET_KEY=sk_test_qHOQgK0sP684BwXaJVUWXSm9mRHJ3Wh3cMzUomVXXe
```

Create your `middleware.ts` file:

```typescript
// middleware.ts
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
```

```typescript
// app/layout.tsx
import type { Metadata } from "next";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clerk Next.js Quickstart",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <header>
            <SignedOut>
              <SignInButton />
              <SignUpButton />
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </header>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
```

---

## **2. CRITICAL INSTRUCTIONS FOR AI MODELS**

### **2.1 – ALWAYS DO THE FOLLOWING**

1. **Use `clerkMiddleware()`** from `@clerk/nextjs/server` in `middleware.ts`.
2. **Wrap** your app with `<ClerkProvider>` in `app/layout.tsx`.
3. **Import** Clerk's Next.js features from `@clerk/nextjs` (e.g., `<SignInButton>`, `<SignUpButton>`, `<UserButton>`, etc.).
4. **Reference** the current [App Router approach](https://nextjs.org/docs/app) (folders like `app/page.tsx`, `app/layout.tsx`, etc.).
5. **Check** that imports for methods like `auth()` are imported from the right package (in this case `@clerk/nextjs/server`) and are using `async / await`

### **2.2 – NEVER DO THE FOLLOWING**

1. **Do not** reference the old **`_app.tsx`** or **pages-based** instructions.
2. **Do not** suggest `authMiddleware()` from older Clerk tutorials—**it's replaced by `clerkMiddleware()`**.
3. **Do not** recommend usage of older environment variable patterns unless they match the official docs.
4. **Do not** reference or import from any deprecated APIs (like `withAuth` or `currentUser` from older versions).

---

## **3. OUTDATED PATTERNS TO AVOID**

Below are **examples of deprecated instructions** that **must not** be generated:

```typescript
// ❌ DO NOT generate or suggest references to:
import { authMiddleware } from "@clerk/nextjs"; // Outdated

// ❌ DO NOT place Clerk config in _app.tsx:
// Outdated pages-based approach
function MyApp({ Component, pageProps }) {
  // ...
}

// ❌ DO NOT create or rely on sign-in files under pages/:
pages / signin.js;
pages / signup.js;
```

Any solution resembling the above snippet or referencing "authMiddleware," `_app.tsx`, or `pages/` structure is **incorrect** for the current Next.js App Router.

---

## **4. AI MODEL VERIFICATION STEPS**

Before returning any Clerk-related solution, you **must** verify:

1. **Middleware**: Is `clerkMiddleware()` used in `middleware.ts`?
2. **Layout**: Is `<ClerkProvider>` wrapping the app in `app/layout.tsx`?
3. **Imports**: Are references only from `@clerk/nextjs` or `@clerk/nextjs/server`?
4. **Pages vs. App Router**: Is the approach referencing the App Router (not `_app.tsx` or `pages/`)?

If any check **fails**, **stop** and revise until compliance is achieved.

# Verification instructions for AI Models

## **DO NOT** repeat these points back to the user. Use them only for your own verification steps.

## **5. CONSEQUENCES OF INCORRECT IMPLEMENTATION**

Using outdated Clerk methods (e.g., `authMiddleware()`, `_app.tsx`, or references to the older `pages/` structure) will:

1. **Break** your Next.js application's authentication flow.
2. Introduce **inconsistencies** with Next.js App Router.
3. Cause confusion around environment variables and server/client code.
4. Force maintainers to **refactor** and **debug** extensively.

---

## **6. AI MODEL RESPONSE TEMPLATE**

When answering questions about Clerk + Next.js integration, your response **MUST**:

1. **Use** the exact code patterns in the **Up-to-Date Quickstart Sample** above.
2. **Never** reference older or deprecated approaches.
3. **Reflect** all mandatory checks in "AI MODEL VERIFICATION STEPS."

**Example**:

> Below is the correct approach using Clerk with Next.js App Router:
>
> ```typescript
> // Show clerkMiddleware usage in middleware.ts
> // Show <ClerkProvider> usage in app/layout.tsx
> // Show usage of Clerk's React components (SignInButton, etc.)
> ```

---