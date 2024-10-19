FROM nginx:1.21.3

# Remove default site if it exists
RUN [ -f /etc/nginx/sites-enabled/default ] && rm /etc/nginx/sites-enabled/default || echo "Default site already removed."

# Copy your custom nginx configuration file
COPY nginx.conf /etc/nginx/nginx.conf

