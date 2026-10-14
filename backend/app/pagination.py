"""Cursor ("keyset") pagination.

Instead of `OFFSET 20` we ask for "items with id lower than the last one I saw".
New posts arriving while you scroll don't shift the pages, so nothing is
repeated or skipped, and the database can jump straight to the spot via the
primary-key index instead of counting past skipped rows.
"""

DEFAULT_PAGE_SIZE = 10
MAX_PAGE_SIZE = 50


def cursor_page(query, id_column, before_id: int | None, limit: int):
    """Returns (rows, next_cursor), newest first."""
    if before_id is not None:
        query = query.filter(id_column < before_id)

    # Fetch one extra row to know whether another page exists.
    rows = query.order_by(id_column.desc()).limit(limit + 1).all()
    has_more = len(rows) > limit
    rows = rows[:limit]

    next_cursor = rows[-1].id if has_more else None
    return rows, next_cursor
