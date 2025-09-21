FROM nginx:alpine

# Replace default server config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy static site assets
COPY ./ /usr/share/nginx/html/

