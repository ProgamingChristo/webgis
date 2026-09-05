FROM node:22-bookworm-slim@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5 AS deps
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/package.json
COPY backend/package.json ./backend/package.json
RUN npm ci

FROM deps AS frontend-build
COPY . .
RUN --mount=type=secret,id=frontend_public_env,target=/app/frontend/.env.local,required=true npm run build -w frontend

FROM deps AS backend-build
COPY . .
RUN npm run build -w backend

FROM node:22-bookworm-slim@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5 AS backend
WORKDIR /app
ARG GETRA_RELEASE_SHA
LABEL org.opencontainers.image.revision=$GETRA_RELEASE_SHA
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
COPY --from=backend-build --chown=node:node /app/backend/.next/standalone ./
COPY --from=backend-build --chown=node:node /app/backend/.next/static ./backend/.next/static
USER node
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=4 CMD ["node","-e","fetch('http://127.0.0.1:3000/api/health',{signal:AbortSignal.timeout(4000)}).then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
CMD ["node","backend/server.js"]

FROM node:22-bookworm-slim@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5 AS frontend
WORKDIR /app
ARG GETRA_RELEASE_SHA
LABEL org.opencontainers.image.revision=$GETRA_RELEASE_SHA
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
COPY --from=frontend-build --chown=node:node /app/frontend/.next/standalone ./
COPY --from=frontend-build --chown=node:node /app/frontend/.next/static ./frontend/.next/static
COPY --from=frontend-build --chown=node:node /app/frontend/public ./frontend/public
USER node
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=4 CMD ["node","-e","fetch('http://127.0.0.1:3000/login',{signal:AbortSignal.timeout(4000)}).then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
CMD ["node","frontend/server.js"]
