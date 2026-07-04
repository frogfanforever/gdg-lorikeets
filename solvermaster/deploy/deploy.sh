#!/usr/bin/env bash
# ==========================================================================
# Deploy example-app (NestJS API + Angular frontend) to Google Cloud Run,
# backed by Cloud SQL (Postgres). Idempotent — safe to re-run.
#
#   PROJECT=my-gcp-project ./deploy/deploy.sh            # full deploy
#   PROJECT=my-gcp-project ./deploy/deploy.sh cleanup    # tear everything down
#
# Prereqs: `gcloud auth login` done, and a project with billing enabled.
# Override any of the vars below via the environment.
# ==========================================================================
set -euo pipefail
cd "$(dirname "$0")/.."   # run from example-app/ root

PROJECT="${PROJECT:?set PROJECT=<your-gcp-project-id>}"
REGION="${REGION:-europe-west1}"
REPO="${REPO:-example-app-repo}"
DB_INSTANCE="${DB_INSTANCE:-example-app-db}"
DB_NAME="${DB_NAME:-example}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-examplepass123}"
API_SERVICE="${API_SERVICE:-example-api}"
FE_SERVICE="${FE_SERVICE:-example-frontend}"

REGISTRY="${REGION}-docker.pkg.dev/${PROJECT}/${REPO}"
API_IMAGE="${REGISTRY}/example-api:latest"
FE_IMAGE="${REGISTRY}/example-frontend:latest"
G="gcloud --project=${PROJECT} --quiet"

url_of() { $G run services describe "$1" --region="$REGION" --format='value(status.url)' 2>/dev/null; }

cleanup() {
  echo "🧹 Tearing down..."
  $G run services delete "$FE_SERVICE"  --region="$REGION" 2>/dev/null || true
  $G run services delete "$API_SERVICE" --region="$REGION" 2>/dev/null || true
  $G sql instances delete "$DB_INSTANCE" 2>/dev/null || true
  $G artifacts repositories delete "$REPO" --location="$REGION" 2>/dev/null || true
  echo "Done."
}

seed() {
  local base="$1"
  if [ "$(curl -s "${base}/api/project")" != "[]" ]; then
    echo "   (projects already present — skipping seed)"; return
  fi
  echo "   seeding 3 projects + 6 tasks via the live API..."
  python3 - "$base" <<'PY'
import json, sys, urllib.request
base = sys.argv[1]
def post(path, body):
    req = urllib.request.Request(base + path, data=json.dumps(body).encode(),
                                 method="POST", headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read())
projects = [
    {"name": "Website Redesign", "description": "Marketing site refresh", "status": "active"},
    {"name": "Mobile App", "description": "iOS + Android MVP", "status": "active"},
    {"name": "Legacy Migration", "description": "Move off the old stack", "status": "archived"},
]
ids = [post("/api/project", p)["id"] for p in projects]
tasks = [
    (0, "Design homepage", False, 3), (0, "Set up CI", True, 2), (0, "Write copy", False, 1),
    (1, "Auth flow", False, 5), (1, "Push notifications", False, 4), (2, "Export data", True, 2),
]
for pi, title, done, priority in tasks:
    post("/api/task", {"projectId": ids[pi], "title": title, "done": done, "priority": priority})
print(f"   seeded projects {ids} + {len(tasks)} tasks")
PY
}

if [ "${1:-}" = "cleanup" ]; then cleanup; exit 0; fi

echo "▶ Project=${PROJECT}  Region=${REGION}"

echo "① Enabling APIs..."
$G services enable run.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com sqladmin.googleapis.com compute.googleapis.com

echo "② Artifact Registry repo (${REPO})..."
$G artifacts repositories describe "$REPO" --location="$REGION" >/dev/null 2>&1 || \
  $G artifacts repositories create "$REPO" --repository-format=docker \
    --location="$REGION" --description="example-app images"

echo "③ Cloud SQL instance (${DB_INSTANCE})... (first create takes ~5 min)"
if ! $G sql instances describe "$DB_INSTANCE" >/dev/null 2>&1; then
  $G sql instances create "$DB_INSTANCE" --database-version=POSTGRES_15 \
    --tier=db-f1-micro --region="$REGION" --root-password="$DB_PASSWORD"
fi
$G sql databases describe "$DB_NAME" --instance="$DB_INSTANCE" >/dev/null 2>&1 || \
  $G sql databases create "$DB_NAME" --instance="$DB_INSTANCE"
CONN="$($G sql instances describe "$DB_INSTANCE" --format='value(connectionName)')"
echo "   connection: ${CONN}"

echo "④ Build + push images (Cloud Build)..."
$G builds submit --config deploy/cloudbuild.yaml \
  --substitutions="_REGION=${REGION},_PROJECT_ID=${PROJECT},_REPO=${REPO}" .

echo "⑤ Deploy API (Cloud Run + Cloud SQL socket)..."
$G run deploy "$API_SERVICE" --image="$API_IMAGE" --region="$REGION" \
  --platform=managed --allow-unauthenticated --add-cloudsql-instances="$CONN" \
  --set-env-vars="^@^DB_HOST=/cloudsql/${CONN}@DB_PORT=5432@DB_USER=${DB_USER}@DB_PASSWORD=${DB_PASSWORD}@DB_NAME=${DB_NAME}@DB_SYNC=true"
BACKEND_URL="$(url_of "$API_SERVICE")"
echo "   API: ${BACKEND_URL}"

echo "⑥ Deploy frontend (Nginx → API)..."
$G run deploy "$FE_SERVICE" --image="$FE_IMAGE" --region="$REGION" \
  --platform=managed --allow-unauthenticated \
  --set-env-vars="BACKEND_URL=${BACKEND_URL}"
FRONTEND_URL="$(url_of "$FE_SERVICE")"

echo "⑦ Seed the database..."
seed "$BACKEND_URL"

echo ""
echo "=========================================================================="
echo "✅ Live:"
echo "   Frontend : ${FRONTEND_URL}"
echo "   API      : ${BACKEND_URL}/api   (Swagger at ${BACKEND_URL}/api)"
echo "=========================================================================="
echo "Verify:  python ai/evals/deploy_eval.py --frontend-url ${FRONTEND_URL} \\"
echo "           --backend-url ${BACKEND_URL} --tls-check"
echo "Teardown: PROJECT=${PROJECT} ./deploy/deploy.sh cleanup"
