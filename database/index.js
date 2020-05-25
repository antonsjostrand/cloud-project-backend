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

//Check if username is unique
async function isUsernameUnique(username){
    console.log('Checking if username is unique..');

    const result = await dbIsUsernameUnique(username);

    if(result == '0'){
        console.log('Username is unique!');
        return 'success';
    }else{
        console.log('Username is not unique..');
        return 'failure';
    }
}

//Login method used to validate credentials of the user
async function login(userCredentials){
    console.log(userCredentials);
    const result = await dbFetchUser(userCredentials);
    console.log('Result: ' + result);
    
    if(result == undefined){
        return 'failure';
    }
    if(result.username === userCredentials.username){
        return result;
    }else {
        return 'failure';
    }
}

/**
 * Configuration methods
 * For users
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
 * Admin methods
 * 
 */

 async function fetchUser(userData){
     console.log('Fetching specific user..');

     let result = await dbFetchUser(userData);

     return result;
 }

 async function fetchAllUsers(){
    console.log('Fetching all users..');

    let result = await dbFetchAllUsers();

    return result;
 }

 async function deleteUser(userId){
    console.log('Attempting to delete user..', userId);

    //Check if user has workouts
    let result = await dbUserHasWorkouts(userId);
    console.log('User has workout results');
    console.log(result);

    if(result != '0'){
        console.log('User has workouts.. deleting them..');
        //First delete the workouts belonging to the user.
        await dbDeleteWorkout(userId);
    }

    console.log('Eventual workouts deleted, deleting user..');
    result = await dbDeleteUser(userId);

    console.log('Deleted user results');
    console.log(result);

    if(result != '0'){
        console.log('User deleted..');
        return 'success';
    }else{
        return 'failure';
    }

 }

 async function adminChangePassword(userId, newPassword){
    console.log('Admin changing user ', userId, ' password to: ', newPassword);

    let result = await dbAdminChangePassword(newPassword, userId);

    if(result != '0'){
        console.log('Password changed..');
        return 'success';
    }else{
        console.log('Password not changed..');
        return 'failure';
    }
 }

 async function adminChangeEmail(userId, newEmail){
    console.log('Admin changing user ', userId, ' email to: ', newEmail);

    let result = await dbAdminChangeEmail(newEmail, userId);

    if(result != '0'){
        console.log('Email changed..');
        return 'success';
    }else{
        console.log('Email not changed..');
        return 'failure';
    }
 }

 async function adminChangePrivilege(userId, newPrivilege){
    console.log('Admin changing user ', userId, ' privilege to: ', newPrivilege);

    let result = await dbAdminChangePrivilege(newPrivilege, userId);

    if(result != '0'){
        console.log('Privilege changed..');
        return 'success';
    }else{
        console.log('Privilege not changed..');
        return 'failure';
    }
 }

 async function isAdmin(userData){
    console.log('Checking if user is admin..');

    let result = await dbIsAdmin(userData);
    console.log(result);

    if(result.privilege === 1){
        console.log('User is admin..');
        return 'success';
    }else{
        console.log('User is not admin..');
        return 'failure';
    }
 }

/**
 * Workout methods
 * 
 */

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

function dbFetchAllUsers(){
    return new Promise(function(resolve, reject) {
        const sql = 'SELECT * FROM users';

        getDbPool().query(sql, (err, results) => {
            resolve(results);
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

function dbUserHasWorkouts(userId){
    return new Promise(function(resolve, reject) {
        const sql = 'SELECT COUNT(workoutId) AS workoutCount FROM workouts WHERE userId = ?';
        getDbPool().query(sql, userId, (err, results) => {
            resolve(results[0].workoutCount);
        })
    })
}

function dbDeleteWorkout(userId){
    return new Promise(function(resolve, reject){
        const sql = 'DELETE FROM workouts WHERE userId = ?';
        getDbPool().query(sql, userId, (err, results) => {
            resolve(results.affectedRows);
        })
    })
}

function dbDeleteUser(userId){
    return new Promise(function(resolve, reject){
        const sql = 'DELETE FROM users WHERE userId = ?';
        getDbPool().query(sql, userId, (err, results) => {
            resolve(results.affectedRows);
        })
    })
}

function dbIsUsernameUnique(username){
    return new Promise(function(resolve, reject) {
        const sql = "SELECT COUNT(*) AS userCount FROM users WHERE username = ?";
        getDbPool().query(sql, username, (err, results) => {
            resolve(results[0].userCount);
        })
    })
}

function dbIsAdmin(userData){
    return new Promise(function(resolve, reject){
        const sql = "SELECT privilege FROM users WHERE username = ? AND password = ?";
        getDbPool().query(sql, [userData.username, userData.password], (err, results) => {
            resolve(results[0]);
        })
    });
}

function dbAdminChangePassword(newPassword, userId){
    return new Promise(function(resolve, reject) {
        const sql = "UPDATE users SET password = ? WHERE userId = ?";
        getDbPool().query(sql, [newPassword, userId], (err, results) => {
            resolve(results.affectedRows);
        })
    });
}

function dbAdminChangeEmail(newEmail, userId){
    return new Promise(function(resolve, reject) {
        const sql = "UPDATE users SET email = ? WHERE userId = ?";
        getDbPool().query(sql, [newEmail, userId], (err, results) => {
            resolve(results.affectedRows);
        })
    });
}

function dbAdminChangePrivilege(newPrivilege, userId){
    return new Promise(function(resolve, reject) {
        const sql = "UPDATE users SET privilege = ? WHERE userId = ?";
        getDbPool().query(sql, [newPrivilege, userId], (err, results) => {
            resolve(results.affectedRows);
        })
    });
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
    adminChangeEmail: adminChangeEmail,
    adminChangePassword: adminChangePassword,
    adminChangePrivilege: adminChangePrivilege,
    registerUser: registerUser,
    login: login,
    isAdmin: isAdmin,
    isUsernameUnique: isUsernameUnique,
    deleteUser: deleteUser,
    changePassword: changePassword,
    changeEmail: changeEmail,
    fetchUser: fetchUser,
    fetchAllUsers: fetchAllUsers,
    saveNewWorkout: saveNewWorkout,
    fetchOneWorkout: fetchOneWorkout,
    fetchAllWorkouts: fetchAllWorkouts
};