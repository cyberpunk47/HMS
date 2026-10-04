# Two-stage build: compile the React app, then serve the static files with nginx.
# The browser calls /api/... (VITE_APP_URL=/api), and the Kubernetes Ingress sends
# /api/* to the gateway — exactly the same arrangement the Vercel rewrite had.
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Relative base URL: the frontend and the API answer on the same public hostname,
# so there is no CORS and no hard-coded IP to update when the cluster changes.
ENV VITE_APP_URL=/api
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
