
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
