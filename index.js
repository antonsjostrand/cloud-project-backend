const mysql = require('mysql');
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const app = express();

const middleware = require("./middleware/ensureToken.js");
const database = require("./database/index.js");

const secretKey = process.env.SECRET_KEY || 'secretKey';

app.use(bodyParser.json());

//Used to log requests.
app.use((req, res, next) => {
    console.info(`Got request on ${req.path} (${req.method}).`);
    next();
});

const port = process.env.PORT || 8082;
app.listen(port, () => {
    console.log('REST API listening on port', port);
})

/**
 * REST API ENDPOINTS
 * Below are all endpoints available in this rest api
 * 
 * 
 */

/**
 * Test endpoint to see if you can contact the REST API.
 * 
 */
app.get('/', async(req, res) => {
    res.json({status: ' API is ready to be used'});
});

/**
 * Test endpoint used for testing the token.
 * 
 */
app.get('/test', middleware.ensureToken, async(req, res) => {
    //Verify the token
    jwt.verify(req.token, secretKey, (err, authData) => {
        if(err) {
            //Token error
            res.sendStatus(403);
        } else {
            //Token verified proceed to insert new workout!
            res.json({authData: authData});
        }
    });
})

/**
 * Register endpoint, needs the following data in json format:
 * @json 	"ssn": "9191911111",
 * @json	"username": "test",
 * @json	"password": "test",
 * @json	"email": "email@gmail.com",
 * @json	"privilege": 0
 * 
 */
app.post('/register', async(req, res) => {
    //Get entered values from request body:
    //ssn, username, password, email, privilege
    let newUser = req.body;

    //Check so that username is unique
    let uniqueUsername = await database.isUsernameUnique(newUser.username);

    if(uniqueUsername == 'failure'){
        res.sendStatus(400)
    }else{
        let status = await database.registerUser(newUser);
        if(status === 'success'){
            console.log('User created!')
            res.json({status: status, message: 'user created'});
        }else{
            res.sendStatus(400);
        }
    }


});

/**
 * Login endpoint, needs the following data in json format:
 * @json    "username": "username",
 * @json    "password": "password"
 */
app.post('/login', async(req, res) => {
    //Get user credentials from request body. username and password.
    let user = req.body;

    //Authenticate user credentials towards database
    let result = await database.login(user);
    if(result !== 'failure'){
        console.log('User exists!');
        console.log(result);

        //Get the token!
        jwt.sign({user: user}, secretKey,  {expiresIn: '10h'}, (err, token) => {
            res.json({
                token: token,
                privilege: result.privilege
            })
        });

    }else{
        console.log('User did not exist!');
        res.sendStatus(403);
    }


});

/**
 * Logout endpoint, should clear the token when implemented.
 * 
 */
app.post('/logout', async(req, res) =>{

});

/**
 * Configuration endpoints
 * These endpoints are used to alter settings of the users.
 */

 /**
  * Change password, needs the following data in json format:
  * @json   "oldPassword": "oldpassword",
  * @json   "newPassword": "newPassword"
  * 
  * Will return a new token that needs to be used for future requests.
  */
app.post('/password', middleware.ensureToken, async(req, res) => {

    var authenticationData;

    //Verify the token
    jwt.verify(req.token, secretKey, (err, authData) => {
        if(err) {
            //Token error
            res.sendStatus(403);
        } else {
            //Token verified proceed to change password!
            authenticationData = authData;
        }
    });

    console.log("Authentication data: ");
    console.log(authenticationData);

    let data = {};
    data.data = req.body;
    data.authData = authenticationData;

    //Authenticate user credentials towards database
    let result = await database.changePassword(data);
    if(result === 'success'){
        console.log('Password changed..');

        //Create new token with the new password
        let user = {};
        user.username = data.authData.user.username;
        user.password = data.data.newPassword;

        jwt.sign({user: user}, secretKey,  {expiresIn: '10h'}, (err, token) => {
            res.json({
                message: 'New token due to password change',
                token: token
            })
        });

    }else{
        console.log('Password change failed..');
        res.sendStatus(403);
    }

});

/**
 * Change email, needs the following data in json format
 * @json    "newEmail": "newemail",
 * @json    "oldEmail": "oldemail"
 */
app.post('/email', middleware.ensureToken, async(req, res) => {

    var authenticationData;

    //Verify the token
    jwt.verify(req.token, secretKey, (err, authData) => {
        if(err) {
            //Token error
            res.sendStatus(403);
        } else {
            //Token verified proceed to change password!
            authenticationData = authData;
        }
    });

    console.log("Authentication data: ");
    console.log(authenticationData);

    let data = {};
    data.data = req.body;
    data.authData = authenticationData;

    //Authenticate user credentials towards database
    let result = await database.changeEmail(data);
    if(result === 'success'){
        console.log('Email changed..');

        res.json({
            message: 'Changed email..',
            newEmail: data.data.newEmail
        });

    }else{
        console.log('Email change failed..');
        res.sendStatus(403);
    }

});

/**
 * Admin endpoints
 * Endpoints involving deleting users and changing user data etc.
 * 
 */

/**
 * Endpoint used to fetch all users in the database
 * 
 */
app.get('/user', middleware.ensureToken, async(req, res) => {
    var authenticationData;

    //Verify the token
    jwt.verify(req.token, secretKey, (err, authData) => {
        if(err) {
            //Token error
            res.sendStatus(403);
        } else {
            //Token verified proceed to change password!
            authenticationData = authData;
        }
    });

    //Verify that the user is indeed an admin.
    let result = await database.isAdmin(authenticationData.user);

    if(result === 'success'){
        let users = await database.fetchAllUsers();
        res.json({
            message: 'Fetched users',
            users: users
        });
    }else{
        res.sendStatus(403);
    }
})

/**
 * Endpoint used to delete a specific user.
 * Will also delete all workouts connected to the user.
 * Needs the user id in json format:
 * @json    "userId": 1
 */
app.delete('/user', middleware.ensureToken, async(req, res) => {
    var authenticationData;

    //Verify the token
    jwt.verify(req.token, secretKey, (err, authData) => {
        if(err) {
            //Token error
            res.sendStatus(403);
        } else {
            //Token verified proceed to change password!
            authenticationData = authData;
        }
    });

    //Verify that the user is indeed an admin.
    let result = await database.isAdmin(authenticationData.user);

    if(result === 'success'){
        let result = await database.deleteUser(req.body.userId);
        if(result === 'success'){
            res.json({
                message: 'User deleted',
                userId: req.body.userId
            });
        }else{
            res.sendStatus(405);
        }
    }else{
        res.sendStatus(403);
    }

})

/**
 * Endpoint used by admins to change the password for a user
 * Needs the following data in json format:
 * Needs the following data in json format:
 * @json "userId": 1
 * @json "newPassword": "newpassword"
 */
app.post('/admin/password', middleware.ensureToken, async(req, res) => {
    var authenticationData = '';
    var sameUser = false;

    //Verify the token
    jwt.verify(req.token, secretKey, (err, authData) => {
        if(err) {
            //Token error
            res.sendStatus(403);
        } else {
            //Token verified proceed to change password!
            authenticationData = authData;
        }
    });

    //Verify that the user is indeed an admin.
    let result = await database.isAdmin(authenticationData.user);

    let user = await database.fetchUser(authenticationData.user);

    //If the admin changes his own password we need a new token.
    if(user.userId == req.body.userId){
        console.log('Admin changing its own password..');
        sameUser = true;
    }

    //Change the password
    if(result === 'success'){
        let result = await database.adminChangePassword(req.body.userId, req.body.newPassword);
        if(result === 'success'){
            if(sameUser){

                //Create new token with the new password
                let user = {};
                user.username = authenticationData.user.username;
                user.password = req.body.newPassword;

                jwt.sign({user: user}, secretKey,  {expiresIn: '10h'}, (err, token) => {
                    res.json({
                        message: 'New token due to admin changing his own password',
                        token: token
                    })
                });
            }else{
                res.json({
                    message: 'User password changed',
                    userId: req.body.userId
                });
            }
            
        }else{
            res.sendStatus(405);
        }
    }else{
        res.sendStatus(403);
    }

})


 /**
  * Endpoint used by admins to change the email of a user
  * Needs the following data in json format:
  * @json "userId": 1
  * @json "newEmail": "newemail"
  */
 app.post('/admin/email', middleware.ensureToken, async(req, res) => {
    var authenticationData;

    //Verify the token
    jwt.verify(req.token, secretKey, (err, authData) => {
        if(err) {
            //Token error
            res.sendStatus(403);
        } else {
            //Token verified proceed to change password!
            authenticationData = authData;
        }
    });

    //Verify that the user is indeed an admin.
    let result = await database.isAdmin(authenticationData.user);

    if(result === 'success'){
        let result = await database.adminChangeEmail(req.body.userId, req.body.newEmail);
        if(result === 'success'){
            res.json({
                message: 'User email changed',
                userId: req.body.userId
            });
        }else{
            res.sendStatus(405);
        }
    }else{
        res.sendStatus(403);
    }
    

})

/**
 * Endpoint used by admins to change the privilege of a user.
 * Needs the following data in json format:
 * @json "userId": 1
 * @json "privilege": 1
 * 
 */
app.post('/admin/privilege', middleware.ensureToken, async(req, res) => {
    var authenticationData;

    //Verify the token
    jwt.verify(req.token, secretKey, (err, authData) => {
        if(err) {
            //Token error
            res.sendStatus(403);
        } else {
            //Token verified proceed to change password!
            authenticationData = authData;
        }
    });

    //Verify that the user is indeed an admin.
    let result = await database.isAdmin(authenticationData.user);

    if(result === 'success'){
        let result = await database.adminChangePrivilege(req.body.userId, req.body.newPrivilege);
        if(result === 'success'){
            res.json({
                message: 'User privilege changed',
                userId: req.body.userId
            });
        }else{
            res.sendStatus(405);
        }
    }else{
        res.sendStatus(403);
    }

})

 /**
  * Workout endpoints
  * 
  */

/**
 * Save new workout, needs the following data in json format:
 * @json 	"distance": 12.5,
 * @json	"steps": 5045,
 * @json	"time": "30:24",
 * @json	"userId": 0
 */
app.post('/workout', middleware.ensureToken, async(req, res) => {

    var authenticationData;

    //Verify the token
    jwt.verify(req.token, secretKey, (err, authData) => {
        if(err) {
            //Token error
            res.sendStatus(403);
        } else {
            //Token verified proceed to insert new workout!
            authenticationData = authData;
        }
    });

    //body has to contain: userId, distance, steps, time
    let workout = req.body;

    let status = await database.saveNewWorkout(workout, authenticationData);

    if(status === 'success'){
        console.log('User created!')
        res.json({status: status, message: 'workout saved', authData: authenticationData});
    }else{
        res.sendStatus(400);
    }
    
});

/**
 * Get all workouts.
 * Only needs the token in the authorization header.
 */
app.get('/workout', middleware.ensureToken, async(req, res) => {
    console.log('Fetching all workouts..');
    var authenticationData;

    //Verify the token
    console.log('Verifying token..');
    jwt.verify(req.token, secretKey, (err, authData) => {
        if(err) {
            //Token error
            res.sendStatus(403);
        } else {
            //Token verified proceed to insert new workout!
            authenticationData = authData;
        }
    });

    //Fetch all workouts!
    let result = await database.fetchAllWorkouts(authenticationData);
    console.log('Fetched workouts: ' + result);

    res.json({message: 'Fetched workouts',
            workouts: result});
});

//Get specific workout
app.get('/workout/:id', middleware.ensureToken, async(req, res) => {
    var authenticationData;

    //Verify the token
    jwt.verify(req.token, secretKey, (err, authData) => {
        if(err) {
            //Token error
            res.sendStatus(403);
        } else {
            //Token verified proceed to insert new workout!
            authenticationData = authData;
        }
    });

    const id = parseInt(req.params.id);

    //Fetch the specific workout by id.
    let workout = await database.fetchOneWorkout(id);

    res.json({message: 'Fetched workout',
    workout: workout});
});

