const mysql = require('mysql');
/*
* Database functions representing the endpoints
* These are used by the endpoints and are therefore exported.
*/

//Create the dbpool
let cachedDbPool;
function getDbPool(){
    if(!cachedDbPool){
        cachedDbPool = mysql.createPool({
            connectionLimit: 1,
            user: process.env.SQL_USER,
            password: process.env.SQL_PASSWORD,
            database: process.env.SQL_NAME,
            socketPath: `/cloudsql/${process.env.INST_CON_NAME}`
        });
    }
    return cachedDbPool;
}

/*
* User methods
*/

function fetchUserId(){

}

//Register new user
async function registerUser(newUser){
    console.log('Insert: ' + newUser);
    const insertResult = await dbInsertUser(newUser);
    console.log('Insert result: ' + insertResult);

    if(insertResult != undefined){
        return 'success';
    }else{
        return 'failure';
    }
}

//Login method used to validate credentials of the user
async function login(userCredentials){
    console.log(userCredentials);
    const result = await dbFetchUser(userCredentials);
    console.log('Result: ' + result);

    if(result.username === userCredentials.username){
        return result;
    }else {
        return 'failure';
    }
}

/**
 * Configuration methods
 * 
 */
async function changePassword(data){
    console.log(data);

    //Use the auth data to make sure that the old password entered match the actual old password
    let oldPassword = data.authData.user.password;
    let enteredOldPassword = data.data.oldPassword;

    console.log("Actual old password: " + oldPassword);
    console.log("Entered old password: " + enteredOldPassword);

    if(oldPassword === enteredOldPassword){
        console.log('Check completed, changing password..');
        let result = await dbChangePassword(data.data.newPassword, data.authData.user.username);
        console.log(result);

        if(result != '0'){
            return 'success';
        }

    }else{
        console.log('Check failed, not changing password..');
        return 'failure';
    }

    return 'failure';

}

async function changeEmail(data){
    console.log(data);

    //Use the auth data to make sure that the old email is the same as the one entered
    let oldEmail = data.data.oldEmail;
    let user = await dbFetchUser(data.authData.user);

    if(oldEmail === user.email){
        console.log('Check completed, changing email..');
        let result = await dbChangeEmail(data.data.newEmail, data.authData.user.username);
        console.log(result);

        if(result != '0'){
            return 'success';
        }

    }else{
        console.log('Check failed, not changing email..');
        return 'failure';
    }

    return 'failure';

}

/**
 * Workout methods
 * 
 */

function fetchWorkoutId(){

}

//Save new workout
async function saveNewWorkout(workout, authData){
    console.log('Attempting to save new workout: ' + workout);
    console.log('Using authData: ' + authData);
    
    let userCredentials = {
        password: authData.user.password,
        username: authData.user.username
    }

    console.log(userCredentials);

    //Fetching user to get id for foreign key in workout.
    console.log('Fetching user..');
    let user = await dbFetchUser(userCredentials);

    if(user == undefined){
        return 'failure';   
    }

    //Update workout object.
    console.log('updating workout foreign key..');
    workout.userId = user.userId;

    //Save workout
    let result = await dbInsertWorkout(workout);

    console.log('Result from insert workout..');
    console.log(result);
    
    if(result != undefined){
        return 'success';
    }else{
        return 'failure';
    }
}

//Fetch one workout
async function fetchOneWorkout(id){
    console.log('Fetching workout with id: ' + id);

    //Fetching workout
    let workout = await dbFetchWorkout(id);
    console.log('fetched workout: ' + workout);

    return workout;
}

//Fetch all workouts
async function fetchAllWorkouts(authData){
    console.log('Database - Fetching all workouts!');

    let userCredentials = {
        password: authData.user.password,
        username: authData.user.username
    }

    //Fetching user to get id for foreign key in workout.
    console.log('Database - Fetching user..');
    let user = await dbFetchUser(userCredentials);

    //Fetch all workouts for a certain userId
    console.log('Database - Fetching all workouts..')
    let workouts = await dbFetchAllWorkouts(user.userId);
    console.log('Database - Fetched workouts: ' + workouts);

    return workouts;

}

/**
 * Database functions not exported! 
 * 
 */

function dbFetchUser(userCredentials){
    return new Promise(function(resolve, reject) {
        const sql = 'SELECT * FROM users WHERE password=? AND username=?';

        getDbPool().query(sql, [userCredentials.password, userCredentials.username], (err, results) => {
            resolve(results[0]);
        });
    });
}

function dbInsertUser(newUser){
    return new Promise(function(resolve, reject) {
        const sql = 'INSERT INTO users SET ?';
        getDbPool().query(sql, newUser, (err, results) => {
            resolve(results.insertId);
        })
    })
}

function dbChangePassword(newPassword, username){
    return new Promise(function(resolve, reject) {
        const sql = 'UPDATE users SET password = ? WHERE username = ?';
        getDbPool().query(sql, [newPassword, username], (err, results) => {
            resolve(results.affectedRows);
        })
    })
}

function dbChangeEmail(newEmail, username){
    return new Promise(function(resolve, reject) {
        const sql = 'UPDATE users SET email = ? WHERE username = ?';
        getDbPool().query(sql, [newEmail, username], (err, results) => {
            resolve(results.affectedRows);
        })
    })
}


function dbInsertWorkout(workout){
    return new Promise(function(resolve, reject) {
        const sql = 'INSERT INTO workouts SET ?';
        getDbPool().query(sql, workout, (err, results) => {
            resolve(results.insertId);
        })
    })
}

function dbFetchWorkout(id){
    return new Promise(function(resolve, reject) {
        const sql = 'SELECT * FROM workouts WHERE workoutId=?';
        getDbPool().query(sql, id, (err, results) => {
            resolve(results);
        })
    })
}

function dbFetchAllWorkouts(userId){
    return new Promise(function(resolve, reject) {
        const sql = 'SELECT * FROM workouts WHERE userId=?';
        getDbPool().query(sql, userId, (err, results) => {
            resolve(results);
        })
    })
}

module.exports = {
    fetchUserId: fetchUserId,
    registerUser: registerUser,
    login: login,
    changePassword: changePassword,
    changeEmail: changeEmail,
    fetchWorkoutId: fetchWorkoutId,
    saveNewWorkout: saveNewWorkout,
    fetchOneWorkout: fetchOneWorkout,
    fetchAllWorkouts: fetchAllWorkouts
};