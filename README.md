# DeepSleep
We've created DeepSleep, the web application was designed with the intent of helping users optimize their sleep. The user can either register for additional feauters or use it freely. The main idea is that when the user inserts the chosen bedtime (bedtime mode) or the chosen wake up time (alarm mode), the site can suggest you the best time to wake up or the best one to go to sleep! If you decide to register you can also access to the part of the Sleep Log where you can see, each day, how much you've slept. We also offer some tips and tricks to help you sleep better and wake up more refreshed.


## Requirements for the installation:
install Node.js, navigate to the project folder (after having it cloned from GitHub) and use the command npm install to install the required libraries. If any package is missing, you can installing manually like this -> npm install package-missing

The server runs on MongoDb, please install it and before using our web application activate it.
If you have already installed Node.js you can use this command to install it -> npm install express mongoose

1. On Windows-> After having it installed, click windows+r on your keybord, search for services.msc, search for MongoDb and activate it.
2. On Mac-> you can use brew to install it (make sure to have Homebrew installed). to then activate it, you can use this command on the command line: brew start services mongodb
3. On Linux-> install MongoDb, if you've installed it via packet manager and uses systemd you can run this command on the command line: sudo systemctl start mongod


## To run the application
1. open a first terminal on the folder of the project
2. to start the server -> npm start
3. open a second terminal and navigate to the client folder. On the project folder use: cd client
4. when inside the client folder, to start the client -> npm start
5. to access client http://localhost:3000   
