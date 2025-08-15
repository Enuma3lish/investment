# investment-chatbot/Dockerfile
### build stage ###
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Use the exact build script from package.json with production config
RUN npm run build -- --configuration=production

### runtime stage ###
FROM nginx:alpine

# Remove default nginx files first
RUN rm -rf /usr/share/nginx/html/*

# Copy the built files from the browser subdirectory (Angular v20+ structure)
COPY --from=builder /app/dist/investment-chatbot/browser /usr/share/nginx/html

EXPOSE 80
CMD ["nginx","-g","daemon off;"]
