FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_GATE_URL=""
ARG VITE_CLIENT_ID="nexo"
ARG VITE_REDIRECT_URI=""
ENV VITE_GATE_URL=$VITE_GATE_URL
ENV VITE_CLIENT_ID=$VITE_CLIENT_ID
ENV VITE_REDIRECT_URI=$VITE_REDIRECT_URI
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
