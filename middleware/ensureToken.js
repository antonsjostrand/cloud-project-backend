/*
* Ensure thats the requests contains a token.
*
* FORMAT OF TOKEN
* Authorization: Bearer <access_token>
* 
*/
function ensureToken(req, res, next){
    console.log("Verification of token!");

    //Get auth header value
    const bearerHeader = req.headers['authorization'];
    console.log(bearerHeader);

    //Check if bearer is undefined
    if(typeof bearerHeader !== 'undefined'){
        //Split the content
        const bearer = bearerHeader.split(' ');
        
        //Get token
        const bearerToken = bearer[1];
        console.log("Got token: " + bearerToken);

        //Set the token
        req.token = bearerToken;

        //Next
        next();

    }else{
        //Forbidden request!
        res.sendStatus(403);
    }
}

function test(variable){
    console.log("HALLOJ! " + variable);
}

module.exports = {
    ensureToken: ensureToken,
    test: test
};