# Database Migration Required

The error `column r.od_distance_bcva does not exist` is occuring because the backend database schema hasn't been updated to match the code changes.

The migration file `096_move_bcva_to_refraction.py` exists in `hms-platform-backend/alembic/versions`, but it hasn't been applied.

## Solution

Please run the following command in the `hms-platform-backend` directory:

```bash
alembic upgrade head
```

Alternatively, if you are running the backend via Docker, restarting the container should apply the migrations automatically.
