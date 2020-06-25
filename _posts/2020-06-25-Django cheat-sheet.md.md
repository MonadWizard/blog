
#  Django Cheat Sheet পুঁথি 


প্রতিটি framework এর কিছু default step থাকে, যা ব্যবহার করে frame-work তার structure তৈরি করা হয়। এর এই structure এর ভিতর সব operation implement করা হয়। 

django এর 2 version এর official doc এর link এইখানে  [the official documentation](https://docs.djangoproject.com/en/2.0/) । আমরা django2.XX version এর কিছু shortcut এইখানে দেখব। 

##  Sections 
-  [pipenv তৈরি](#initializing-pipenv-optional) (optional)
-  [django তে project তৈরি](#creating-a-project)
-  [django তে app তৈরি](#creating-an-app)
-  [django তে view.py এর ব্যবহার](#creating-a-view)
-  [django তে template এর ব্যবহার](#creating-a-template)
-  [django তে  model.py এর ব্যবহার](#creating-a-model)
-  [django তে  model.py এ objects এবং queries তৈরি](#creating-model-objects-and-queries)
-  [django তে Admin.py এর ব্যবহার](#using-the-admin-page)




## Initializing pipenv (optional)

আমরা conda বা venv বা pipenv যে কোন উপায় এ django এর virtual environment বানাইতে পারি। 

অমি traditional পুরনো কিন্তু এখনও বহুল প্রচলিত pipenv বানানো দেখাইতেছি । আমরা পুরো কাজটা sell ব্যবহার করে করব। 

- প্রথমে একটা folder বানায়ে ফেলি shell ব্যবহার করে
  
   `$ mkdir <folder_Name>`  
   এখন ঐ folder এ প্রবেশ করি  
   `$ cd <folder_Name>`
- এখন pipenv কে Initialize করব 
  
   `$ pipenv install`

- এখন pipenv shell এ প্রবেশ করব  
  
  `$ pipenv shell`

- এখন django install করব  
  
  `$ pipenv install django`
  
  (django এর latest stable version install হইবে)

- অন্যান্য package গুলোও একই ভাবে install করতে পারি 
  
  `$ pipenv install <packageName>`





## Creating a project
- shell ব্যবহার করে আমরা যে folder এ django project বানাইতে চাই ঐ folder এ যাব 
  
  `$ cd <folder_name>`
  
- এখন project তৈরি করব  
  
  `$ django-admin startproject <project_name>`

project তৈরি এর পর কিছু sub-directory পাব :


```
>project/
    manage.py
    >project/
        __init__.py
        settings.py
        urls.py
        wsgi.py

```

- আমরা development server run করতে  
  
  `$ python manage.py runserver`  
  
  shell এ লিখব ।  shell টা অবশ্যয় manage.py ফাইল এর directory তে থাকতে হবে এবং তৈরি django installed environment এ থাকতে হবে। 
  
- যদি  `SECRET_KEY` ব্যবহার করতে চাই , যা Django project কে আরও secure করবে তা হইলে,
  
- project এর  `settings.py` এর মধ্যে `SECRET_KEY` line টা change করতে হবে:
  
```python

SECRET_KEY = os.environ.get('SECRET_KEY')

```

- আমরা python এর secrets লাইব্রেরি ব্যবহার করে খুব সহজে SECRET_KEY generate করতে পারি :

```python

>>> import secrets
>>> secrets.token_hex()

```

- shell ব্যবহার করে environment variable এ SECRET_KEY set করা যায় ।  
  
  `export SECRET_KEY=<secret_key>`





##  Creating an app

- 1st project folder এ যাব shell ব্যবহার করে 
  
    `$ cd <outer_project_folder>`

- এখন shell এ এই command ব্যবহার করে new app create করব 
  
    `$ python manage.py startapp <app_name>`

- new created app এর directory `app`  folder এ গিয়ে new এর একটা py ফাইল create করব  `urls.py`

এখন project directory দেখতে এই রকম হবে :

```

>project/
    manage.py
    db.sqlite3
    >project/
        __init__.py
        settings.py
        urls.py
        wsgi.py
    >app/
        >migrations/
            __init__.py
        __init__.py
        admin.py
        apps.py
        models.py
        tests.py
        urls.py
        views.py


```



- new created app  টা project এ add করতে `settings.py` এর  `INSTALLED_APPS` list এ গিয়ে app টার নাম add করতে হবে :


```python

INSTALLED_APPS = [
	# ...
    'app',
	
]

```

- পরিবর্তনটি migrate করতে activated pipenv এর shell এ লিখব:
  
```bash

$ python manage.py migrate

```

##  Creating a view


- new created app এর app directory এর `views.py` file a নিচের line গুলো এর দ্বারা একটা basic view পাইতে পারি :


```python

from django.http import HttpResponse

def index(request):
    return HttpResponse("Hello, World!")

```

- app directory এর `urls.py` এ নিচের line গুলো এর দ্বারা একটা basic view এর url পাইতে পারি 

```python

from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
]

```


- এখন project এর `urls.py` এ app এর urls.py define করলেই আমাদের view complete. 

```python

from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('app/', include('app.urls')),
    path('admin/', admin.site.urls),
]

```

- Remember: আমরা এইখানে ২টা `urls.py` ফাইল নিয়ে কাজ করছি  

- app এর  `urls.py` file এ views.py এর method define করছি আর project এর  `urls.py` এ app এর urls.py file টা define করছি। 




##  Creating a template

- app directory তে নিচের structure এ HTML , CSS, JS বা Front-end file গুলো থাকে। media file এর বাপার টা একটু আলাদা। আমরা পরে media file নিয়ে আলোচনা করব। 

```

>app/
   >templates/
      index.html
   >static/
      style.css
      script.js

```

- template view file এ ব্যবহার করা হয়,  `views.py` file এ নিচের line গুলো add করে আমরা django project এ একটা customized html ফাইল view এবং execute করতে পারি  :

```python

from django.shortcuts import render

def index(request):
    return render(request,'index.html')

```

- আমরা যে কোন context বা variable কে html এ add korte পারি বা এক কথায় templating করতে পারি।:

```python

def index(request):
	context = {"context_variable": context_variable}
    return render(request,'index.html', context)

```

- HTML এ static file নিয়ে কাজ করার জন্য নিচের code Demo হিসেবে follow করতে পারি। 

```html

{% load static %}

<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		
		<link rel="stylesheet" href="{% static 'styles.css' %}">
	</head>
</html>

```

- make sure `settings.py` file এ নিচের script add করা হয়েছে। :

```python

STATIC_URL = '/static/'
STATICFILES_DIRS = [
	os.path.join(BASE_DIR, "static")
]

```

- base HTML structure আমরা অন্য HTML file এ তৈরি করে তা যে কোন HTML file এ main structure হিসেবে ব্যবহার করতে `extends` ব্যবহার করা হয়। Demo হিসেবে নিচের code follow করতে পারি। :

```html

{% extends 'base.html'%}

{% block content %}

Hello, World!

{% endblock %}

```

- এখন `base.html` এ block content টা specific part এ add করতে হবে :

```html

<body>
	{% block content %}{% endblock %}
</body>

```


