import logging

from fastapi import FastAPI

from app.routers import (
    auth,
    comments,
    connections,
    engagement,
    invites,
    posts,
    profile,
    search,
    uploads,
    users,
)

logging.basicConfig(level=logging.INFO)

# The database tables are created by Alembic migrations (`alembic upgrade head`), not here.
app = FastAPI(title="Medin API")

# No CORS setup is needed: the browser talks only to the Next.js app, which
# forwards /api/* requests to this server (see frontend/next.config.js).

app.include_router(auth.router)
app.include_router(posts.router)
app.include_router(comments.router)
app.include_router(users.router)
app.include_router(profile.router)
app.include_router(connections.router)
app.include_router(search.router)
app.include_router(engagement.router)
app.include_router(uploads.router)
app.include_router(invites.router)


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}
