### এই পোস্ট এ আমাদের যাত্রা **গিট** এবং **গিটহাব** নিয়া।  

 আমি মনে করি গিট এর basic আপনারা সবাই জানেন।

sortly বলা যায় git ২ ধরনের repository ব্যবহার করে। local এবং global
![image](https://drive.google.com/uc?export=view&id=1Tw57LPzPZX9RvUnFeWA_JkNYDIGFWvR1)

![image](https://drive.google.com/uc?export=view&id=1FJeX1lzMGNzjmjDCB2eg69K3dim_65jR)


সুতরাং, এই পোস্ট এ আমরা কেবল সমস্ত কমান্ড দেখব, যা গিটহাবের সঙ্গে গিট এর কাজ করতে ব্যবহৃত হয়।


<p style='color:green'>এই পোস্ট এ আমরা Git Bash ব্যবহার করব। </p>


প্রথমতও আমাদের একটা directory প্রয়োজন যেখানে আমরা আমাদের file create করব এবং প্রয়োজনে github a repository বানায়ে upload দেব।

আমরা git bash open করি than ,
shell code <font color="green"> mkdir </font> এর পর পছন্দ মত directory এর নাম দিয়া folder তৈরী করি ।
                   mkdir FolderName

shell code <font color="green"> cd </font> এর পর তৈরীকৃত folder এর নাম দিয়া directory টি তে প্রবেশ করি।
                   cd FolderName

তৈরীকৃত folder টি কে git repository বানাইতে <font color="green"> git init </font> দ্বারা গিট initial করি। এর ফলে উক্ত directory টি তে .git নামক একটি folder তৈরী হবে, এই .git ফোল্ডারটি সমস্ত গিট data control করবে।
                    git init

গিট এর সব commit এর identity এর জন্য একটি user-name প্রয়োজন হয়। সকল git এর জন্য একটি নির্দিষ্ট global-user-name দাওয়া যাইতে পারে। global-user-name শুধু একবার তৈরি করতে হয়।
	        git config –global user.name “Name”


আমরা global-user-name এর সঙ্গে একটা global-e@mail save করতে পারি। 
	        git config –global user.email “Mail@Name”


আমরা বিশেষ git-repository এর জন্য আলাদা user-name দিতে পারি,যাকে local-user-name বলা যায়। local-user-name কেবল তৈরীকৃত repository তে ব্যবহৃত হয়।
            git config user.name “name”
আমরা local-user-name এ ও একটা local-e@mail save করতে পারি।
	        git config user.email “email@name”


কোন git-repository এর user-name সমূহ দেখতে উক্ত repository তে গিয়া <font color="green"> git config --list </font> লিখতে হয়। 
	        git config --list
<font color="green"> git config --list </font> এ user.name=Name এবং user.email=Mail দেখতে পাওয়া যায়। 

shell code <font color="green"> touch </font> এর পর fileNameWithExtention দিয়া git bash এর দ্বারা নতুন file তৈরী করা যায়।
            touch fileNameWithExtention

git command <font color="green"> git status </font> এর দ্বারা আমরা rescan করে repository টির update দেখতে পাই। আমরা onstage and upstage file দেখতে command টি ব্যবহার করি।
	        git status 

আমরা UNTRACKED file এবং নতুন file, git command <font color="green"> filename </font> এর দ্বারা দেখতে পাই।
	        filename 

আমরা untracked file কে git command <font color="green">git add fullName </font> এর দ্বারা stage area তে নিতে পারি।
            git add fulfillName

আমাদের বার বার git directory টির অবস্থা <font color="green">git status</font> দ্বারা check করতে হইতে পারে। 
            git status

আমরা directory এর সব file এক সঙ্গে stage-area তে নিতে পারি git command <font color="green"> git add . </font> দ্বারা   
            git add --all 
অথবা	
            git add . 

stage-area তে file আনার পর তা local-repository তে push করতে হয়। যার ফলে আমাদের file এর সকল update আলাদা আলাদা version এ রাখা যায়, এবং version control করা যায়।  
	        git commit
এখন একটা নতুন bash দেখা যাবে, যেখানে update version টার একটা কমেন্ট লিখতে press <font color="green">I</font> তারপর comment লিখে press <font color="green">Esc</font> এখন press <font color="green">:x</font> সর্ব শেষ এ press press <font color="green">Enter</font> button.
            Press button :  I
            Then:           type something 
            Press button :  Esc   
            press buttons:  :x
            last button  :  enter


অথবা 
আমরা একটা single line এ ও commit করতে পারি। 
	        git commit -m “type message”

আমরা সকল commit file দেখতে পারি <font color="green">git log</font> দ্বারা 
	        git log 
অথবা আমরা shortly commit file টি দেখতে পারি।
	        git log --online 

> যদি পূর্বে commit হয়েছে এমন file এ নতুন কোনো পরিবর্তণ করি তা হইলে আমাদের আবার ->onstage -> তারপর commit করতে হবে। 

            git add .
            git commit -m "any message"



যদি আমরা update থেকে backdate file টিতে ফিরে যেতে চাই তবে আমাদের পূর্ববর্তী version এ ফিরে যেতে হবে, তারপরে আমাদের প্রথমে commit id এর মাধ্যমে আমাদের update টি দেখতে হবে।

            git log --online

তারপর আমাদের git log থেকে পূর্ববর্তী commit এর id use করতে হবে। যেমনঃ (id of commit= 658251)

            git checkout 658251

নতুন commit ব্যবহার করতে commit (ID) টি master branch এ নিতে হবে।
এখন আমরা আমাদের তৈরিকৃত সকল commit দেখতে পাবো master উল্লেখ এর মাধমে।

	        git checkout master 

আমরা যদি পূর্ববর্তী যেকোনো commit এর change প্রদত্ত text সহ দেখতে চাই তা হইলে git command <font color="green">git diff</font> প্রয়োজন
	      
            git diff

> নতুন commit পরিবর্তন করার আগেেই আমরা <font color="green">git diff</font> এর দ্বারা চেক করি।

আমরা commit ID ব্যবহার করে দুটি commit এর পার্থক্য দেখতে পারি। যেমনঃ (online ID = 1Fds546)
	       
            git show 03df531  1Fds546   

আমরা stage area এর পূর্বে difference দেখতে পারি।

            git diff

তবে আমরা যদি stage area তে difference দেখতে চাই তবে।

            git diff --staged

আমরা যদি কেবল folder থেকে কোন file delete করে ফেলি, তবে এই file টি স্থায়ীভাবে delete হয় না। এই ফাইলটি অন্যান্য commit এ থেকে যায় এবং ফিরে আনা যায় ।
যদি আমরা git থেকে delete করতে চাই , তা হইলে git bash এ command দিতে হবে 

            Git rm filename.extention

> এখন আমরা git এর local repository তে filename.extention দেখতে পাব না।


কিন্তু অন্য stage এ আমাদের delete করা file দেখতে পাবো। 
            
            git status

> আমাদের delete করা file git এ track করবে।

For remove permanently from stage, we need: -
git এর stage থেকে permanently file টি delete করে local repository থেকে এক বারে বাদ দিতে git command 

            git reset HEAD filename.extention

আমদের নতুন change টি commit করতে হবে।

            Git commit -m “delete filename permanently” 


#
 <font color="green"> Local Repository থেকে Remote Repository তে file  </font>
#

আমরা গিট এর একটা local version আমাদের  directory তে   .git file এ  locate করে  রেখেছি । এখন  শুধু  টা  global repository তে  upload দাওয়া  বাঁকি । 
global repository শুধু  ২ টা  operation ঘটায় ।  git push এবং  git fatch.

global repository তে  আমাদের  file upload করার জন্য  প্রথমে github.com এ  login করতে হবে। তারপর  github এ একটি  repository তৈরি  করতে হবে।  repository টির  ssh/https link টা  দ্বারা আমরা আমাদের local repository টা কে github এর তৈরি repository এর সঙ্ঘে connect করব। 

আমি ধরে নিতেছি  আপনাদের github এ loging করে repository তৈরি করা  হয়েছে। আপনারা github এ repository তৈরি করতে  readme.md file টাই  check-mark দিয়ে  দিতে পারেন আবার readme.md file বাদ এ ও  repository তৈরি  করতে পারেন।

এখন আমাদের local repository এর directory তে গিয়ে git bash টি open করব ।

আমরা সব সময় git status দিয়ে check করব , file এ কোন update হয়েছে কি না। যদি update হয় তা হলে file list এ তা দেখা যাবে। update ঘটলে <font color="green">-> git add . -> git commit -m "new comment"</font>  ,মানে new change টাকে stage area -> local repository তে আনতে হবে। 

এতক্ষণ সব পুরান প্যাঁচাল ছিল , এখন global repository তে file pass করি।

মনে করি আমাদের git bash এর path সঠিক , এখন git command <font color="green">git remote add origin [gitLink from HTTPS]</font>। আমরা git clone করতে যে link use করি,এই টা একই link.
github এ loging এর জন্য popup window আসলে login complete করতা হবে।

                  git remote add origin [gitLink from HTTPS]


এখন <font color="green">git remote -v</font> দিয়ে fatch এবং push নিশ্চিত  করতে হবে। 

                  git remote -v


সর্বশেষ  এ  brunch এ  upload  দিতে হবে। এখানে আমরা master বা root brunch এ upload দেব। তাই<font color="green">git push origin master</font> এ master উল্লেখ করব। ভিন্ন brunch এর জন্য সেই brunch এর নাম উল্লেখ করতাম। 

                  git push origin master



আমরা একটা সহজ sortcut দেখে নেয়। আমরা basic work এ  এই সব command use করছি। পর্যায়ক্রমে  একটা project যে সব command এর দ্বারা github এ upload দাওয়া যায় তা :
### cheet shit

+           ls

+           cd project_directory

+           git init 

+           git remote add origin [gitLink from HTTPS]

+           git remote -v

+           git add .

+           git commit -m "First commit"

+           git push origin master


যদি error এর জন্য git repository টা github এ upload দিতে না পারেন, তবে by force আপনে emergincy তে upload দিতে পারেন। :

                  git push origin master -f



আমাদের github এ  file upload দাওয়াতো  শেষ হল, এখন যদি github এ কোন update ঘটায় এবং তা যদি local repository তে  আনতে চাই , বা local repository তেও একই আপডেট ঘটাতে চাই তা হইলে আমাদের ৩টা command use করতে হবে। 

আমাদের git bash এর path টা local repository এর directory এর path দিব তারপর 

+           git pull origin master `

তারপর
+           git stash save "your comment"


সর্বশেষ এ shash থেকে মক্তি পাইতে git command এ দেব 

+           git stash drop

#
#
#
#
#

যদি প্রয়োজন হয় তা হলে আমরা আমাদের github এর পুর connection pc থেকে remove করে দিতে পারি। এর জন্য windows_search_bar এ গিয়ে credential লিখলে suggest এ <font color="green">Credential Manager</font> আসবে। 
Credential Manager এ গিয়ে <font color="green">windows Credentials</font> এ click করলে, নিচে অনেক path এর সঙ্ঘে  <font color="green">git:https://github.com</font> আসবে। 
right side এর dropdown option এ click করলে  <font color="green">Edit</font> এবং <font color="green">Remove</font> option পাওয়া যাবে । Remove এ click করে pc থেকে github এর connection পুরোপুরি remove করা যাবে।




আমরা git থেকে origin remove করতে পারি। 
          
          git remote rm origin 

এখন fatch এবং pull এর দ্বারা connection টা clear করলে আমরা আবার অন্য origin add করতে পারব ।

            git remote -v 






