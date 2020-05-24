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

/*
* REST API
* ENDPOINTS
*/

app.get('/', async(req, res) => {
    res.json({status: ' API is ready to be used'});
});

//Used for testing
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

app.post('/register', async(req, res) => {
    //Get entered values from request body:
    //ssn, username, password, email, privilege
    let newUser = req.body;

    let status = await database.registerUser(newUser);
    if(status === 'success'){
        console.log('User created!')
        res.json({status: status, message: 'user created'});
    }else{
        res.sendStatus(400);
    }

});

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

app.post('/logout', async(req, res) =>{

});

/**
 * Configuration endpoints
 * 
 */

 //Change password
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
  * Workout endpoints
  * 
  */
//Save workout
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

//Get all workouts
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

