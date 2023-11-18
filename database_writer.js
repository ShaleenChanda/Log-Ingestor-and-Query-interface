const amqp = require('amqplib');
const dotenv = require('dotenv');
const {MongoClient} = require('mongodb');

dotenv.config();

//configuring the url of rabbitmq
//I'll configuring the startup process such that it will use the localhost as
//default url if the url is not provided in .env file
const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost';
const logQueue = 'databaseEntries';
const mongoDBURI = process.env.MONGODB_URI;
const databaseName = process.env.DATABASE_NAME;
const collectionName = process.env.COLLECTION_NAME;

const startWritingToDatabase = async () => {
    try {
        //connecting to mongoDB
        const client = new MongoClient(mongoDBURI, { useNewUrlParser: true, useUnifiedTopology: true});
        await client.connect();
        const db = client.db(databaseName);

        //connecting to rabbitmq
        const connection = await amqp.connect(rabbitmqUrl);
        const channel = await connection.createChannel();

        //Ensuring that the queue exists
        //change the flag durable to true if you want to make the queue persistent
        //when the server restarts
        await channel.assertQueue(logQueue, { durable : false});
        
        //setting up a consumer that will continously consume the logs from the queue
        //and write them to the database
        channel.consume(logQueue, async(mes) => {
            if(mes !== null){
                const logEntry = JSON.parse(mes.content.toString());
                console.log("Log entry received:", mes.content.toString());

                //saving the logEntry to the database
                await db.collection(collectionName).insertOne(mes);

                channel.ack(mes);
            }
        });

        console.log("Database writer is up and running!");
        
    } catch(error){
        console.error("Error in database writer:", error);
    } 
}


startWritingToDatabase();