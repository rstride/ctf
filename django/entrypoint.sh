#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# Apply database migrations
echo "Applying database migrations..."
python manage.py migrate

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Function to create admin user if it doesn't exist
create_admin_user() {
    echo "Checking if admin user exists..."
    ADMIN_EXISTS=$(python manage.py shell -c "from django.contrib.auth.models import User; print(User.objects.filter(username='$DJANGO_ADMIN_USERNAME').exists())")

    if [ "$ADMIN_EXISTS" = "False" ]; then
        echo "Creating admin user..."
        # Insert admin user with plaintext password using raw SQL
        python manage.py shell -c "
from django.db import connection
with connection.cursor() as cursor:
    cursor.execute(\"\"\"
        INSERT INTO auth_user (username, password, is_superuser, is_staff, is_active, date_joined, first_name, last_name, email)
        VALUES ('$DJANGO_ADMIN_USERNAME', '$DJANGO_ADMIN_PASSWORD', 1, 1, 1, '2024-01-01 00:00:00', '', '', '');
    \"\"\")
"
        echo "Admin user created successfully."
    else
        echo "Admin user already exists. Skipping creation."
    fi
}

# Call the function to create admin user
create_admin_user

# Start the Django development server
echo "Starting Django server..."
exec "$@"
