import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SECRET_KEY = 'your-secret-key'  # Replace with a random secret key

DEBUG = True

ALLOWED_HOSTS = ['*']

INSTALLED_APPS = [
    'vulnerable_app',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

MIDDLEWARE = [
    'django.middleware.common.CommonMiddleware',
]

ROOT_URLCONF = 'django_sqli.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': ['vulnerable_app/templates'],
        'APP_DIRS': True,
    },
]

WSGI_APPLICATION = 'django_sqli.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': 'db.sqlite3',
    }
}

STATIC_URL = '/static/'
