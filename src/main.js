require("dotenv").config();

const imdb = require('imdb-api');//imdb lookup API
const server = require("express")();//server for twilio messages
const session = require("express-session");//server for twilio messages
const bodyParser = require('body-parser');
const MessagingResponse = require("twilio").twiml.MessagingResponse;//include twiml
const from = process.env.PHONE_NUMBER;//twilio phone number
const msSID =process.env.MESSAGE_SERVICE_SID;//messaging services SID
const movapi = process.env.MOVIE_KEY;//omdb API key
const port = process.env.EXPRESS_PORT;
const twilio = require("twilio")(
  process.env.TOKEN_SID,
  process.env.TOKEN_SECRET,
  {
    accountSid: process.env.ACCOUNT_SID,
  }
);

var savedBody = []; //used to save movie responses between texts
var overflowMessage;

server.use(bodyParser.urlencoded({ extended: false }));
server.use(session(
  {
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true
  }));

server.listen(port, () => {
  console.log("listening...");
});

//function takes inputed movie and returns object with imdb information in an array
async function findMovie(mov, object) {
  return imdb.get(
    { name: mov },
    { apiKey: movapi, timeout: 30000 })
    .then((stats) => {
      return stats;
    })
    .catch("error!!!")
    .then((things) => {
      
      if (things.type == "movie") {
        object[0] = (things.title);
        object[1] = (things.awards);
        object[2] = (things.year);
        object[3] = (things.rating);
        object[4] = things.type;
        object[5] = things.rated;
        object[6] = things.runtime;
        object[7] = things.genres;
        object[8] = things.director;
        object[9] = things.writer;
        object[10] = things.actors;
        object[11] = things.plot;
        object[12] = things.imdburl;
      }
      else if (things.type == "series") {
        object[0] = (things.title);
        object[1] = (things.awards);
        object[2] = (things.start_year);
        object[3] = (things.rating);
        object[4] = things.type;
        object[5] = things.plot;
        object[6] = things.actors;
        object[7] = things.imdburl;
        object[8] = things.totalseasons;
        object[9] = things.endyear
        object[10] = things.genres;
        object[11] = things.director;
        object[12] = things.imdburl;
        object[13] = things.writers;
      }
      return object;
    }
    )
    .catch(console.log("catch error"))};
//create server for posting  responses from OMDB API
server.post('/get-sms', (request, response) => {
  //response.clearCookie('headers');
  const body = request.body.Body; //create variable for text from user
  console.log("body: ", body);
  const state = request.session.step; //track response
  var movarr = []; //used to move array from promise
  //this if statement is needed when someone asks for multiple movies in one session. savedBody var will keep the old movie as well, so shifting the first item on the array off the savedBody will ensure only one item is in the array. Probably don't even need an array for this var, but don't want to deal with changing it.
  //START IF FOR Y
  console.log("REQUEST", request);
  console.log("RESPONSE", response);
  console.log("COOKIE REQUEST: ", request.session.cookie);
  savedBody = request.session.movie || body;
  console.log("Saved body here!", savedBody);
  console.log("Saved State here!", state);
  if (state == 1 && savedBody !== body){ 
    //if (savedBody.length != 1){
     // savedBody.shift();
    //}
    console.log("In Y if, cookie", savedBody);
    console.log("In Y if, cookie", savedBody);
    (findMovie(savedBody, movarr)).catch(console.log("catch error"))
    .then(res =>{
        request.session.step = 2; //notify that they have already gotten two responses
        if(res[4] == "movie"){
                  message = ("Ok! \n\n" + res[0] + " is a " + res[7] + " movie with a runtime of " + res[6] + ".\n\nDirected by " + res[8] + " and written by " + res[9] + ".\n\n Starring " + res[10] + ".\n\nplot: " + res[11]);
        }
        else if (res[4] == "series"){
          message = ("Ok! \n\n" + res[0] + " is a " + res[10] + " series that aired from " + res[2] + " to " + res[9] + ", with a total of " + res[8] + " seasons. It was written by " + res[13] + " and stars " + res[6] + ".\n\nplot: " + res[5]);
        }
        if (message.length > 1600){
        var overflowLength = message.length - 1600;
        overflowMessage = message.slice (1600-(overflowLength));
        message = message.slice (0, 1500-overflowLength);
        message = message + "... It looks like this message is too long." 
      }
      message = message + " See " + res[12] + " for more info.";
      //response.clearCookie('cachedResponse');
      //send to user via Twilio. Could probably turn this into function?
      const twiml = new MessagingResponse();
      twiml.message(message);
      console.log("response: ", twiml.toString());
      response.set("Content-Type", 'text/xml');
      response.send(twiml.toString());

      // if(overflowMessage.length > 0){
      //   console.log("made it to overflow if");
      //   const twiml = new MessagingResponse();
      //   twiml.message(overflowMessage);
      //   console.log("response: ", twiml.toString());
      //   response.set("Content-Type", 'text/xml');
      //   response.send(twiml.toString());        
      // }
      return res;
    })
  }
  //END IF FOR Y
  else
  {
    console.log("starting request");
    (findMovie(body, movarr))
    .catch(err => {
      const twiml = new MessagingResponse();
      twiml.message("Sorry, I couldn't find any movie or series with that name.. Please check for typos or be a little more specific.");
      console.log("response: ", twiml.toString());
      response.set("Content-Type", 'text/xml');
      response.send(twiml.toString())}
    )
    .then(res => {
      phoneNum = from;
      if (res[4] == "movie") {
        request.session.step = 1;
        //savedBody = [];
        console.log("cookie before change: " , request.session.cookie);
        request.session.movie = res[0];
        //console.log("REQUEST", request);
        console.log("cookie: ", request.session.movie);
        console.log("cookie after change: " , request.session.cookie);
        message = ('Looks like you want some info about the movie "' + res[0] + '." Here you go! \n\n'
          + res[0] + " released in " + res[2] + ".\n\nAwards: " + res[1] + "\n\nimdb currently scores it at " + res[3] + '/10.\n\nWant to learn more? Reply "Y"');
      } else if (res[4] == "series") {
        request.session.step = 1;
        savedBody = [];
        savedBody.push(res[0]);
        message = ('Looks like you want some info about the series "' + res[0] + '." Here you go!\n\n '
          + res[0] + " released in " + res[2] + ".\n\n Awards: " + res[1] + "\n\nimdb currently scores it at " + res[3] + '/10. Reply "Y" for more info.');
      }

      const twiml = new MessagingResponse();
      twiml.message(message);
      console.log("response: ", twiml.toString());
      response.set("Content-Type", 'text/xml');
      response.send(twiml.toString());

      return res;
    })}
  });