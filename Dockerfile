# ---- Stage 1: build the React frontend (src/) ----
FROM node:20-slim AS frontend
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.js ./
COPY src ./src
RUN npm run build

# ---- Stage 2: FastAPI backend, also serving the built frontend ----
FROM python:3.12-slim
WORKDIR /app
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./
# Built React app goes into static/ alongside the existing images/ dir,
# so FastAPI's StaticFiles mount serves the app at / and product images
# at /images/*. dist/index.html replaces the old single-file page.
COPY --from=frontend /app/dist/ ./static/
RUN mkdir -p data
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
