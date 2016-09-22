/*
Author: Allen Ho
Built off an Alexa skills template, mainly for learning

Example interactions:
User: Alexa, start math challenge
Skill: What type of problem would you like?...
User: Addition with two digits
Skill: Problem type is addition with two number of digits. What is the answer to [...]?
User: *answers*
Skill: Correct/incorrect. Would you like another problem?
User: Yes/no
*/

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = function (event, context) {
    try {
        console.log("event.session.application.applicationId=" + event.session.application.applicationId);

        //Application ID
        if (event.session.application.applicationId !== "amzn1.echo-sdk-ams.app.88ae8387-578c-491a-905b-50713d2271ff") {
             context.fail("Invalid Application ID");
        }
        
        if (event.session.new) {
            onSessionStarted({requestId: event.request.requestId}, event.session);
        }
        
        //Checks what type of intent it is and sends to appropriate code
        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
            });
        } else if (event.request.type === "IntentRequest") {
            onIntent(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            context.succeed();
        } 
    } catch (e) {
        context.fail("Exception: " + e);
    }
};

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId +
        ", sessionId=" + session.sessionId);
}

/**
 * Called when the user launches the skill without specifying what type of problem
 */
function onLaunch(launchRequest, session, callback) {
    console.log("onLaunch requestId=" + launchRequest.requestId +
        ", sessionId=" + session.sessionId);

    // Dispatch to your skill's launch.
    getWelcomeResponse(session, callback);
}

/**
 * Called when the user specifies what type of problem they want
 */
function onIntent(intentRequest, session, callback) {
    console.log("onIntent requestId=" + intentRequest.requestId +
        ", sessionId=" + session.sessionId);

    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;

    if ("GetProblem" === intentName) {                  //Gets and returns initial problem
        getProblem(intent, session, callback);
    } else if ("GetAnswer" === intentName) {            //Processes user's answer
        getAnswer(intent, session, callback);
    } else if ("AMAZON.HelpIntent" === intentName) {    //Required by Alexa to give help if needed
        handleGetHelpRequest(intent, session, callback);
    } else if ("AMAZON.StopIntent" === intentName) {    //Built in intent that stops function
        handleFinishSessionRequest(intent, session, callback);
    } else if ("AMAZON.CancelIntent" === intentName) {  //Built in intent to stop function
        handleFinishSessionRequest(intent, session, callback);
    } else if ("AMAZON.YesIntent" === intentName) {     //Starts a new problem after one ends
        getWelcomeResponse(session, callback);
    } else if ("AMAZON.NoIntent" === intentName) {      //Ends game if user is finished
        if (Object.keys(session.attributes).length > 0) {
            handleFinishSessionRequest(intent, session, callback);
        } else {
            throw "Invalid Intent";
        }
    } else {                                            //Error if user gives an irrelevant answer
        throw "Invalid intent";
    }
    
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId +
        ", sessionId=" + session.sessionId);
    // Add cleanup logic here
}

// --------------- Functions that control the skill's behavior -----------------------

// User gets to this call if they launch without a problem type 
// OR if they just completed a problem
function getWelcomeResponse(session, callback) {

    // If we wanted to initialize the session to have some attributes we could add those here.
    var sessionAttributes = {};
    var shouldEndSession = false;
    var cardTitle = "Welcome";
    var speechOutput = "Welcome to the Math Challenge Skill. " +
        "Pick an operator between addition, subtraction, multiplication, and division " +
        "and the number of digits. " +
        "To start, say the operator with the number of digits. " +
        "For example, say Addition with two digits.";
        
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    var repromptText = "Start by saying: Give me an operator problem with number digits. ";
    
    // Skip the explanation if user has already been through a problem
    if (Object.keys(session.attributes).length > 0) {
        speechOutput = "What type of problem would you like?"; 
    }

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}


// Required help function. Just gives more explanation on how to start
function handleGetHelpRequest(intent, session, callback) {
    // Provide a help prompt for the user, explaining how the game is played. Then, continue the game
    // if there is one in progress, or provide the option to start another one.

    var speechOutput = "To start this game, choose the type of math operator and the number of digits. "
        + "For example, if you want to add together two numbers of three digits, say "
        + "give me an addition problem with three digits. "
        + "What problem would you like to solve? ";
    var repromptText = "To start this game, say give me an operator problem with number digits. "
        + "For example, say give me a multiplication problem with two digits. ";
    var shouldEndSession = false;
    
    callback(session.attributes,
        buildSpeechletResponseWithoutCard(speechOutput, repromptText, shouldEndSession));
}

// Function that processes user request for problem and generates one

function getProblem(intent, session, callback) {
    var cardTitle = intent.name;                        //Name of card displayed in app
    var problemOperatorSlot = intent.slots.Operator;    //Grabs user input for type of problem
    var problemDigitsSlot = intent.slots.Digits;        //Grabs user input for number of digits
    var repromptText = "";
    var shouldEndSession = false;
    var speechOutput = "";
    var sessionAttributes = {};

    if (problemOperatorSlot) {
        var problemDigits = 0;
        var rngVolume = 1;
        var problemNumA = 0;
        var problemNumB = 0;
        var problemOperator = problemOperatorSlot.value;
        var answer = 0;
        
        //Getting the user input of digits; First checks for bad number and defaults to two
        if ((!problemDigitsSlot.value) || isNaN(problemDigitsSlot.value)) {
            problemDigits = 2;
            speechOutput += "Number of digits must be between 0 and 10. Setting to default of 2 digits. ";
        } else if ((problemDigitsSlot.value > 10) || (problemDigitsSlot.value < 0)) {
            problemDigits = 2;
            speechOutput += "Digits in the problem cannot be less than 0 or greater than 10. Setting to default of 2 digits. ";
        } else {
            problemDigits = problemDigitsSlot.value;
        }
        
        //Calculates what power of 10 based on number of digits
        for (var i = 0; i < problemDigits; i++) {
            rngVolume *= 10;
        }
        
        //Gets the two random numbers
        problemNumA = Math.floor((Math.random() * rngVolume));
        problemNumB = Math.floor((Math.random() * rngVolume));
        
        //Calculates speech output with regards to operator and digit number
        if (problemOperator === "addition") {
            answer = problemNumA + problemNumB;
            speechOutput += "Problem type is " + problemOperator + " with " + problemDigits + " number of digits. ";
            speechOutput += "What is the answer to " + problemNumA + " plus " + problemNumB + "?";
            repromptText = "What is the answer to " + problemNumA + " plus " + problemNumB + "?";
        } else if (problemOperator === "subtraction") {
            answer = problemNumA - problemNumB;
            speechOutput += "Problem type is " + problemOperator + " with " + problemDigits + " number of digits. ";
            speechOutput += "What is the answer to " + problemNumA + " minus " + problemNumB + "?";
            repromptText = "What is the answer to " + problemNumA + " minus " + problemNumB + "?";
        } else if (problemOperator === "multiplication") {
            answer = problemNumA * problemNumB;
            speechOutput += "Problem type is " + problemOperator + " with " + problemDigits + " number of digits. ";
            speechOutput += "What is the answer to " + problemNumA + " times " + problemNumB + "?";
            repromptText = "What is the answer to " + problemNumA + " times " + problemNumB + "?";
        } else if (problemOperator === "division") {
            answer = problemNumB;
            speechOutput += "Problem type is " + problemOperator + " with " + problemDigits + " number of digits. ";
            
            //accounting for division by zero
            if (problemNumA === 0) {
                if (problemDigits == 0) { //User wanted division problem with 0 number of digits
                    speechOutput += "What is the answer to " + (problemNumA*problemNumB) + " divided by " + problemNumA + "? ";
                    speechOutput += "Dividing by zero?! Nice try - we cannot destroy the universe!";
                    shouldEndSession = true;
                } else {
                    while (problemNumA === 0) {
                        problemNumA = Math.floor((Math.random() * rngVolume));
                        speechOutput += "What is the answer to " + (problemNumA*problemNumB) + " divided by " + problemNumA + "? ";
                    }
                }
            } else {
                speechOutput += "What is the answer to " + (problemNumA*problemNumB) + " divided by " + problemNumA + "? ";
            }
            repromptText = "What is the answer to " + (problemNumA*problemNumB) + " divided by " + problemNumA + "?";
        } else {
            answer = problemNumA + problemNumB;
            problemOperator = "addition";
            speechOutput += "Defaulting to addition operator. Problem type is " + problemOperator + " with " + problemDigits + " number of digits. ";
            speechOutput += "What is the answer to " + problemNumA + " plus " + problemNumB + "?";
            repromptText = "What is the answer to " + problemNumA + " plus " + problemNumB + "?";
        }   
        
        //Session attributes to be carried onto future problems
        sessionAttributes = {
            Operator: problemOperator,
            Digits: problemDigits,
            Answer: answer
        };
    }
    
    callback(sessionAttributes,
         buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

//Processes user's answer
function getAnswer(intent, session, callback) {
    var cardTitle = intent.name;
    var problemAnswerSlot = intent.slots.Answer;
    var repromptText = "";
    var shouldEndSession = false;
    var speechOutput = "";
    var sessionAttributes = {};
    var gameInProgress = session.attributes && (session.attributes.Answer !== null);
    
    if (!gameInProgress) {
        speechOutput = "There is no problem in progress. You must start a problem before answering. ";
        callback(sessionAttributes,
            buildSpeechletResponse(cardTitle, speechOutput, speechOutput, true));
    } else {
        sessionAttributes.endGame = true; //used to see if user wants to start a new game
        if (parseInt(problemAnswerSlot.value) === session.attributes.Answer) {
            speechOutput = "Correct! ";
            shouldEndSession = false;
        } else {
            speechOutput = "Incorrect! Your answer of " + problemAnswerSlot.value + " is incorrect. "
            + " The answer is " + session.attributes.Answer + ". ";
            shouldEndSession = false;
        }
        speechOutput += "Would you like to start another problem? ";
        callback(sessionAttributes,
             buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
    }
}

function handleFinishSessionRequest(intent, session, callback) {
    // End the session with a "Good bye!" if the user wants to quit the game
    callback(session.attributes,
        buildSpeechletResponseWithoutCard("Good bye!", "", true));
}

// --------------- Helpers that build all of the responses -----------------------

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Simple",
            content: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildSpeechletResponseWithoutCard(output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    };
}