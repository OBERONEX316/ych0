import os
BASE_DIR=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SECRET_KEY='devkey'
DEBUG=True
ALLOWED_HOSTS=['*']
INSTALLED_APPS=['django.contrib.contenttypes','django.contrib.auth','rest_framework','serviceapi']
MIDDLEWARE=[]
ROOT_URLCONF='service.urls'
TEMPLATES=[]
WSGI_APPLICATION='service.wsgi.application'
DATABASES={'default':{'ENGINE':'django.db.backends.sqlite3','NAME':os.path.join(BASE_DIR,'db.sqlite3')}}
REST_FRAMEWORK={'DEFAULT_RENDERER_CLASSES':['rest_framework.renderers.JSONRenderer']}
