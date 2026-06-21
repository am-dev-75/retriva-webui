FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Accept build arguments to embed in static assets
ARG VITE_RETRIVA_GATEWAY_BASE_URL
ENV VITE_RETRIVA_GATEWAY_BASE_URL=$VITE_RETRIVA_GATEWAY_BASE_URL

RUN npm run build

EXPOSE 5173

# Run the preview server on port 5173
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5173"]
