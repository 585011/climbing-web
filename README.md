# Webapp for climbing project (Climbing API)
Web application for outdoor climbing (mostly sport climbing). 

Some alternatives exist, but are often limited by: Functionality, Freemium, Data gaps for certain areas.

## Backend API
[Climbing-api](https://github.com/585011/climbing-api)

Status: Early development

## Stack

- React 19
- TypeScript 6
- Vite 8
- Tailwind CSS v4
- TanStack Router v1 (file-based routing)
- TanStack Query v5 (server state)
- Zod (runtime API response validation)

## Development

```bash
npm install
npm run dev      # dev server at localhost:5173
npm run build    # type-check + production build
npm run lint     # ESLint
npm run preview  # preview production build
```

The backend must be running at `localhost:8080` for data to load — see the [climbing-api](https://github.com/585011/climbing-api) repo.

## Docker

Build (the API URL is baked into the bundle at build time):

```bash
docker build --build-arg VITE_API_URL=http://your-api-host/api -t climbing-web .
```

Run on port 8000:

```bash
docker run -p 8000:80 climbing-web
```

## Design

Wireframes live in `docs/designs/climbing-app-wireframes.html` — open in a browser to view all screens.
