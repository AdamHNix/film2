require("dotenv").config();

const imdb = require('imdb-api');
const server = require("express")();
const session = require("express-session");
const bodyParser = require('body-parser');
const MessagingResponse = require("twilio").twiml.MessagingResponse;

const port = process.env.EXPRESS_PORT || 3001;

server.listen(port, ()=>
    {
        console.log("listening...");
});

server.use(bodyParser.urlencoded({extended: true}));
server.use(session(
    {
        secret: process.env.SESSION_SECRET,
        resave: true,
        saveUninitialized: true
    }));

server.get('/test', (request, response) => {
    response.send("Hello!!!!");
})

server.post('/get-sms', (request, response) =>{
    const body = request.body;
    console.log("body" + body);
    const state = request.session.step;
    movieRequest = function findMovie (mov) {
        (imdb.search({
        name: mov
      }, {
        apiKey: '9ed698aa'
      }).then(console.log).catch(console.log))
    };
    movieText = movieRequest(body);
    console.log("movie text:" + movieText);
    parsedMovieText = JSON.parse(movieText);

    console.log("parsed movie text: " + parsedMovieText);

    console.log("body: " + body);
    console.log("State: " + state);

    if(!state){
        //request.session.step=1;
        message = ("This is your first message. You want to learn more about one of these:" + JSON.parse(movieRequest));
    }else{
        //request.session.test = 2;
        message = "This is your second message";    
    }
    const twiml = new MessagingResponse();
    twiml.message(message);
    console.log("response: " + twiml.toString());
    response.set("Content-Type", 'text/xml');
    response.send(twiml.toString());
})


const from = process.env.PHONE_NUMBER;

const to = process.env.MY_NUMBER;

const twilio = require("twilio")(
    process.env.TOKEN_SID,
    process.env.TOKEN_SECRET,
    {
        accountSid: process.env.ACCOUNT_SID,
    }
);



// no longer in use, keep for reference
function sendSms(){
    twilio.messages.create({
        from,
        to,
        body: "Hello from Adam's Twilio"
    })
    .then((message) => console.log("MESSAGE SENT"))
        .catch((error) => console.error(error));
}