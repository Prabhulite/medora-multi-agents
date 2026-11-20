FROM node:22-alpine AS build
ARG PORTAL=admin
ARG VITE_ADMIN_PORTAL_URL
ARG VITE_DOCTOR_PORTAL_URL
ENV VITE_ADMIN_PORTAL_URL=$VITE_ADMIN_PORTAL_URL
ENV VITE_DOCTOR_PORTAL_URL=$VITE_DOCTOR_PORTAL_URL
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
COPY admin-frontend/ /app/admin-frontend/
COPY doctor-frontend/ /app/doctor-frontend/
RUN npm run build:$PORTAL

FROM nginx:1.27-alpine
ARG PORTAL=admin
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/${PORTAL}-frontend/dist /usr/share/nginx/html
EXPOSE 80
