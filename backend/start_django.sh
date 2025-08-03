
#!/bin/bash
set -e

echo "Starting Django backend server..."

# Change to backend directory
cd "$(dirname "$0")"

# Run migrations
echo "Running database migrations..."
python manage.py migrate

# Create superuser if it doesn't exist (optional)
echo "Checking for superuser..."
python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(is_superuser=True).exists():
    print('Creating superuser...')
    User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
    print('Superuser created successfully')
else:
    print('Superuser already exists')
"

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Start the Django development server
echo "Starting Django server on port 8000..."
python manage.py runserver 0.0.0.0:8000
