
#  Django Cheat Sheet পুঁথি 


প্রতিটি framework এর কিছু default step থাকে, যা ব্যবহার করে frame-work তার structure তৈরি করা হয়। এর এই structure এর ভিতর সব operation implement করা হয়। 

django এর 2 version এর official doc এর link এইখানে  [the official documentation](https://docs.djangoproject.com/en/2.0/) । আমরা django2.XX version এর কিছু shortcut এইখানে দেখব। 

##  Sections 
- [pipenv তৈরি](#initializing-pipenv-optional) (optional)
- [django তে project তৈরি](#creating-a-project)
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
  
   `$ mkdir <folderName>`  
   এখন ঐ folder এ প্রবেশ করি  
   `$ cd <folderName>`
- এখন pipenv কে Initialize করব 
  
   `$ pipenv install`

- এখন pipenv shell এ প্রবেশ করব  
  
  `$ pipenv shell`

- এখন django install করব  
  
  `$ pipenv install django`
  
  (django এর latest stable version install হইবে)

- অন্যান্য package গুলোও একই ভাবে install করতে পারি 
  
  `$ pipenv install <package_name>`


