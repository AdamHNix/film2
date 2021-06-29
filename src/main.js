require("dotenv").config();

const imdb = require('imdb-api');
const server = require("express")();
const session = require("express-session");
const bodyParser = require('body-parser');
const MessagingResponse = require("twilio").twiml.MessagingResponse;

const port = process.env.EXPRESS_PORT || 3001;

server.use(bodyParser.urlencoded({extended: false}));
server.use(session(
    {
        secret: process.env.SESSION_SECRET,
        resave: true,
        saveUninitialized: true
    }));

server.listen(port, ()=>
    {
        console.log("listening...");
});

server.get('/test', (request, response) => {
    response.send("Hello!!!!");
})

async function findMovie (mov, object) {
      return imdb.get(
        {name: mov},    
         {apiKey: '9ed698aa', timeout: 30000})
         .then ((stats)=>{
             console.log ("Stats: " , stats);
                return stats;
         })
         .catch(console.log("catch stat error"))
         .then((things) =>{
             if(things.type == "movie"){
            object[0] = (things.title);
            object[1] = (things.awards);
            object[2] = (things.year);
            object[3] = (things.rating);
            object[4] = things.type;
             }
             else if (things.type == "series"){
                object[0] = (things.title);
                object[1] = (things.awards);
                object[2] = (things.start_year);
                object[3] = (things.rating);
                object[4] = things.type;
                object[5] = things.plot;
                object[6] = things.actors;
                object[7] = things.imdburl;
             }
             else{

                return object = [];
             }
            return object;
         }
         )
         .catch(console.log("catch error"))
        };

server.post('/get-sms', (request, response) =>{
    const body = request.body.Body;
    const savedBody = body;
    var movarr = [];
    const state = request.session.step;
    (findMovie(body, movarr))
    .then(res =>{
        console.log("res: ", res);
            request.session.step=1;
            if (res[4] == "movie"){
            message = ("Looks like you want some info about the movie " + res[0] + ". Here you go! \n\n"
            + res[0] + " released in " + res[2] + ".\n\nAwards: " + res[1] + "\n\nimdb currently scores it at " + res[3]+ "/10.");
            } else if (res[4] == "series"){
            message = ("Looks like you want some info about the series " + res[0] + ". Here you go!\n "
                + res[0] + " released in " + res[2] + ".\n\n Awards: " + res[1] + "\n\nimdb currently scores it at " + res[3]+ "/10.");
            }
            else if (res[4] != ("movie" || "series")){
                message = ("Looks like you want some info about " + res[0] + ". Here you go!\n\n "
                + res[0] + " released in " + res[2] + ". \n\nAwards: " + res[1] + " \n\nimdb currently scores it at " + res[3]+ "/10.");
            }
            else{
                message = "movie or series not found.. Please try again";
            }
        console.log("movarr", movarr);
        //var movieText = JSON.stringify(movieRequest(body));
        //console.log("movie text:" + movieText);
        //parsedMovieText = JSON.parse(movieText);
    
        //console.log("parsed movie text: " + parsedMovieText);
        const twiml = new MessagingResponse();
        twiml.message(message);
        console.log("response: " , twiml.toString());
        response.set("Content-Type", 'text/xml');
        response.send(twiml.toString());
        return res;
    });
});


const from = process.env.PHONE_NUMBER;

const to = process.env.MY_NUMBER;

const twilio = require("twilio")(
    process.env.TOKEN_SID,
    process.env.TOKEN_SECRET,
    {
        accountSid: process.env.ACCOUNT_SID,
    }
);