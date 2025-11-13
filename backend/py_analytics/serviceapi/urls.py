from django.urls import path
from .views import ab_significance
urlpatterns=[path('ab/significance',ab_significance)]
